import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Eye, EyeOff, FileText, HeartPulse, Hospital, Loader2, Lock, Mail, ShieldAlert, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Backdrop, NeonTile, type Tone } from "@/components/landing/neon-ui";
import { EcgLine } from "@/components/motion/ecg";
import { Reveal } from "@/components/motion/primitives";
import { SaarthiLogo } from "@/components/saarthi-ui";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { canAccessPortal, homePathForRoles, safeRedirectPath, type PortalKind } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { getCurrentUserRoles, registerPatient, sendPasswordResetEmail, signIn, updatePassword } from "@/services/auth";
import type { UserRole } from "@/types/database";

type AuthMode = "login" | "register" | "forgot" | "reset";

const authCopy: Record<AuthMode, readonly [string, string]> = {
  login: ["Welcome back", "Sign in to continue your healthcare journey."],
  register: ["Create your SaarthiX account", "Start a secure, patient-first care coordination journey."],
  forgot: ["Reset your password", "Enter your account email and we'll help you regain access."],
  reset: ["Choose a new password", "Set a new password for your SaarthiX account."],
};

const sideCopy: Record<AuthMode, readonly [string, string]> = {
  login: ["Pick up your care journey where you left it.", "Your visits, referrals and follow-ups stay connected to one account."],
  register: ["Start one connected care journey.", "Find the right care, check availability before you travel, and keep every next step in one place."],
  forgot: ["Get back in safely.", "We send a reset link to the email on your account. Nothing changes until you choose a new password."],
  reset: ["Choose a strong new password.", "Use at least 8 characters. Mix letters, numbers and symbols for a stronger one."],
};

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

/** 0 to 4, based only on what the person has typed. Display only; validation rules are unchanged. */
function passwordStrength(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.max(score, 1);
}

const strengthMeta = [
  ["", "nl-t-rose"], ["Weak", "nl-t-rose"], ["Fair", "nl-t-gold"], ["Good", "nl-t-cyan"], ["Strong", "nl-t-mint"],
] as const;

/* ------------------------------------------------------------------ pieces */

function OrbitNode({ icon, tone, position, counter }: { icon: typeof Hospital; tone: Tone; position: string; counter: string }) {
  return (
    <span className={cn("absolute", position)}>
      <span className={cn("block", counter)}><NeonTile icon={icon} tone={tone} size="md" /></span>
    </span>
  );
}

/** Rotating rings of care services around a pulsing shield. Purely decorative. */
function AuthScene() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[19rem]" aria-hidden="true">
      <div className="nl-orbit absolute inset-0 rounded-full border border-dashed border-[color-mix(in_oklab,var(--nl-cyan)_40%,transparent)]">
        <OrbitNode icon={Stethoscope} tone="cyan" counter="nl-counter" position="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
        <OrbitNode icon={Hospital} tone="mint" counter="nl-counter" position="right-0 top-1/2 -translate-y-1/2 translate-x-1/2" />
        <OrbitNode icon={FileText} tone="violet" counter="nl-counter" position="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
        <OrbitNode icon={CalendarDays} tone="gold" counter="nl-counter" position="left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="nl-orbit-rev absolute inset-[22%] rounded-full border border-[color-mix(in_oklab,var(--nl-violet)_40%,transparent)]">
        <OrbitNode icon={HeartPulse} tone="rose" counter="nl-counter-rev" position="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
        <OrbitNode icon={ShieldCheck} tone="cyan" counter="nl-counter-rev" position="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="nl-tile nl-pulse nl-t-cyan grid size-20 place-items-center rounded-full">
          <ShieldCheck className="size-9" />
        </span>
      </div>
    </div>
  );
}

