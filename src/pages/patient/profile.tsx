import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { useAuth, useCurrentUser } from "@/lib/auth-context";
import { toUserMessage } from "@/lib/errors";
import { PHONE_PATTERN } from "@/lib/validation";
import { getProfile, updateProfile } from "@/services/profile";
import type { Profile } from "@/types/database";


const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().trim().refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number."),
  date_of_birth: z.string().refine((v) => v === "" || new Date(v) <= new Date(), "Date of birth can't be in the future."),
  gender: z.string(),
  address: z.string().trim().max(300),
  district: z.string().trim().max(80),
  state: z.string().trim().max(80),
  preferred_language: z.string().trim().max(40),
  emergency_contact_name: z.string().trim().max(120),
  emergency_contact_phone: z.string().trim().refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number."),
});

const empty = { full_name: "", phone: "", date_of_birth: "", gender: "", address: "", district: "", state: "", preferred_language: "", emergency_contact_name: "", emergency_contact_phone: "" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const form = useZodForm(schema, empty);

  useEffect(() => {
    form.reset({
      full_name: profile.full_name ?? "", phone: profile.phone ?? "", date_of_birth: profile.date_of_birth ?? "", gender: profile.gender ?? "",
      address: profile.address ?? "", district: profile.district ?? "", state: profile.state ?? "", preferred_language: profile.preferred_language ?? "",
      emergency_contact_name: profile.emergency_contact_name ?? "", emergency_contact_phone: profile.emergency_contact_phone ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.updated_at]);

  const save = useMutation({
    mutationFn: async () => {
      const v = form.validate();
      if (!v) throw new Error("validation");
      return updateProfile(profile.id, {
        full_name: v.full_name, phone: emptyToNull(v.phone), date_of_birth: emptyToNull(v.date_of_birth), gender: emptyToNull(v.gender),
        address: emptyToNull(v.address), district: emptyToNull(v.district), state: emptyToNull(v.state), preferred_language: emptyToNull(v.preferred_language),
        emergency_contact_name: emptyToNull(v.emergency_contact_name), emergency_contact_phone: emptyToNull(v.emergency_contact_phone),
      });
    },
    onSuccess: () => { toast.success("Profile saved."); void queryClient.invalidateQueries({ queryKey: ["profile"] }); void refresh(); },
    onError: (e) => { if ((e as Error).message !== "validation") toast.error(toUserMessage(e, "We couldn't save your profile.")); },
  });

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-6">
      <Panel title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" required autoComplete="name" {...form.bind("full_name")} />
          <TextField label="Email" value={profile.email ?? ""} onChange={() => undefined} disabled hint="Email is managed by your sign-in account." />
          <TextField label="Phone" type="tel" autoComplete="tel" inputMode="tel" {...form.bind("phone")} />
          <TextField label="Date of birth" type="date" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" {...form.bind("date_of_birth")} />
          <SelectField label="Gender" placeholder="Prefer not to say" options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]} {...form.bind("gender")} />
          <TextField label="Preferred language" {...form.bind("preferred_language")} />
        </div>
      </Panel>
      <Panel title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextAreaField className="sm:col-span-2" label="Address" rows={2} {...form.bind("address")} />
          <TextField label="District" {...form.bind("district")} />
          <TextField label="State" {...form.bind("state")} />
        </div>
      </Panel>
      <Panel title="Emergency contact" description="Optional. Shown only to you.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Contact name" {...form.bind("emergency_contact_name")} />
          <TextField label="Contact phone" type="tel" inputMode="tel" {...form.bind("emergency_contact_phone")} />
        </div>
      </Panel>
      <div><Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}

export default function PatientProfilePage() {
  const { userId } = useCurrentUser();
  const profile = useQuery({ queryKey: ["profile", userId], queryFn: () => getProfile(userId) });
  return (
    <>
      <PageHeader eyebrow="Profile" title="Your profile" description="Keep your details up to date so facilities can reach you. Only you and the facilities you interact with can see relevant details." />
      <QueryBoundary query={profile} emptyTitle="Profile not found.">{(p) => <ProfileForm profile={p} />}</QueryBoundary>
    </>
  );
}
