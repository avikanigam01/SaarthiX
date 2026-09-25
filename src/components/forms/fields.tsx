import { useId, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
};

export function FieldShell({ id, label, required, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}

type BaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  name?: string | undefined;
};

export function TextField({
  label, value, onChange, error, hint, required, disabled, className, name,
  type = "text", placeholder, autoComplete, inputMode, maxLength, min, max, step,
}: BaseProps & {
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "search";
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="h-11 text-base"
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label, value, onChange, error, hint, required, disabled, className, name, rows = 4, maxLength, placeholder,
}: BaseProps & { rows?: number; maxLength?: number; placeholder?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="text-base"
      />
    </FieldShell>
  );
}

export type Option = { value: string; label: string; disabled?: boolean };

/** Native <select>: best accessibility and touch behaviour on low-end phones. */
export function SelectField({
  label, value, onChange, options, error, hint, required, disabled, className, name, placeholder,
}: BaseProps & { options: Option[]; placeholder?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckField({
  label, checked, onChange, description, disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
      />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
