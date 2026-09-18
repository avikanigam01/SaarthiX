import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Check, ChevronLeft, CircleHelp, FileText, Hospital, LockKeyhole, MapPin, Menu, Search, Stethoscope, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SafetyNotice, SaarthiLogo, SectionIntro, StatusBadge, TimelineStep } from "@/components/saarthi-ui";
import { PortalShell } from "@/components/portal-shell";
import { AssessmentResultPage, type AssessmentResult } from "@/pages/patient/assessment-result";

const steps = [
  ["01", "Tell us what you need", "Describe a symptom, test, medicine need, or follow-up in plain language."],
  ["02", "Understand urgency", "A structured assessment helps identify the next appropriate level of care."],
  ["03", "Find appropriate care", "Match to a department and facility using connected records."],
  ["04", "Confirm availability", "Check current service, doctor, and diagnostic availability before travelling."],
  ["05", "Receive care", "Record the visit and receive structured referral guidance when needed."],
  ["06", "Complete follow-up", "Stay connected with reminders until the journey is complete."],
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-prism-page text-foreground"><header className="sticky top-0 z-40 border-b border-border/70 bg-card/75 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><Link to="/" aria-label="SaarthiX home"><SaarthiLogo /></Link><nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"><Link to="/how-it-works" className="transition-colors hover:text-brand">How it works</Link><Link to="/about" className="transition-colors hover:text-brand">About</Link><Link to="/contact" className="transition-colors hover:text-brand">Contact</Link><Link to="/privacy" className="transition-colors hover:text-brand">Safety & privacy</Link></nav><div className="flex items-center gap-2.5"><Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button><Button asChild size="sm"><Link to="/register">Register</Link></Button></div></div><div className="h-px w-full bg-gradient-to-r from-transparent via-brand/60 to-transparent" /></header>{children}<footer className="border-t border-border/70 bg-card/60"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><SaarthiLogo compact /><span>Right Care. Right Place. Right Time.</span><span>Decision-support, not diagnosis.</span></div></footer></div>;
}

export function HomePage() {
  return <PublicShell><main><section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"><div><span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-card/70 px-3 py-1 text-xs font-semibold text-brand"><span className="size-1.5 rounded-full bg-brand" />Care coordination platform</span><h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Healthcare access should not require unnecessary journeys.</h1><p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">SaarthiX helps patients identify appropriate care, verify real service availability, navigate referrals, and stay connected after their healthcare visit.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Button asChild size="lg" className="rounded-full shadow-brand"><Link to="/patient/assessment">Find Care <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="rounded-full"><Link to="/contact">For Healthcare Institutions</Link></Button></div><div className="mt-9 max-w-xl"><SafetyNotice emergency /></div></div><JourneyPreview /></div></section><div className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-brand/40 to-transparent px-5 sm:px-8" /><section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><SectionIntro title="How SaarthiX works" description="A guided path from a first question to a completed, tracked healthcare journey." /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{steps.map(([number, title, description]) => <div key={number} className="rounded-2xl border border-border/70 bg-card/65 p-5 shadow-card backdrop-blur-xl"><span className="font-display text-2xl font-bold text-brand/30">{number}</span><h2 className="mt-2 font-display text-base font-semibold">{title}</h2><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p></div>)}</div></section><section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16"><div className="rounded-3xl border border-border/70 bg-card/55 p-6 shadow-brand backdrop-blur-2xl sm:p-8"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><SectionIntro title="Core capabilities" description="Coordination tools built for patients and the institutions that serve them." /><div className="mt-6 rounded-2xl bg-brand-soft/70 p-4"><p className="text-sm font-medium text-foreground">“Right Care. Right Place. Right Time.”</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Capability icon={Stethoscope} title="AI-assisted need & urgency assessment" text="Guided, safe intake that never diagnoses." /><Capability icon={Hospital} title="Right facility & service check" text="Verified availability, not guesswork." /><Capability icon={FileText} title="Structured referral guidance" text="Clear next steps when care must continue elsewhere." /><Capability icon={CalendarDays} title="After-hospital follow-up" text="Reminders and continuity after the visit." /></div></div></div></section><section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8"><div className="flex flex-col items-start gap-4 rounded-3xl border border-brand/20 bg-brand-soft/45 p-8 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl font-bold tracking-tight">Safety first</h2><p className="mt-2 max-w-2xl text-muted-foreground">SaarthiX is a coordination and decision-support platform, not a diagnostic or autonomous treatment system.</p></div><Button asChild variant="outline" className="shrink-0 rounded-full"><Link to="/privacy">Read safety and privacy</Link></Button></div></section></main></PublicShell>;
}

