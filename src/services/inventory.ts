import { supabase } from "@/lib/supabase";
import { stockStatusOf } from "@/lib/format";
import type { InventoryLine, InventoryTransaction, InventoryTransactionType, MedicineInventory, StockStatus } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

type RawLine = MedicineInventory & {
  medicine: InventoryLine["medicine"];
  facility?: InventoryLine["facility"];
};

function withStatus(rows: RawLine[]): InventoryLine[] {
  return rows.map((r) => ({ ...r, stock_status: stockStatusOf(Number(r.current_stock), Number(r.minimum_stock)) }));
}

const SELECT = "*, medicine:medicines!medicine_id(id,name,generic_name,strength,dosage_form,unit)";

export async function listInventory(facilityId: string): Promise<InventoryLine[]> {
  const res = await supabase.from("medicine_inventory").select(SELECT).eq("facility_id", facilityId).order("created_at", { ascending: false });
  return withStatus(unwrapList<RawLine>(res, "Unable to load inventory."));
}

/** Cross-facility inventory risk view for administrators. */
export async function adminListInventory(status: "risk" | "all" | StockStatus, page = 0): Promise<{ rows: InventoryLine[]; hasMore: boolean }> {
  const size = 50;
  // Status is derived by the database view (public.medicine_inventory_with_status).
  let query = supabase
    .from("medicine_inventory_with_status")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .range(page * size, page * size + size);
  if (status === "risk") query = query.in("stock_status", ["low_stock", "out_of_stock"]);
  else if (status !== "all") query = query.eq("stock_status", status);
  const filtered = await query;
  const base = unwrapList<MedicineInventory & { stock_status: StockStatus }>(filtered, "Unable to load inventory.");
  const pageRows = base.slice(0, size);

  const medicineIds = [...new Set(pageRows.map((r) => r.medicine_id))];
  const facilityIds = [...new Set(pageRows.map((r) => r.facility_id))];
  const [medRes, facRes] = await Promise.all([
    medicineIds.length ? supabase.from("medicines").select("id,name,generic_name,strength,dosage_form,unit").in("id", medicineIds) : Promise.resolve({ data: [], error: null }),
    facilityIds.length ? supabase.from("facilities").select("id,name,district").in("id", facilityIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const meds = new Map(unwrapList<NonNullable<InventoryLine["medicine"]>>(medRes, "Unable to load inventory.").map((m) => [m.id, m]));
  const facs = new Map(unwrapList<NonNullable<InventoryLine["facility"]>>(facRes, "Unable to load inventory.").map((f) => [f.id, f]));

  return {
    rows: pageRows.map((r) => ({ ...r, medicine: meds.get(r.medicine_id) ?? null, facility: facs.get(r.facility_id) ?? null })),
    hasMore: base.length > size,
  };
}

export async function createInventoryLine(input: {
  facilityId: string;
  medicineId: string;
  minimumStock: number;
  maximumStock: number | null;
  unit: string | null;
}): Promise<MedicineInventory> {
  // New lines always start at zero stock; stock is added through adjustStock (audited).
  const res = await supabase
    .from("medicine_inventory")
    .insert({
      facility_id: input.facilityId,
      medicine_id: input.medicineId,
      current_stock: 0,
      minimum_stock: input.minimumStock,
      maximum_stock: input.maximumStock,
      unit: input.unit,
    })
    .select("*")
    .single();
  return unwrap<MedicineInventory>(res, "Unable to add this medicine to your inventory.");
}

export async function updateInventoryLine(
  id: string,
  input: { minimum_stock?: number; maximum_stock?: number | null; unit?: string | null; is_active?: boolean },
): Promise<MedicineInventory> {
  const res = await supabase.from("medicine_inventory").update(input).eq("id", id).select("*").single();
  return unwrap<MedicineInventory>(res, "Unable to update this inventory record.");
}

/** The only path that changes stock: locks the row, validates, writes the movement + audit atomically. */
export async function adjustStock(input: {
  inventoryId: string;
  type: InventoryTransactionType;
  quantity: number;
  reason: string | null;
  increase?: boolean;
}): Promise<InventoryTransaction> {
  const res = await supabase.rpc("adjust_inventory_stock", {
    _inventory_id: input.inventoryId,
    _transaction_type: input.type,
    _quantity: input.quantity,
    _reason: input.reason,
    _reference_id: null,
    _increase: input.increase ?? true,
  });
  return unwrap<InventoryTransaction>(res, "Unable to update stock. Please try again.");
}

export async function listTransactions(inventoryId: string): Promise<InventoryTransaction[]> {
  const res = await supabase.from("inventory_transactions").select("*").eq("inventory_id", inventoryId).order("created_at", { ascending: false }).limit(50);
  return unwrapList<InventoryTransaction>(res, "Unable to load stock movements.");
}
