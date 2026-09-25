import { Mail } from "lucide-react";
import { useState } from "react";

import { TextAreaField, TextField } from "@/components/forms/fields";
import { EmptyState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { DocPage } from "./doc";

const CONTACT_EMAIL = (import.meta.env["VITE_CONTACT_EMAIL"] as string | undefined)?.trim();

export default function ContactPage() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  const href = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(topic || "SaarthiX enquiry")}&body=${encodeURIComponent(`${message}\n\n${name}`)}`
    : "";

  return (
    <DocPage
      eyebrow="Contact"
      title="Talk to the SaarthiX team"
      intro="Reach out about patient support, facility onboarding, partnerships, or general questions about the platform."
      sections={[]}
    >
      {CONTACT_EMAIL ? (
        <section className="rounded-2xl border border-border/70 bg-card/70 p-6">
          <h2 className="font-display text-xl font-semibold">Send us a message</h2>
          <p className="mt-2 text-sm text-muted-foreground">This opens your email app with the message ready to send. Please do not include medical details in email.</p>
          <div className="mt-5 grid gap-4">
            <TextField label="Your name" value={name} onChange={setName} autoComplete="name" />
            <TextField label="Subject" value={topic} onChange={setTopic} placeholder="e.g. Facility onboarding" />
            <TextAreaField label="Message" value={message} onChange={setMessage} rows={5} />
            <Button asChild className="w-full sm:w-auto"><a href={href}><Mail aria-hidden="true" /> Open email</a></Button>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={Mail}
          title="Contact details will be published soon."
          description="The team operating this deployment has not published a contact address yet. Facility administrators can reach their platform administrator directly."
        />
      )}
      <section className="rounded-2xl border border-danger/25 bg-danger-soft p-5 text-sm text-danger">
        Contact forms are not monitored for emergencies. If you need urgent medical help, contact local emergency services immediately.
      </section>
    </DocPage>
  );
}
