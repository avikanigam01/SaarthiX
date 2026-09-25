import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, History, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { FilterSelect, SearchBox, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { FormDialog } from "@/components/data/dialogs";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { useFacility } from "@/lib/facility-context";
import { formatDateTime, labelize } from "@/lib/format";
import { adjustStock, createInventoryLine, listInventory, listTransactions, updateInventoryLine } from "@/services/inventory";
import { createMedicine, listMedicines } from "@/services/medicines";
import type { InventoryLine, InventoryTransactionType } from "@/types/database";

const TYPES: Array<{ value: InventoryTransactionType | "adjust_up" | "adjust_down"; label: string }> = [
  { value: "stock_in", label: "Stock in (received)" },
  { value: "stock_out", label: "Stock out (dispensed)" },
  { value: "return", label: "Return to stock" },
  { value: "expiry", label: "Expired / discarded" },
  { value: "adjust_up", label: "Correction: increase" },
  { value: "adjust_down", label: "Correction: decrease" },
];

const num = (label: string) => z.string().trim().min(1, `Enter ${label}.`).refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, `${label} must be a number, 0 or more.`);

const adjustSchema = z.object({
  type: z.string().min(1),
  quantity: z.string().trim().refine((v) => Number(v) > 0, "Enter a quantity greater than zero."),
  reason: z.string().trim().max(300),
}).refine((v) => !(v.type.startsWith("adjust") && v.reason === ""), { path: ["reason"], message: "A reason is required for corrections." });

const lineSchema = z.object({
  mode: z.enum(["existing", "new"]),
  medicineId: z.string(),
  name: z.string().trim().max(120), generic: z.string().trim().max(120), strength: z.string().trim().max(60), form: z.string().trim().max(60),
  unit: z.string().trim().max(30),
  minimum: num("a minimum level"),
  maximum: z.string().trim().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Maximum must be a number, 0 or more."),
}).superRefine((v, ctx) => {
  if (v.mode === "existing" && !v.medicineId) ctx.addIssue({ code: "custom", path: ["medicineId"], message: "Choose a medicine." });
  if (v.mode === "new" && v.name.length < 2) ctx.addIssue({ code: "custom", path: ["name"], message: "Enter the medicine name." });
  if (v.maximum !== "" && Number(v.maximum) < Number(v.minimum)) ctx.addIssue({ code: "custom", path: ["maximum"], message: "Maximum can't be lower than the minimum." });
});

