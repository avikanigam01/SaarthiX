import { Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/data/layout";

export function FormDialog({
  open, onOpenChange, title, description, children, onSubmit, submitLabel = "Save", pending, error, wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string | undefined;
  pending?: boolean | undefined;
  error?: string | null | undefined;
  wide?: boolean | undefined;
}) {
  const handle = (event: FormEvent) => {
    event.preventDefault();
    if (!pending) onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className={`max-h-[92vh] overflow-y-auto ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handle} className="space-y-4" noValidate>
          {children}
          {error ? <InlineError message={error} /> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** §38 — every sensitive administrative action requires an explicit confirmation. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm, pending, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string | undefined;
  destructive?: boolean | undefined;
  onConfirm: () => void;
  pending?: boolean | undefined;
  children?: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => { event.preventDefault(); onConfirm(); }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
