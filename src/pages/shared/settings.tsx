import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, InfoGrid } from "@/components/data/layout";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toUserMessage } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/roles";
import { changePassword } from "@/services/profile";

export function SettingsPage() {
  const { user, profile, roles, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setError(undefined);
    setBusy(true);
    try {
      await changePassword(password);
      toast.success("Password updated.");
      setPassword(""); setConfirm("");
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account & security" description="Manage how you sign in to SaarthiX." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <InfoGrid items={[
            { label: "Name", value: profile?.full_name ?? "—" },
            { label: "Email", value: user?.email ?? "—" },
            { label: "Roles", value: roles.length ? roles.map((r) => ROLE_LABELS[r]).join(", ") : "—" },
          ]} />
          <p className="mt-4 text-xs text-muted-foreground">Roles are assigned by administrators and cannot be changed here.</p>
        </Panel>

        <Panel title="Change password">
          <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-4">
            <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint="At least 8 characters." />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={error} />
            <div><Button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button></div>
          </form>
        </Panel>

        <Panel title="Sessions" className="lg:col-span-2">
          <p className="text-sm text-muted-foreground">Sign out of this device, or of every device where you're signed in.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void signOut("local")}><LogOut aria-hidden="true" /> Sign out</Button>
            <Button variant="outline" onClick={() => void signOut("global")}>Sign out everywhere</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
