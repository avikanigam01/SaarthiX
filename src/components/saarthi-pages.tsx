import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Check, FileText, Hospital, Menu, ShieldCheck, Stethoscope, UsersRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { HospitalScene } from "@/components/motion/hospital-scene";
import { CountUp, Reveal, Stagger, StaggerItem, Tilt } from "@/components/motion/primitives";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { SafetyNotice, SaarthiLogo, SectionIntro } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { canAccessPortal, homePathForRoles, safeRedirectPath, type PortalKind } from "@/lib/roles";
import { getCurrentUserRoles, registerPatient, sendPasswordResetEmail, signIn, updatePassword } from "@/services/auth";
import type { UserRole } from "@/types/database";

const steps = [
  ["01", "Tell us what you need", "Describe a symptom, test, medicine need, or follow-up in plain language."],
  ["02", "Understand urgency", "A structured assessment helps identify the next appropriate level of care."],
  ["03", "Find appropriate care", "Match to a department and facility using connected records."],
  ["04", "Confirm availability", "Check current service, doctor, and diagnostic availability before travelling."],
  ["05", "Receive care", "Record the visit and receive structured referral guidance when needed."],
  ["06", "Complete follow-up", "Stay connected with reminders until the journey is complete."],
] as const;

const problems = [
  ["Wasted travel", "Patients arrive to find a department, test or medicine is not currently available."],
  ["Unclear next step", "After a visit, people are unsure where to go, when, and why."],
  ["Lost referrals", "Referrals get stuck between facilities without anyone tracking them."],
  ["Missed follow-up", "Care is not completed because no one reminds or checks in."],
] as const;

const patientPoints = [
  "Describe what you need in plain language and understand how urgent it may be.",
  "See which nearby verified facilities report the service, doctor, test or medicine available — and when it was last updated.",
  "Follow one connected journey: visit, referral and follow-up in one place.",
  "Get reminders so care is completed, not forgotten.",
] as const;

const institutionPoints = [
  "Keep department, service, doctor, diagnostic and medicine availability current for the people who depend on it.",
  "Receive structured referrals with a clear status trail instead of phone calls and paper.",
  "Track patients, visits and follow-ups your facility is responsible for.",
  "Every change is attributed and audit-logged; access is limited by role and facility.",
] as const;

const stats = [
  { value: 6, suffix: "-step", label: "guided care journey" },
  { value: 100, suffix: "%", label: "real, verified availability" },
  { value: 24, suffix: "/7", label: "safety-first triage rule" },
] as const;

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