export default function HospitalMedicinesPage() {
  const facility = useFacility();
  const key = ["hospital", facility.id, "inventory"];
  const inventory = useQuery({ queryKey: key, queryFn: () => listInventory(facility.id) });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjusting, setAdjusting] = useState<InventoryLine | null>(null);
  const [history, setHistory] = useState<InventoryLine | null>(null);
  const [adding, setAdding] = useState(false);

  const rows = (inventory.data ?? []).filter((l) => {
    const term = search.trim().toLowerCase();
    const matches = !term || (l.medicine?.name ?? "").toLowerCase().includes(term) || (l.medicine?.generic_name ?? "").toLowerCase().includes(term);
    return matches && (statusFilter === "all" || l.stock_status === statusFilter) && l.is_active;
  });
  const atRisk = (inventory.data ?? []).filter((l) => l.is_active && l.stock_status !== "in_stock").length;

  const columns: Column<InventoryLine>[] = [
    { key: "name", header: "Medicine", primary: true, cell: (l) => <div><span className="font-medium">{l.medicine?.name ?? "Medicine"}</span><span className="block text-xs text-muted-foreground">{[l.medicine?.strength, l.medicine?.dosage_form].filter(Boolean).join(" · ")}</span></div> },
    { key: "stock", header: "In stock", cell: (l) => `${Number(l.current_stock)}${l.unit ? ` ${l.unit}` : ""}` },
    { key: "min", header: "Minimum", cell: (l) => Number(l.minimum_stock) },
    { key: "status", header: "Status", cell: (l) => <StatusPill status={l.stock_status} /> },
    { key: "updated", header: "Last updated", cell: (l) => formatDateTime(l.updated_at) },
    { key: "actions", header: "Actions", cell: (l) => (
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={() => setAdjusting(l)}>Update stock</Button>
        <Button size="sm" variant="ghost" onClick={() => setHistory(l)} aria-label={`Stock history for ${l.medicine?.name ?? "medicine"}`}><History aria-hidden="true" /></Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader eyebrow={facility.name} title="Medicines & stock" description="Every stock change is recorded with who made it and why." actions={<Button onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Add medicine</Button>} />
      {atRisk > 0 ? <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground"><AlertTriangle className="size-4" aria-hidden="true" />{atRisk} medicine{atRisk === 1 ? " is" : "s are"} low or out of stock.</div> : null}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search medicines" label="Search medicines" />
        <FilterSelect label="Stock status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All stock levels" }, { value: "in_stock", label: "In stock" }, { value: "low_stock", label: "Low stock" }, { value: "out_of_stock", label: "Out of stock" }]} />
      </Toolbar>
      <QueryBoundary query={{ ...inventory, data: inventory.data ? rows : inventory.data }} emptyTitle={search || statusFilter !== "all" ? "No medicines match." : "No medicines in your inventory yet."} emptyDescription="Add the medicines your facility stocks, then record stock as it arrives." emptyAction={<Button onClick={() => setAdding(true)}>Add medicine</Button>}>
        {(data) => <DataTable columns={columns} rows={data} rowKey={(l) => l.id} caption="Medicine inventory" />}
      </QueryBoundary>
      <AdjustDialog line={adjusting} onClose={() => setAdjusting(null)} invalidateKey={key} />
      <HistoryDialog line={history} onClose={() => setHistory(null)} />
      <AddLineDialog open={adding} onOpenChange={setAdding} facilityId={facility.id} invalidateKey={key} existingIds={(inventory.data ?? []).map((l) => l.medicine_id)} />
    </>
  );
}

function AdjustDialog({ line, onClose, invalidateKey }: { line: InventoryLine | null; onClose: () => void; invalidateKey: string[] }) {
  const form = useZodForm(adjustSchema, { type: "stock_in", quantity: "", reason: "" });
  const adjust = useAction(adjustStock, { success: "Stock updated.", invalidate: [invalidateKey], onSuccess: () => { onClose(); form.reset(); } });
  const low = useAction(({ id, minimum }: { id: string; minimum: number }) => updateInventoryLine(id, { minimum_stock: minimum }), { success: "Minimum level updated.", invalidate: [invalidateKey] });
  const [minimum, setMinimum] = useState("");

  const submit = () => {
    const v = form.validate();
    if (!v || !line) return;
    const isAdjust = v.type.startsWith("adjust");
    adjust.mutate({ inventoryId: line.id, type: isAdjust ? "adjustment" : (v.type as InventoryTransactionType), quantity: Number(v.quantity), reason: v.reason || null, increase: v.type !== "adjust_down" });
  };
  return (
    <FormDialog open={line !== null} onOpenChange={(o) => { if (!o) onClose(); }} title={`Update stock — ${line?.medicine?.name ?? ""}`} description={line ? `Currently ${Number(line.current_stock)}${line.unit ? ` ${line.unit}` : ""} in stock.` : undefined} onSubmit={submit} submitLabel="Record change" pending={adjust.isPending}>
      <SelectField label="What happened?" options={TYPES} {...form.bind("type")} />
      <TextField label="Quantity" type="number" inputMode="decimal" min={0} step="any" required {...form.bind("quantity")} />
      <TextAreaField label={form.values.type.startsWith("adjust") ? "Reason (required)" : "Note (optional)"} rows={2} maxLength={300} {...form.bind("reason")} />
      <div className="flex items-end gap-2 border-t border-border pt-4">
        <TextField className="flex-1" label="Minimum level (alert threshold)" type="number" min={0} value={minimum} onChange={setMinimum} placeholder={String(Number(line?.minimum_stock ?? 0))} />
        <Button type="button" variant="outline" disabled={low.isPending || minimum === "" || Number(minimum) < 0} onClick={() => line && low.mutate({ id: line.id, minimum: Number(minimum) })}>Set</Button>
      </div>
    </FormDialog>
  );
}

