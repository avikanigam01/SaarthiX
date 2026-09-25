import { useCallback, useState } from "react";
import type { z } from "zod";

type Errors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Tiny form state helper: values are kept as strings (what inputs produce),
 * a zod schema validates them and produces the typed output the services expect.
 */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, initial: z.input<S>) {
  type In = z.input<S>;
  type Out = z.output<S>;
  const [values, setValues] = useState<In>(initial);
  const [errors, setErrors] = useState<Errors<In>>({});

  const set = useCallback(<K extends keyof In & string>(name: K, value: In[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validate = useCallback((): Out | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data as Out;
    }
    const next: Errors<In> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !(key in next)) (next as Record<string, string>)[key] = issue.message;
    }
    setErrors(next);
    return null;
  }, [schema, values]);

  const reset = useCallback((next?: In) => {
    setValues(next ?? initial);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bind = useCallback(
    <K extends keyof In & string>(name: K) => ({
      name,
      value: values[name] as string,
      onChange: (value: string) => set(name, value as In[K]),
      error: errors[name],
    }),
    [values, errors, set],
  );

  return { values, errors, set, validate, reset, bind, setValues };
}

/** Optional text -> trimmed string or null. */
export const emptyToNull = (value: string | undefined): string | null => {
  const t = (value ?? "").trim();
  return t === "" ? null : t;
};