function SidePanel({ mode }: { mode: AuthMode }) {
  const [title, text] = sideCopy[mode];
  return (
    <div className="nl-card nl-edge nl-t-cyan relative hidden overflow-hidden p-8 lg:flex lg:flex-col">
      <SaarthiLogo />
      <div className="my-8"><AuthScene /></div>
      <EcgLine className="h-10 w-full text-[var(--nl-mint)] drop-shadow-[0_0_6px_var(--nl-mint)]" />
      <h1 className="mt-6 max-w-sm font-display text-3xl font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="nl-t-gold mt-auto flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tone)_8%,transparent)] px-4 py-3 text-xs">
        <ShieldAlert className="nl-text-tone mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="leading-relaxed text-muted-foreground">SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional.</p>
      </div>
    </div>
  );
}

const inputClass = "h-12 rounded-xl border-white/15 bg-black/30 pl-11 text-base text-foreground placeholder:text-muted-foreground/70 transition-shadow focus-visible:border-[var(--nl-cyan)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--nl-cyan)_30%,transparent)] md:text-sm";

function Field({
  id, label, placeholder, type = "text", value, onChange, error, autoComplete, icon: Icon, children,
}: { id: string; label: string; placeholder: string; type?: string; value: string; onChange: (value: string) => void; error?: string | undefined; autoComplete?: string | undefined; icon: typeof Mail; children?: ReactNode }) {
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-foreground" htmlFor={id}>{label}</label>
      <div className="group relative mt-2">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-[var(--nl-cyan)]" aria-hidden="true" />
        <Input
          id={id}
          className={cn(inputClass, isPassword && "pr-12", error && "border-destructive")}
          type={isPassword && shown ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {isPassword ? (
          <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-[var(--nl-cyan)]">
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
      {error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{error}</span> : null}
      {children}
    </div>
  );
}

function StrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const score = passwordStrength(value);
  const [label, tone] = strengthMeta[score] ?? strengthMeta[1];
  return (
    <div className={cn("mt-2.5", tone)} role="status" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <span key={n} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", n <= score ? "nl-bg-tone" : "bg-white/10")} />)}
      </div>
      <p className="nl-text-tone mt-1.5 text-xs font-semibold">Password strength: {label}</p>
    </div>
  );
}

function SuccessBurst({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="status" className="nl-t-mint mt-8 flex flex-col items-center text-center">
      <span className="nl-tile nl-pulse grid size-20 place-items-center rounded-full">
        <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="nl-draw" d="M5 12.5 10 17.5 19 7" /></svg>
      </span>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground sm:text-base">{message}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

const linkClass = "font-medium text-[var(--nl-cyan)] hover:underline";

/* -------------------------------------------------------------------- page */

export function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = authCopy[mode];
  const navigate = useNavigate();
  const [form, setForm] = useState<AuthFormState>({ firstName: "", lastName: "", email: "", password: "", agreed: false });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

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

  // Brief shake of the card when a submit fails, so the error is noticed.
  useEffect(() => {
    if (!shake) return;
    const timer = window.setTimeout(() => setShake(false), 450);
    return () => window.clearTimeout(timer);
  }, [shake]);

  function failWith(message: string) {
    setServerError(message);
    setShake(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuthForm(mode, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setShake(true);
      return;
    }

    setServerError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        const result = await signIn({ email: form.email, password: form.password });
        if (!result.ok) {
          failWith(result.message);
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
          failWith(result.message);
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
          failWith(result.message);
          return;
        }
        setSubmitted(true);
        setSuccessMessage("If an account exists for that email, a reset link has been sent.");
        return;
      }

      if (mode === "reset") {
        const result = await updatePassword(form.password);
        if (!result.ok) {
          failWith(result.message);
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
  const showStrength = mode === "register" || mode === "reset";
  const buttonLabel = mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password";

  return (
    <div className="dark nl-root flex min-h-screen flex-col text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="SaarthiX home" className="transition-transform hover:scale-[1.03] lg:invisible"><SaarthiLogo /></Link>
        <Link to="/" className="nl-btn-ghost inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"><ArrowLeft className="size-4" aria-hidden="true" />Back to home</Link>
      </header>

      <main id="main" className="relative flex flex-1 items-center overflow-hidden px-5 pb-12 pt-4 sm:px-8">
        <Backdrop />
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal on="mount" x={-20} y={0} className="h-full"><SidePanel mode={mode} /></Reveal>

          <Reveal on="mount" x={20} y={0} className="h-full">
            <div className="nl-card nl-edge nl-t-cyan h-full p-6 sm:p-9">
              <div className={cn("mx-auto max-w-md", shake && "nl-shake")}>
                <div className="flex items-center gap-3 lg:hidden"><SaarthiLogo /></div>
                <h2 className="mt-5 font-display text-3xl font-bold tracking-tight lg:mt-0 sm:text-4xl">{copy[0]}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy[1]}</p>

                {showSuccessOnly ? (
                  <SuccessBurst message={successMessage}>
                    <Link to="/login" className="nl-btn inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">Go to sign in <ArrowRight className="size-4" aria-hidden="true" /></Link>
                  </SuccessBurst>
                ) : (
                  <form noValidate onSubmit={handleSubmit} className="mt-7 space-y-4">
                    {serverError ? <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">{serverError}</div> : null}
                    {mode === "register" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="first-name" label="First name" placeholder="Enter your first name" icon={UserRound} value={form.firstName} onChange={(value) => updateField("firstName", value)} error={errors.firstName} autoComplete="given-name" />
                        <Field id="last-name" label="Last name" placeholder="Enter your last name" icon={UserRound} value={form.lastName} onChange={(value) => updateField("lastName", value)} error={errors.lastName} autoComplete="family-name" />
                      </div>
                    ) : null}
                    {mode !== "reset" ? <Field id="email" label="Email address" type="email" placeholder="you@example.com" icon={Mail} value={form.email} onChange={(value) => updateField("email", value)} error={errors.email} autoComplete="email" /> : null}
                    {mode === "register" || mode === "login" || mode === "reset" ? (
                      <Field id="password" label="Password" type="password" placeholder="Enter your password" icon={Lock} value={form.password} onChange={(value) => updateField("password", value)} error={errors.password} autoComplete={mode === "login" ? "current-password" : "new-password"}>
                        {showStrength ? <StrengthMeter value={form.password} /> : null}
                      </Field>
                    ) : null}
                    {mode === "login" ? <div className="-mt-1 text-right text-sm"><Link to="/forgot-password" className={linkClass}>Forgot password?</Link></div> : null}
                    {mode === "register" ? (
                      <div>
                        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <input type="checkbox" className="mt-1 size-4 accent-[var(--nl-cyan)]" checked={form.agreed} onChange={(event) => updateField("agreed", event.target.checked)} aria-invalid={errors.agreed ? true : undefined} aria-describedby={errors.agreed ? "agreed-error" : undefined} />
                          <span>I agree to the SaarthiX <Link to="/terms" className={linkClass}>terms</Link> and <Link to="/privacy" className={linkClass}>privacy notice</Link>.</span>
                        </label>
                        {errors.agreed ? <span id="agreed-error" role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{errors.agreed}</span> : null}
                      </div>
                    ) : null}
                    <button type="submit" disabled={submitting} className="nl-btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base disabled:pointer-events-none disabled:opacity-70">
                      {submitting ? <><Loader2 className="nl-spinner size-4" aria-hidden="true" />Please wait…</> : <>{buttonLabel}<ArrowRight className="size-4" aria-hidden="true" /></>}
                    </button>
                  </form>
                )}

                <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
                  {mode === "login" ? <span>New to SaarthiX? <Link to="/register" className={linkClass}>Create an account</Link></span> : null}
                  {mode === "register" ? <span>Already have an account? <Link to="/login" className={linkClass}>Sign in</Link></span> : null}
                  {mode === "forgot" ? <Link to="/login" className={linkClass}>Back to sign in</Link> : null}
                </div>
                {mode === "register" ? <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-muted-foreground">Access roles are assigned and verified by authorized administrators. You cannot register as an administrator from this form.</p> : null}
              </div>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