export function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 -top-24 -z-10 size-72 animate-blob rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-16 top-40 -z-10 size-80 animate-blob rounded-full bg-gold/20 blur-3xl" style={{ animationDelay: "-6s" }} aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <Reveal on="mount">
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-card/70 px-3 py-1 text-xs font-semibold text-brand">
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-brand" />Care coordination platform
                  </span>
                </Reveal>
                <Reveal on="mount" delay={0.08}>
                  <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                    Healthcare access should not require <span className="text-gradient-brand">unnecessary journeys.</span>
                  </h1>
                </Reveal>
                <Reveal on="mount" delay={0.16}>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">SaarthiX helps patients identify appropriate care, verify real service availability, navigate referrals, and stay connected after their healthcare visit.</p>
                </Reveal>
                <Reveal on="mount" delay={0.24}>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="rounded-full"><Link to="/patient/assessment">Find Care <ArrowRight /></Link></Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full"><a href="#institutions">For Healthcare Institutions</a></Button>
                  </div>
                </Reveal>
                <Reveal on="mount" delay={0.3} className="mt-9 max-w-xl"><SafetyNotice emergency /></Reveal>
                <Stagger on="mount" className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-border/60 pt-6">
                  {stats.map((s) => (
                    <StaggerItem key={s.label}>
                      <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"><CountUp value={s.value} eager />{s.suffix}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</p>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <Reveal on="mount" delay={0.15} x={20} y={0}><HospitalScene /></Reveal>
            </div>
          </div>
        </section>

        <div className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-brand/40 to-transparent px-5 sm:px-8" />

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal><SectionIntro eyebrow="The problem" title="Too many journeys end at the wrong door" description="People travel to a facility only to find the service, doctor, test or medicine they need is not available — then have to start again, with no one guiding the next step." /></Reveal>
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {problems.map(([title, text]) => (
                <StaggerItem key={title}>
                  <Tilt><div className="h-full rounded-2xl border border-border/70 bg-card/70 p-5 shadow-card transition-shadow hover:shadow-brand"><h2 className="font-display text-base font-semibold">{title}</h2><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p></div></Tilt>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <Reveal><SectionIntro title="How SaarthiX works" description="A guided path from a first question to a completed, tracked healthcare journey." /></Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <StaggerItem key={number}>
                <div className="group h-full rounded-2xl border border-border/70 bg-card/65 p-5 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/40">
                  <span className="font-display text-2xl font-bold text-brand/30 transition-colors group-hover:text-brand/60">{number}</span>
                  <h2 className="mt-2 font-display text-base font-semibold">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
          <Reveal>
            <div className="rounded-3xl border border-border/70 bg-card/55 p-6 shadow-brand backdrop-blur-2xl sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <SectionIntro title="Core capabilities" description="Coordination tools built for patients and the institutions that serve them." />
                  <div className="mt-6 rounded-2xl bg-brand-soft/70 p-4"><p className="text-sm font-medium text-foreground">"Right Care. Right Place. Right Time."</p></div>
                </div>
                <Stagger className="grid gap-4 sm:grid-cols-2">
                  <StaggerItem><Capability icon={Stethoscope} title="AI-assisted need & urgency assessment" text="Guided, safe intake that never diagnoses." /></StaggerItem>
                  <StaggerItem><Capability icon={Hospital} title="Right facility & service check" text="Verified availability, not guesswork." /></StaggerItem>
                  <StaggerItem><Capability icon={FileText} title="Structured referral guidance" text="Clear next steps when care must continue elsewhere." /></StaggerItem>
                  <StaggerItem><Capability icon={CalendarDays} title="After-hospital follow-up" text="Reminders and continuity after the visit." /></StaggerItem>
                </Stagger>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="institutions" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal x={-16} y={0}>
              <div className="h-full rounded-3xl border border-border/70 bg-card/70 p-7 shadow-card transition-shadow hover:shadow-brand">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><UsersRound className="size-5" /></span>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">For patients</h2>
                <Stagger as="ul" className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {patientPoints.map((point) => <StaggerItem as="li" key={point}><span className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-success" />{point}</span></StaggerItem>)}
                </Stagger>
                <Button asChild className="mt-6 rounded-full"><Link to="/register">Create a patient account</Link></Button>
              </div>
            </Reveal>
            <Reveal x={16} y={0}>
              <div className="h-full rounded-3xl border border-border/70 bg-card/70 p-7 shadow-card transition-shadow hover:shadow-brand">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Hospital className="size-5" /></span>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">For healthcare institutions</h2>
                <Stagger as="ul" className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {institutionPoints.map((point) => <StaggerItem as="li" key={point}><span className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-success" />{point}</span></StaggerItem>)}
                </Stagger>
                <Button asChild variant="outline" className="mt-6 rounded-full"><Link to="/contact">Talk to us about onboarding</Link></Button>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-brand/20 bg-gradient-prism p-8 text-primary-foreground shadow-brand">
              <div className="pointer-events-none absolute -right-10 -top-10 size-48 animate-float rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><ShieldCheck className="size-3.5" /> Safety first</span>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">Coordination you can trust</h2>
                  <p className="mt-2 max-w-2xl text-primary-foreground/85">SaarthiX is a coordination and decision-support platform, not a diagnostic or autonomous treatment system.</p>
                </div>
                <Button asChild variant="outline" className="shrink-0 rounded-full border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20"><Link to="/privacy">Read safety and privacy</Link></Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </PublicShell>
  );
}

function Capability({ icon: Icon, title, text }: { icon: typeof Stethoscope; title: string; text: string }) {
  return (
    <div className="group h-full rounded-2xl border border-border/70 bg-card/75 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-brand">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110"><Icon className="size-4" /></span>
      <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

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