function HistoryDialog({ line, onClose }: { line: InventoryLine | null; onClose: () => void }) {
  const tx = useQuery({ queryKey: ["inventory-tx", line?.id], queryFn: () => listTransactions(line!.id), enabled: Boolean(line) });
  return (
    <Dialog open={line !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Stock history — {line?.medicine?.name}</DialogTitle><DialogDescription>The 50 most recent movements.</DialogDescription></DialogHeader>
        <QueryBoundary query={tx} emptyTitle="No stock movements recorded yet.">
          {(rows) => <ul className="divide-y divide-border">{rows.map((t) => (
            <li key={t.id} className="py-2.5 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{labelize(t.transaction_type)} · {Number(t.quantity)}</span><span className="text-muted-foreground">{Number(t.previous_stock)} → {Number(t.new_stock)}</span></div><p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}{t.reason ? ` · ${t.reason}` : ""}</p></li>
          ))}</ul>}
        </QueryBoundary>
      </DialogContent>
    </Dialog>
  );
}

function AddLineDialog({ open, onOpenChange, facilityId, invalidateKey, existingIds }: { open: boolean; onOpenChange: (o: boolean) => void; facilityId: string; invalidateKey: string[]; existingIds: string[] }) {
  const medicines = useQuery({ queryKey: ["medicines"], queryFn: listMedicines, enabled: open });
  const form = useZodForm(lineSchema, { mode: "existing" as "existing" | "new", medicineId: "", name: "", generic: "", strength: "", form: "", unit: "", minimum: "0", maximum: "" });
  const create = useAction(
    async (v: z.output<typeof lineSchema>) => {
      const medicineId = v.mode === "new" ? (await createMedicine({ name: v.name, generic_name: emptyToNull(v.generic), strength: emptyToNull(v.strength), dosage_form: emptyToNull(v.form), unit: emptyToNull(v.unit) })).id : v.medicineId;
      return createInventoryLine({ facilityId, medicineId, minimumStock: Number(v.minimum), maximumStock: v.maximum === "" ? null : Number(v.maximum), unit: emptyToNull(v.unit) });
    },
    { success: "Medicine added. Record its opening stock next.", invalidate: [invalidateKey, ["medicines"]], onSuccess: () => { onOpenChange(false); form.reset(); } },
  );
  const submit = () => { const v = form.validate(); if (v) create.mutate(v); };
  const available = (medicines.data ?? []).filter((m) => !existingIds.includes(m.id));

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add a medicine" description="New medicines start at zero stock — record what you have using “Update stock”." onSubmit={submit} submitLabel="Add medicine" pending={create.isPending} wide>
      <SelectField label="Medicine source" options={[{ value: "existing", label: "Choose from the shared medicine list" }, { value: "new", label: "Add a new medicine to the list" }]} {...form.bind("mode")} />
      {form.values.mode === "existing" ? (
        <SelectField label="Medicine" required placeholder={medicines.isLoading ? "Loading…" : "Select a medicine"} options={available.map((m) => ({ value: m.id, label: `${m.name}${m.strength ? ` ${m.strength}` : ""}${m.dosage_form ? ` (${m.dosage_form})` : ""}` }))} {...form.bind("medicineId")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" required {...form.bind("name")} />
          <TextField label="Generic name" {...form.bind("generic")} />
          <TextField label="Strength" placeholder="e.g. 500 mg" {...form.bind("strength")} />
          <TextField label="Form" placeholder="e.g. Tablet" {...form.bind("form")} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Unit" placeholder="e.g. strips" {...form.bind("unit")} />
        <TextField label="Minimum level" type="number" min={0} required hint="Alert when at or below." {...form.bind("minimum")} />
        <TextField label="Maximum level" type="number" min={0} {...form.bind("maximum")} />
      </div>
    </FormDialog>
  );
}
