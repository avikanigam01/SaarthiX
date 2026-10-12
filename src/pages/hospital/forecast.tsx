import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { Button } from "@/components/ui/button";
import { useFacility } from "@/lib/facility-context";
import { toUserMessage } from "@/lib/errors";
import { generateMedicineForecast, listMedicineForecasts } from "@/services/medicine-forecast";

export default function MedicineForecastPage() {
  const facility = useFacility();
  const qc = useQueryClient();
  const [horizon, setHorizon] = useState("7");
  const query = useQuery({ queryKey: ["medicine-forecast", facility.id], queryFn: () => listMedicineForecasts(facility.id) });
  const generate = useMutation({
    mutationFn: () => generateMedicineForecast(facility.id, Number(horizon)),
    onSuccess: async (count) => { toast.success(`Forecast generated. ${count} new forecast rows saved.`); await qc.invalidateQueries({ queryKey: ["medicine-forecast", facility.id] }); },
    onError: (e) => toast.error(toUserMessage(e, "Unable to generate forecast. Check inventory transaction history.")),
  });
  return <div className="space-y-6">
    <PageHeader title="Medicine demand forecast" description="A planning estimate from this facility's recorded stock-out transactions. It does not place orders or change inventory." />
    <Panel title="Generate forecast" description="Forecast quality depends on accurate inventory transaction records. Missing history can produce a zero estimate.">
      <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Forecast horizon
        <select className="h-10 rounded-md border bg-background px-3" value={horizon} onChange={(e) => setHorizon(e.target.value)}><option value="7">Next 7 days</option><option value="14">Next 14 days</option><option value="30">Next 30 days</option></select>
      </label><Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? "Calculating…" : "Generate from real inventory history"}</Button></div>
    </Panel>
    <QueryBoundary query={query} emptyTitle="No forecast available yet" emptyDescription="Generate a forecast after this facility has inventory transaction history.">
      {(rows) => <Panel title="Saved forecasts"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Medicine</th><th className="p-2">Forecast date</th><th className="p-2">Estimated demand</th><th className="p-2">Method</th><th className="p-2">Generated</th></tr></thead><tbody>{rows.map((r) => <tr className="border-b" key={r.id}><td className="p-2">{r.medicine?.name ?? "Medicine record unavailable"}{r.medicine?.strength ? ` (${r.medicine.strength})` : ""}</td><td className="p-2">{r.forecast_date}</td><td className="p-2">{r.predicted_demand == null ? "Not enough data" : Number(r.predicted_demand).toFixed(2)}</td><td className="p-2">{r.model_version ?? "Unspecified"}</td><td className="p-2">{r.generated_at ? new Date(r.generated_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted-foreground">This is a rolling-30-day baseline, not a validated clinical or statistical prediction model. Procurement decisions remain with staff.</p></Panel>}
    </QueryBoundary>
  </div>;
}