function JourneyPreview() { return <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-brand backdrop-blur-2xl"><div className="flex items-center justify-between"><span className="font-display text-sm font-semibold">Your care journey</span><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">A clear next step</span></div><div className="mt-5 space-y-1.5"><JourneyRow number="1" title="Need submitted" state="complete" /><JourneyRow number="2" title="Assessment completed" state="complete" /><JourneyRow number="3" title="Facility identified" state="active" /><JourneyRow number="4" title="Availability confirmed" state="next" /></div><Button asChild className="mt-5 w-full rounded-xl"><Link to="/patient/assessment">Start care assessment <ArrowRight /></Link></Button></div>; }
function JourneyRow({ number, title, state }: { number: string; title: string; state: "complete" | "active" | "next" }) { return <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${state === "active" ? "bg-brand text-brand-foreground shadow-brand" : state === "complete" ? "bg-success-soft" : "border border-dashed border-border"}`}><span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${state === "active" ? "bg-card text-brand" : state === "complete" ? "bg-success text-success-foreground" : "border border-border text-muted-foreground"}`}>{state === "complete" ? <Check className="size-4" /> : number}</span><span className={`text-sm font-medium ${state === "next" ? "text-muted-foreground" : ""}`}>{title}</span><span className="ml-auto text-xs font-semibold">{state === "complete" ? "Done" : state === "active" ? "Next" : "Later"}</span></div>; }
function Capability({ icon: Icon, title, text }: { icon: typeof Stethoscope; title: string; text: string }) { return <div className="rounded-2xl border border-border/70 bg-card/75 p-5"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-4" /></span><h2 className="mt-4 font-display text-base font-semibold">{title}</h2><p className="mt-1.5 text-sm text-muted-foreground">{text}</p></div>; }

export function InfoPage({ title, description, eyebrow = "SaarthiX" }: { title: string; description: string; eyebrow?: string }) { return <PublicShell><main className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"><SectionIntro eyebrow={eyebrow} title={title} description={description} /><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-border/70 bg-card/65 p-6 shadow-card"><h2 className="font-display text-xl font-semibold">Built around the next safe action</h2><p className="mt-3 leading-relaxed text-muted-foreground">The platform is designed to connect patients, facilities, and care teams without inventing records or replacing professional judgement.</p></div><div className="rounded-2xl border border-border/70 bg-card/65 p-6 shadow-card"><h2 className="font-display text-xl font-semibold">Connected data, honest states</h2><p className="mt-3 leading-relaxed text-muted-foreground">When records are not available, SaarthiX shows a clear empty state instead of presenting unverified information.</p></div></div><div className="mt-8"><SafetyNotice emergency /></div></main></PublicShell>; }

type AuthMode = "login" | "register" | "forgot" | "reset";
const authCopy: Record<AuthMode, readonly [string, string]> = { login: ["Welcome back", "Sign in to continue your healthcare journey."], register: ["Create your SaarthiX account", "Start a secure, patient-first care coordination journey."], forgot: ["Reset your password", "Enter your account email and we’ll help you regain access."], reset: ["Choose a new password", "Set a new password for your SaarthiX account."] };

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
  const [form, setForm] = useState<AuthFormState>({ firstName: "", lastName: "", email: "", password: "", agreed: false });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof AuthFormState>(key: K, value: AuthFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuthForm(mode, form);
    setErrors(nextErrors);
    setSubmitted(Object.keys(nextErrors).length === 0);
  }

  return <PublicShell><main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center px-5 py-12 sm:px-8"><div className="grid w-full max-w-4xl gap-10 lg:grid-cols-[0.85fr_1.15fr]"><div className="hidden rounded-3xl border border-border/70 bg-brand-soft/45 p-8 lg:block"><SaarthiLogo /><h1 className="mt-16 max-w-sm font-display text-4xl font-bold tracking-tight">Right Care. Right Place. Right Time.</h1><p className="mt-5 text-muted-foreground">Your records and permissions stay connected to the right care journey.</p><div className="mt-10"><SafetyNotice /></div></div><div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-brand sm:p-8"><div className="mx-auto max-w-md"><SectionIntro title={copy[0]} description={copy[1]} />
    {submitted ? (
      <div role="status" className="mt-6 rounded-2xl bg-success-soft p-4 text-sm text-success-foreground">Your details look valid. Sign-in isn't connected to a backend yet — this will work once SaarthiX is connected to Supabase.</div>
    ) : (
      <form noValidate className="contents" onSubmit={handleSubmit}>
        {mode === "register" ? <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field id="first-name" label="First name" placeholder="Enter your first name" value={form.firstName} onChange={(value) => updateField("firstName", value)} error={errors.firstName} autoComplete="given-name" /><Field id="last-name" label="Last name" placeholder="Enter your last name" value={form.lastName} onChange={(value) => updateField("lastName", value)} error={errors.lastName} autoComplete="family-name" /></div> : null}
        {mode !== "reset" ? <div className="mt-6"><Field id="email" label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(value) => updateField("email", value)} error={errors.email} autoComplete="email" /></div> : null}
        {mode === "register" || mode === "login" || mode === "reset" ? <div className="mt-4"><Field id="password" label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={(value) => updateField("password", value)} error={errors.password} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div> : null}
        {mode === "register" ? <div className="mt-4"><label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" className="mt-1 accent-brand" checked={form.agreed} onChange={(event) => updateField("agreed", event.target.checked)} aria-invalid={errors.agreed ? true : undefined} aria-describedby={errors.agreed ? "agreed-error" : undefined} />I agree to the SaarthiX <Link to="/terms" className="text-brand hover:underline">terms</Link> and <Link to="/privacy" className="text-brand hover:underline">privacy notice</Link>.</label>{errors.agreed ? <span id="agreed-error" role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{errors.agreed}</span> : null}</div> : null}
        <Button type="submit" className="mt-6 w-full rounded-xl">{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
      </form>
    )}
    <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">{mode === "login" ? <><Link to="/forgot-password" className="text-brand hover:underline">Forgot password?</Link><Link to="/register" className="text-brand hover:underline">Create an account</Link></> : null}{mode === "register" ? <Link to="/login" className="text-brand hover:underline">Already have an account? Sign in</Link> : null}{mode === "forgot" ? <Link to="/login" className="text-brand hover:underline">Back to sign in</Link> : null}</div>
    {mode === "register" ? <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Access roles are assigned and verified by authorized administrators. You cannot register as an administrator from this form.</p> : null}
  </div></div></div></main></PublicShell>;
}

function Field({ id, label, placeholder, type = "text", value, onChange, error, autoComplete }: { id: string; label: string; placeholder: string; type?: string; value: string; onChange: (value: string) => void; error?: string | undefined; autoComplete?: string | undefined }) {
  const errorId = `${id}-error`;
  return <label className="block text-sm font-medium text-foreground" htmlFor={id}><span>{label}</span><Input id={id} className="mt-2 h-11" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} />{error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-destructive">{error}</span> : null}</label>;
}

export function AssessmentPage() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const totalSteps = 6;
  const options = ["Symptoms", "Specialist consultation", "Diagnostic test", "Medicine availability", "Existing treatment follow-up", "Other healthcare need"];
  const labels = ["What do you need help with?", "Tell us a little more", "How long has this been happening?", "How severe does it feel?", "Do you have any emergency warning signs?", "Where would you prefer to receive care?"];

  function handleStartOver() {
    setSubmitted(false);
    setStep(1);
    setSelected("");
  }

  // Phase 1 note: no backend exists yet, so a completed assessment has
  // no real urgency/care-level/department to show. Passing `null` keeps
  // the result page honest instead of inventing a fake outcome. Phase 2
  // replaces this with the actual AI Edge Function response.
  const result: AssessmentResult = null;

  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <SectionIntro eyebrow="Care assessment" title="A calm, guided beginning" description="Answer only what is needed to help coordinate your next step. You can stop at any time." />
            <div className="mt-8"><SafetyNotice emergency /></div>
          </div>
          {submitted ? (
            <AssessmentResultPage result={result} onStartOver={handleStartOver} />
          ) : (
            <div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-brand sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Step {step} of {totalSteps}</span>
                <span className="text-xs font-semibold text-brand">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} /></div>
              <h2 className="mt-7 font-display text-2xl font-bold tracking-tight">{labels[step - 1]}</h2>
              {step === 1 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {options.map((option) => (
                    <button type="button" key={option} onClick={() => setSelected(option)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors ${selected === option ? "border-brand bg-brand-soft text-brand" : "border-border bg-background hover:border-brand/40"}`}>
                      <span className={`grid size-4 place-items-center rounded-full border ${selected === option ? "border-brand bg-brand" : "border-muted-foreground/40"}`}>{selected === option ? <Check className="size-3 text-brand-foreground" /> : null}</span>
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <Textarea className="min-h-32" placeholder={step === 5 ? "Select yes or no, then describe anything important." : "Share only the information needed for care coordination."} />
                  <p className="text-xs text-muted-foreground">Please do not include information that is not needed for this assessment.</p>
                </div>
              )}
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}><ChevronLeft />Back</Button>
                {step < totalSteps ? (
                  <Button onClick={() => setStep((value) => Math.min(totalSteps, value + 1))} disabled={step === 1 && !selected}>Continue <ArrowRight /></Button>
                ) : (
                  <Button onClick={() => setSubmitted(true)}>Save assessment <ArrowRight /></Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </PublicShell>
  );
}

const pageCopy: Record<string, { title: string; description: string }> = { dashboard: { title: "Your healthcare journey", description: "See active care coordination records, referrals, visits, follow-ups, and notifications when connected." }, facilities: { title: "Find appropriate care", description: "Search connected facilities and verify current services before travelling." }, referrals: { title: "Your referrals", description: "Track referrals shared with facilities you are authorized to access." }, visits: { title: "Your visits", description: "Review visits associated with your authenticated patient account." }, followups: { title: "Your follow-ups", description: "Stay connected with scheduled care follow-ups and reminders." }, notifications: { title: "Notifications", description: "Important journey updates appear here when records are available." }, profile: { title: "Your profile", description: "View and update the personal information you are permitted to manage." }, settings: { title: "Account settings", description: "Manage your account preferences and security settings." }, departments: { title: "Departments", description: "Manage departments belonging to your authorized facility." }, services: { title: "Services", description: "Manage facility services and their current availability." }, doctors: { title: "Doctors", description: "Manage authorized doctor records and department assignments." }, diagnostics: { title: "Diagnostics", description: "Manage diagnostic services and last-updated availability." }, medicines: { title: "Medicine inventory", description: "Manage medicine stock, thresholds, and stock movements." }, patients: { title: "Patients", description: "View only patients and minimum necessary information you are authorized to access." }, inventory: { title: "Inventory", description: "Review inventory records available to your authorized administration workspace." }, analytics: { title: "Analytics", description: "Review metrics calculated from connected records only." }, "audit-logs": { title: "Audit logs", description: "Review authorized administrative activity without unnecessary sensitive information." }, users: { title: "User management", description: "Manage accounts, approved roles, facility association, and permissions when authorized." }, profileFacility: { title: "Facility profile", description: "View and manage permitted facility information and verification details." }, settingsFacility: { title: "Workspace settings", description: "Manage settings available to your authorized facility workspace." } };

export function PortalPage({ kind, page, detail }: { kind: "patient" | "hospital" | "coordinator" | "admin"; page: string; detail?: boolean }) { const copy = pageCopy[page] ?? pageCopy["dashboard"]; return <PortalShell kind={kind}><SectionIntro eyebrow={copy.title} title={detail ? `${copy.title} detail` : copy.title} description={copy.description} /><div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">{page === "dashboard" ? <DashboardContent kind={kind} /> : page === "facilities" ? <FacilitiesContent /> : <EmptyState title={emptyTitle(page)} description={emptyDescription(page)} action={kind === "patient" && page === "followups" ? undefined : <Button variant="outline">{actionLabel(page)}</Button>} />}</div></PortalShell>; }
function emptyTitle(page: string) { return ({ referrals: "No referrals found.", visits: "No visits recorded.", followups: "No follow-ups scheduled.", notifications: "No notifications yet.", departments: "No departments have been added.", services: "No services have been added.", doctors: "No doctors have been added.", diagnostics: "No diagnostic services have been added.", medicines: "No inventory records available.", patients: "No authorized patient records found.", inventory: "No inventory data available.", analytics: "Insufficient data for this metric.", "audit-logs": "No audit activity available.", users: "No users found.", profile: "No profile information available yet.", settings: "No additional settings available." } as Record<string, string>)[page] ?? "No data available yet."; }
function emptyDescription(page: string) { return page === "analytics" ? "Analytics will appear once enough connected records exist for a meaningful calculation." : "This area will show connected records when they are available and you are authorized to view them."; }
function actionLabel(page: string) { return ["departments", "services", "doctors", "diagnostics", "medicines"].includes(page) ? "Add a record" : "Refresh"; }
function DashboardContent({ kind }: { kind: "patient" | "hospital" | "coordinator" | "admin" }) { const patient = kind === "patient"; return <><div className="space-y-6"><div className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{patient ? "Active healthcare journey" : "Connected workspace"}</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{patient ? "No active healthcare journey." : "No connected records yet."}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{patient ? "Start with a short assessment to coordinate your next safe step." : "Live workspace numbers and records will appear once authorized data is connected."}</p></div><StatusBadge status="neutral" /></div>{patient ? <Button asChild className="mt-5 rounded-full"><Link to="/patient/assessment">Start Care Assessment <ArrowRight /></Link></Button> : null}</div><div className="grid gap-4 sm:grid-cols-2"><EmptyState title={patient ? "No active referral." : "No referrals found."} description="Real records will appear here when they are available." /><EmptyState title={patient ? "No follow-ups scheduled." : "No pending work."} description="This state stays empty until the connected system has records." /></div></div><div className="space-y-6"><div className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-card"><h2 className="font-display text-lg font-semibold">Journey timeline</h2><ol className="mt-6"><TimelineStep index={1} title="Need submitted" state="upcoming" /><TimelineStep index={2} title="Assessment completed" state="upcoming" /><TimelineStep index={3} title="Facility identified" state="upcoming" /><TimelineStep index={4} title="Availability confirmed" state="upcoming" /></ol></div><SafetyNotice /></div></>; }
function FacilitiesContent() { return <div className="xl:col-span-2"><div className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-card"><div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"><label className="sr-only" htmlFor="facility-search">Search facilities</label><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="facility-search" className="h-10 pl-9" placeholder="District or area" /></div><Input className="h-10" placeholder="Facility type" /><Input className="h-10" placeholder="Department or service" /><Button>Search</Button></div><div className="mt-6"><EmptyState title="No verified healthcare facilities are currently available for this area." description="Facility availability will appear here once verified records are connected. No facility has been invented or assumed." icon={MapPin} /></div></div></div>; }

export function DetailPage({ kind, section }: { kind: "patient" | "hospital" | "coordinator" | "admin"; section: string }) {
  // Every portal's list route lives at /{kind}/{section}, so the back
  // link for any detail page follows that same pattern. Previously this
  // only covered a few hardcoded combinations and silently sent every
  // other section (patient journey/referrals/followups, hospital
  // visits/followups, admin services/inventory/analytics/audit-logs,
  // coordinator notifications, etc.) back to "/admin/referrals".
  const backPath = `/${kind}/${section}`;
  return <PortalShell kind={kind}><Button asChild variant="ghost" className="mb-5 -ml-3"><Link to={backPath}><ChevronLeft />Back to {section}</Link></Button><SectionIntro eyebrow="Record detail" title="No record selected" description="A detail view will appear after a real, authorized record is selected." /><div className="mt-8"><EmptyState title="No record available yet." description="This detail page does not display placeholder healthcare information." /></div></PortalShell>;
}

export function FacilityDetailPage() { return <PortalShell kind="patient"><Button asChild variant="ghost" className="mb-5 -ml-3"><Link to="/patient/facilities"><ChevronLeft />Back to facilities</Link></Button><SectionIntro eyebrow="Facility details" title="No facility selected" description="Choose a connected facility from the search results to review its verified information." /><div className="mt-8"><EmptyState title="No facility details available yet." description="Facility name, services, departments, doctors, diagnostics, contact information, and last-updated availability will appear here from connected records." icon={Hospital} /></div></PortalShell>; }

export function AccessDeniedPage() { return <PublicShell><main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8"><span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><LockKeyhole className="size-6" /></span><h1 className="mt-6 font-display text-3xl font-bold tracking-tight">403 — Access denied</h1><p className="mt-3 max-w-md text-muted-foreground">Your account isn't authorized to view this page. If you believe this is a mistake, sign in with an authorized account or contact your administrator.</p><div className="mt-8 flex flex-wrap items-center justify-center gap-3"><Button asChild className="rounded-full"><Link to="/login">Sign in</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/">Go home</Link></Button></div></main></PublicShell>; }
