// ── Allocation Rule Schema (contract between Code App and Copilot Studio agent) ──

export interface PackItem {
  itemId: string;
  itemName: string;
  sizeCategory: "S" | "M" | "L";
  quantity: number;
  unitCost: number;
}

export interface AllocationRuleSchema {
  tierName: string;
  eventType: "in-person" | "virtual";
  packItems: PackItem[];
  totalPackCost: number;
}

// ── Dataverse table types ──

export type SizeCategory = "S" | "M" | "L";

export interface SwagItem {
  id: string;
  name: string;
  sizeCategory: SizeCategory;
  unitCost: number;
  quantityTotal: number;
  quantityReserved: number;
  quantityAvailable: number; // calculated: total - reserved
  tierEligibility: string; // comma-separated tier names
}

export type EventStatus = "draft" | "confirmed" | "amended" | "ordered" | "cancelled";

export interface SwagEvent {
  id: string;
  eventDate: string;
  attendeeCount: number;
  execCount: number;
  champCount: number;
  tier3Count: number;
  tier4Count: number;
  inPerson: boolean;
  sellerName: string;
  sellerUserId: string;
  tpid: string;
  status: EventStatus;
  totalCost: number;
}

export type AllocationStatus = "proposed" | "confirmed" | "ordered" | "cancelled";

export interface Allocation {
  id: string;
  eventId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  status: AllocationStatus;
}

export interface AllocationRule {
  id: string;
  tierName: string;
  eventType: "in-person" | "virtual";
  rulesJSON: string; // JSON string of AllocationRuleSchema
}

export interface BudgetPeriod {
  id: string;
  programName: string;
  programTotal: number;
  totalSpent: number;
  totalReserved: number;
  remainingAvailable: number; // calculated: total - spent - reserved
  quarterStart: string;
  quarterEnd: string;
}

// ── Stock level helpers ──

export type StockLevel = "healthy" | "low" | "critical";

export function getStockLevel(item: SwagItem): StockLevel {
  if (item.quantityTotal === 0) return "critical";
  const pct = item.quantityAvailable / item.quantityTotal;
  if (pct < 0.1) return "critical";
  if (pct < 0.2) return "low";
  return "healthy";
}

export function getStockPct(item: SwagItem): number {
  if (item.quantityTotal === 0) return 0;
  return Math.round((item.quantityAvailable / item.quantityTotal) * 100);
}
