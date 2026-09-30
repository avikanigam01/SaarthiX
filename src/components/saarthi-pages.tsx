import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Reveal } from "@/components/motion/primitives";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { SafetyNotice, SaarthiLogo, SectionIntro } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { canAccessPortal, homePathForRoles, safeRedirectPath, type PortalKind } from "@/lib/roles";
import { getCurrentUserRoles, registerPatient, sendPasswordResetEmail, signIn, updatePassword } from "@/services/auth";
import type { UserRole } from "@/types/database";

const navLinks = [
  ["/how-it-works", "How it works"],
  ["/about", "About"],
  ["/contact", "Contact"],
  ["/privacy", "Safety & privacy"],
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { status, roles } = useAuth();
  const signedIn = status === "signed_in";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-prism-page text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="SaarthiX home" className="transition-transform hover:scale-[1.03]"><SaarthiLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map(([to, label]) => (
              <Link key={to} to={to} className="relative py-1 transition-colors hover:text-brand [&.active]:text-brand after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:scale-x-0 after:bg-gradient-prism after:transition-transform hover:after:scale-x-100">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 sm:flex">
              {signedIn ? (
                <Button asChild size="sm"><Link to={homePathForRoles(roles) as "/"}>My workspace</Link></Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
                  <Button asChild size="sm"><Link to="/register">Register</Link></Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
          </div>
        </div>
        <div className={`overflow-hidden border-t border-border/70 transition-[max-height] duration-300 ease-out md:hidden ${open ? "max-h-72" : "max-h-0 border-t-0"}`}>
          <nav className="flex flex-col gap-1 px-5 py-3 text-sm font-medium text-muted-foreground">
            {navLinks.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted hover:text-foreground">{label}</Link>)}
            <div className="mt-1 flex gap-2 px-2 pt-2 sm:hidden">
              {signedIn ? <Button asChild size="sm" className="flex-1"><Link to={homePathForRoles(roles) as "/"}>My workspace</Link></Button> : <><Button asChild variant="outline" size="sm" className="flex-1"><Link to="/login">Sign in</Link></Button><Button asChild size="sm" className="flex-1"><Link to="/register">Register</Link></Button></>}
            </div>
          </nav>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      </header>
      {children}
      <footer className="border-t border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <SaarthiLogo compact />
          <span>Right Care. Right Place. Right Time.</span>
          <span>Decision-support, not diagnosis.</span>
        </div>
      </footer>
    </div>
  );
}

export { HomePage } from "@/components/landing/landing-page";

type AuthMode = "login" | "register" | "forgot" | "reset";
const authCopy: Record<AuthMode, readonly [string, string]> = { login: ["Welcome back", "Sign in to continue your healthcare journey."], register: ["Create your SaarthiX account", "Start a secure, patient-first care coordination journey."], forgot: ["Reset your password", "Enter your account email and we'll help you regain access."], reset: ["Choose a new password", "Set a new password for your SaarthiX account."] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthFormState = { firstName: string; lastName: string; email: string; password: string; agreed: boolean };
type AuthFormErrors = Partial<Record<keyof AuthFormState, string>>;

function validateAuthForm(mode: AuthMode, form: AuthFormState): AuthFormErrors {
  const errors: AuthFormErrors = {};
  if (mode === "register") {
    if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
    if (!form.lastName.trim()) errors.lastName = "Enter your last name.";
  }
  if (mode !== "reset") {
    if (!form.email.trim()) errors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address.";
  }
  if (mode === "login" || mode === "register" || mode === "reset") {
    if (!form.password) errors.password = "Enter a password.";
    else if (mode !== "login" && form.password.length < 8) errors.password = "Use at least 8 characters.";
  }
  if (mode === "register" && !form.agreed) errors.agreed = "You must agree to the terms and privacy notice to continue.";
  return errors;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = authCopy[mode];
  const navigate = useNavigate();
  const [form, setForm] = useState<AuthFormState>({ firstName: "", lastName: "", email: "", password: "", agreed: false });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { status: authStatus, roles: currentRoles } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };

  async function goAfterAuth() {
    const roles = (await getCurrentUserRoles()) as UserRole[];
    const wanted = safeRedirectPath(search.redirect);
    const portal = wanted?.split("/")[1] as PortalKind | undefined;
    const allowed = wanted && portal && ["patient", "hospital", "coordinator", "admin"].includes(portal) && canAccessPortal(roles, portal);
    void navigate({ to: (allowed ? wanted : homePathForRoles(roles)) as "/" });
  }

  // Already signed in? Skip the sign-in / register screens.
  useEffect(() => {
    if ((mode === "login" || mode === "register") && authStatus === "signed_in" && !submitted) {
      void navigate({ to: homePathForRoles(currentRoles) as "/", replace: true });
    }
  }, [mode, authStatus, currentRoles, navigate, submitted]);

  function updateField<K extends keyof AuthFormState>(key: K, value: AuthFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuthForm(mode, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setServerError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        const result = await signIn({ email: form.email, password: form.password });
        if (!result.ok) {
          setServerError(result.message);
          return;
        }
        setSubmitted(true);
        await goAfterAuth();
        return;
      }

      if (mode === "register") {
        const result = await registerPatient({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        });
        if (!result.ok) {
          setServerError(result.message);
          return;
        }
        setSubmitted(true);
        setSuccessMessage(
          result.data.emailConfirmationRequired
            ? "Account created. Please check your email to verify your address before signing in."
            : "Account created. You're signed in."
        );
        if (!result.data.emailConfirmationRequired) {
          await goAfterAuth();
        }
        return;
      }

      if (mode === "forgot") {
        const result = await sendPasswordResetEmail(form.email);
        if (!result.ok) {
          setServerError(result.message);
          return;
        }
        setSubmitted(true);
        setSuccessMessage("If an account exists for that email, a reset link has been sent.");
        return;
      }

      if (mode === "reset") {
        const result = await updatePassword(form.password);
        if (!result.ok) {
          setServerError(result.message);
          return;
        }
        setSubmitted(true);
        setSuccessMessage("Your password has been updated. You can now sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showSuccessOnly = submitted && successMessage && (mode === "forgot" || mode === "reset" || mode === "register");

  return (
    <PublicShell>
      <main className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute -left-20 top-10 -z-10 size-72 animate-blob rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 bottom-0 -z-10 size-72 animate-blob rounded-full bg-gold/15 blur-3xl" style={{ animationDelay: "-9s" }} aria-hidden="true" />
        <div className="grid w-full max-w-4xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal on="mount" x={-16} y={0} className="hidden rounded-3xl border border-border/70 bg-brand-soft/45 p-8 lg:block">
            <SaarthiLogo />
            <h1 className="mt-16 max-w-sm font-display text-4xl font-bold tracking-tight">Right Care. Right Place. Right Time.</h1>
            <p className="mt-5 text-muted-foreground">Your records and permissions stay connected to the right care journey.</p>
            <div className="mt-10"><SafetyNotice /></div>
          </Reveal>
          <Reveal on="mount" x={16} y={0} className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-brand sm:p-8">
            <div className="mx-auto max-w-md">
              <SectionIntro title={copy[0]} description={copy[1]} />
              {showSuccessOnly ? (
                <div role="status" className="mt-6 rounded-2xl bg-success-soft p-4 text-sm text-success-foreground">{successMessage}</div>
              ) : (
                <form noValidate className="contents" onSubmit={handleSubmit}>
                  {serverError ? <div role="alert" className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive">{serverError}</div> : null}
                  {mode === "register" ? <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field id="first-name" label="First name" placeholder="Enter your first name" value={form.firstName} onChange={(value) => updateField("firstName", value)} error={errors.firstName} autoComplete="given-name" /><Field id="last-name" label="Last name" placeholder="Enter your last name" value={form.lastName} onChange={(value) => updateField("lastName", value)} error={errors.lastName} autoComplete="family-name" /></div> : null}
                  {mode !== "reset" ? <div className="mt-6"><Field id="email" label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(value) => updateField("email", value)} error={errors.email} autoComplete="email" /></div> : null}
                  {mode === "register" || mode === "login" || mode === "reset" ? <div className="mt-4"><Field id="password" label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={(value) => updateField("password", value)} error={errors.password} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div> : null}
                  {mode === "register" ? <div className="mt-4"><label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" className="mt-1 accent-brand" checked={form.agreed} onChange={(event) => updateField("agreed", event.target.checked)} aria-invalid={errors.agreed ? true : undefined} aria-describedby={errors.agreed ? "agreed-error" : undefined} />I agree to the SaarthiX <Link to="/terms" className="text-brand hover:underline">terms</Link> and <Link to="/privacy" className="text-brand hover:underline">privacy notice</Link>.</label>{errors.agreed ? <span id="agreed-error" role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{errors.agreed}</span> : null}</div> : null}
                  <Button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl">{submitting ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
                </form>
              )}
              <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">{mode === "login" ? <><Link to="/forgot-password" className="text-brand hover:underline">Forgot password?</Link><Link to="/register" className="text-brand hover:underline">Create an account</Link></> : null}{mode === "register" ? <Link to="/login" className="text-brand hover:underline">Already have an account? Sign in</Link> : null}{mode === "forgot" ? <Link to="/login" className="text-brand hover:underline">Back to sign in</Link> : null}</div>
              {mode === "register" ? <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Access roles are assigned and verified by authorized administrators. You cannot register as an administrator from this form.</p> : null}
            </div>
          </Reveal>
        </div>
      </main>
    </PublicShell>
  );
}

function Field({ id, label, placeholder, type = "text", value, onChange, error, autoComplete }: { id: string; label: string; placeholder: string; type?: string; value: string; onChange: (value: string) => void; error?: string | undefined; autoComplete?: string | undefined }) {
  const errorId = `${id}-error`;
  return <label className="block text-sm font-medium text-foreground" htmlFor={id}><span>{label}</span><Input id={id} className="mt-2 h-11 transition-shadow focus-visible:shadow-brand" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} />{error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{error}</span> : null}</label>;
}
