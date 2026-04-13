// Data layer abstraction wired to Dataverse via Power Apps SDK.
//
// Hooks return: { data, loading, error, refetch }
// Mutations return: { mutate, loading, error }
//
// Mappers convert between SDK model shapes (e.g. Swag_swagitemsBase, all string-typed,
// option set values as numeric keys) and our app's clean types (numeric, string union enums).

import { useState, useEffect, useCallback } from "react";
import {
  Swag_swagitemsService,
  Swag_eventsService,
  Swag_allocationsService,
  Swag_allocationrulesService,
  Swag_budgettrackersService,
} from "@/generated";
import type { Swag_swagitemsBase, Swag_swagitems } from "@/generated/models/Swag_swagitemsModel";
import type { Swag_eventsBase, Swag_events } from "@/generated/models/Swag_eventsModel";
import type { Swag_allocations } from "@/generated/models/Swag_allocationsModel";
import type { Swag_allocationrules } from "@/generated/models/Swag_allocationrulesModel";
import type { Swag_budgettrackers } from "@/generated/models/Swag_budgettrackersModel";
import type {
  SwagItem,
  SwagEvent,
  Allocation,
  AllocationRule,
  BudgetPeriod,
  AllocationRuleSchema,
  EventStatus,
  SizeCategory,
} from "@/types";
import { MOCK_WEEKLY_SPEND } from "@/utils/mockData";

// ── Option set value mappings (Dataverse numeric -> app string union) ──

const SIZE_VALUE_TO_LABEL: Record<number, SizeCategory> = {
  100000000: "S",
  100000001: "M",
  100000002: "L",
};
const SIZE_LABEL_TO_VALUE: Record<SizeCategory, number> = {
  S: 100000000,
  M: 100000001,
  L: 100000002,
};

const EVENT_STATUS_VALUE_TO_LABEL: Record<number, EventStatus> = {
  100000000: "draft",
  100000001: "confirmed",
  100000002: "amended",
  100000003: "ordered",
  100000004: "cancelled",
};
const EVENT_STATUS_LABEL_TO_VALUE: Record<EventStatus, number> = {
  draft: 100000000,
  confirmed: 100000001,
  amended: 100000002,
  ordered: 100000003,
  cancelled: 100000004,
};

const EVENT_TYPE_VALUE_TO_LABEL: Record<number, "in-person" | "virtual"> = {
  100000000: "in-person",
  100000001: "virtual",
};
const EVENT_TYPE_LABEL_TO_VALUE: Record<"in-person" | "virtual", number> = {
  "in-person": 100000000,
  virtual: 100000001,
};

// ── Helpers ──

function num(s: string | number | undefined | null): number {
  if (s === undefined || s === null || s === "") return 0;
  const n = typeof s === "number" ? s : parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function dateOnly(s: string | undefined | null): string {
  if (!s) return "";
  return s.slice(0, 10);
}

// ── Mappers (Dataverse SDK type -> app type) ──

function mapSwagItem(r: Swag_swagitems): SwagItem {
  const total = num(r.swag_quantitytotal);
  const reserved = num(r.swag_quantityreserved);
  return {
    id: r.swag_swagitemid,
    name: r.swag_name,
    sizeCategory: SIZE_VALUE_TO_LABEL[r.swag_sizecategory as unknown as number] ?? "M",
    unitCost: num(r.swag_unitcost),
    quantityTotal: total,
    quantityReserved: reserved,
    quantityAvailable: total - reserved, // computed client-side (no calculated column yet)
    tierEligibility: r.swag_tiereligibility ?? "",
  };
}

function mapEvent(r: Swag_events): SwagEvent {
  return {
    id: r.swag_eventid,
    eventDate: dateOnly(r.swag_eventdate),
    attendeeCount: num(r.swag_attendeecount),
    execCount: num(r.swag_execcount),
    champCount: num(r.swag_champcount),
    tier3Count: num(r.swag_tier3count),
    tier4Count: num(r.swag_tier4count),
    inPerson: (r.swag_inperson as unknown as number) === 1,
    sellerName: r.swag_sellername,
    sellerUserId: r.swag_selleruserid ?? "",
    tpid: r.swag_tpid ?? "",
    status: EVENT_STATUS_VALUE_TO_LABEL[r.swag_status as unknown as number] ?? "draft",
    totalCost: num(r.swag_totalcost),
  };
}

function mapAllocation(r: Swag_allocations): Allocation {
  return {
    id: (r as unknown as { swag_allocationid: string }).swag_allocationid,
    eventId: (r as unknown as { _swag_eventid_value?: string })._swag_eventid_value ?? "",
    itemId: (r as unknown as { _swag_itemid_value?: string })._swag_itemid_value ?? "",
    itemName: (r as unknown as { swag_itemname?: string }).swag_itemname ?? "",
    quantity: num((r as unknown as { swag_quantity: string }).swag_quantity),
    totalCost: num((r as unknown as { swag_totalcost?: string }).swag_totalcost),
    status: "confirmed", // status is option set; map similarly if needed
  };
}

function mapAllocationRule(r: Swag_allocationrules): AllocationRule {
  return {
    id: (r as unknown as { swag_allocationruleid: string }).swag_allocationruleid,
    tierName: (r as unknown as { swag_tiername: string }).swag_tiername,
    eventType: EVENT_TYPE_VALUE_TO_LABEL[(r as unknown as { swag_eventtype: number }).swag_eventtype] ?? "in-person",
    rulesJSON: (r as unknown as { swag_rulesjson?: string }).swag_rulesjson ?? "",
  };
}

function mapBudgetPeriod(r: Swag_budgettrackers): BudgetPeriod {
  const total = num((r as unknown as { swag_programtotal: string }).swag_programtotal);
  const spent = num((r as unknown as { swag_totalspent: string }).swag_totalspent);
  const reserved = num((r as unknown as { swag_totalreserved: string }).swag_totalreserved);
  return {
    id: (r as unknown as { swag_budgettrackerid: string }).swag_budgettrackerid,
    programName: (r as unknown as { swag_programname: string }).swag_programname,
    programTotal: total,
    totalSpent: spent,
    totalReserved: reserved,
    remainingAvailable: total - spent - reserved, // computed client-side
    quarterStart: dateOnly((r as unknown as { swag_quarterstart: string }).swag_quarterstart),
    quarterEnd: dateOnly((r as unknown as { swag_quarterend: string }).swag_quarterend),
  };
}

// ── Generic data hook with error handling ──

function useService<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      console.error("[useDataverse] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}

// ── SwagItems ──

export function useSwagItems() {
  const { data, ...rest } = useService(async () => {
    const result = await Swag_swagitemsService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load swag items");
    return (result.data ?? []).map(mapSwagItem);
  }, []);
  return { ...rest, data: data ?? [] };
}

export function useCreateSwagItem() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (input: Omit<SwagItem, "id" | "quantityAvailable" | "quantityReserved">) => {
    setLoading(true);
    try {
      const record: Omit<Swag_swagitemsBase, "swag_swagitemid"> = {
        statecode: 0,
        swag_name: input.name,
        swag_sizecategory: SIZE_LABEL_TO_VALUE[input.sizeCategory] as unknown as Swag_swagitemsBase["swag_sizecategory"],
        swag_unitcost: String(input.unitCost),
        swag_quantitytotal: String(input.quantityTotal),
        swag_quantityreserved: "0",
        swag_tiereligibility: input.tierEligibility,
      };
      const result = await Swag_swagitemsService.create(record);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Failed to create swag item");
      }
      return mapSwagItem(result.data);
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

export function useUpdateSwagItemQuantity() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (updates: { id: string; quantityTotal: number }[]) => {
    setLoading(true);
    try {
      // Sequential updates - Dataverse SDK doesn't expose batch from this client
      for (const u of updates) {
        const result = await Swag_swagitemsService.update(u.id, {
          swag_quantitytotal: String(u.quantityTotal),
        });
        if (!result.success) {
          throw new Error(result.error?.message ?? `Failed to update item ${u.id}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Events ──

export function useEvents(filter?: { status?: EventStatus; from?: string; to?: string }) {
  const filterStr = JSON.stringify(filter ?? {});
  const { data, ...rest } = useService(async () => {
    const result = await Swag_eventsService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load events");
    let events = (result.data ?? []).map(mapEvent);
    if (filter?.status) events = events.filter((e) => e.status === filter.status);
    if (filter?.from) events = events.filter((e) => e.eventDate >= filter.from!);
    if (filter?.to) events = events.filter((e) => e.eventDate <= filter.to!);
    return events;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStr]);
  return { ...rest, data: data ?? [] };
}

export function useUpdateEventStatus() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (eventIds: string[], newStatus: EventStatus) => {
    setLoading(true);
    try {
      const statusValue = EVENT_STATUS_LABEL_TO_VALUE[newStatus];
      for (const id of eventIds) {
        const result = await Swag_eventsService.update(id, {
          swag_status: statusValue as unknown as Swag_eventsBase["swag_status"],
        });
        if (!result.success) {
          throw new Error(result.error?.message ?? `Failed to update event ${id}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Allocations ──

export function useAllocations(eventId?: string) {
  const { data, ...rest } = useService(async () => {
    const result = await Swag_allocationsService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load allocations");
    let allocs = (result.data ?? []).map(mapAllocation);
    if (eventId) allocs = allocs.filter((a) => a.eventId === eventId);
    return allocs;
  }, [eventId]);
  return { ...rest, data: data ?? [] };
}

// ── Allocation Rules ──

export function useAllocationRules() {
  const { data, ...rest } = useService(async () => {
    const result = await Swag_allocationrulesService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load rules");
    return (result.data ?? []).map(mapAllocationRule);
  }, []);
  return { ...rest, data: data ?? [] };
}

export function useUpsertAllocationRule() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (rule: AllocationRuleSchema) => {
    setLoading(true);
    try {
      // Find existing rule for this tier + event type
      const existing = await Swag_allocationrulesService.getAll();
      if (!existing.success) throw new Error(existing.error?.message ?? "Failed to query rules");
      const eventTypeValue = EVENT_TYPE_LABEL_TO_VALUE[rule.eventType];
      const match = (existing.data ?? []).find((r) => {
        const t = (r as unknown as { swag_tiername: string }).swag_tiername;
        const et = (r as unknown as { swag_eventtype: number }).swag_eventtype;
        return t === rule.tierName && et === eventTypeValue;
      });
      const json = JSON.stringify(rule);
      if (match) {
        const id = (match as unknown as { swag_allocationruleid: string }).swag_allocationruleid;
        const result = await Swag_allocationrulesService.update(id, {
          swag_rulesjson: json,
        } as unknown as Parameters<typeof Swag_allocationrulesService.update>[1]);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to update rule");
      } else {
        const result = await Swag_allocationrulesService.create({
          statecode: 0,
          swag_tiername: rule.tierName,
          swag_eventtype: eventTypeValue,
          swag_rulesjson: json,
        } as unknown as Parameters<typeof Swag_allocationrulesService.create>[0]);
        if (!result.success) throw new Error(result.error?.message ?? "Failed to create rule");
      }
      return rule;
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Budget ──

export function useActiveBudget() {
  const { data, ...rest } = useService(async () => {
    const result = await Swag_budgettrackersService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load budgets");
    const periods = (result.data ?? []).map(mapBudgetPeriod);
    const now = new Date().toISOString().slice(0, 10);
    return periods.find((p) => p.quarterStart <= now && p.quarterEnd >= now) ?? null;
  }, []);
  return { ...rest, data };
}

export function useAllBudgets() {
  const { data, ...rest } = useService(async () => {
    const result = await Swag_budgettrackersService.getAll();
    if (!result.success) throw new Error(result.error?.message ?? "Failed to load budgets");
    return (result.data ?? []).map(mapBudgetPeriod);
  }, []);
  return { ...rest, data: data ?? [] };
}

export function useCreateBudgetPeriod() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (input: Omit<BudgetPeriod, "id" | "totalSpent" | "totalReserved" | "remainingAvailable">) => {
    setLoading(true);
    try {
      const result = await Swag_budgettrackersService.create({
        statecode: 0,
        swag_programname: input.programName,
        swag_programtotal: String(input.programTotal),
        swag_totalspent: "0",
        swag_totalreserved: "0",
        swag_quarterstart: input.quarterStart,
        swag_quarterend: input.quarterEnd,
      } as unknown as Parameters<typeof Swag_budgettrackersService.create>[0]);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Failed to create budget period");
      }
      return mapBudgetPeriod(result.data);
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Weekly Spend (still mock; real version aggregates from allocations) ──

export function useWeeklySpend() {
  return {
    data: MOCK_WEEKLY_SPEND,
    loading: false,
    error: null as Error | null,
    refetch: async () => {},
  };
}

// ── Setup status (cross-cutting) ──

export interface SetupStatus {
  hasBudgetPeriod: boolean;
  hasInventory: boolean;
  hasRules: boolean;
  itemCount: number;
  ruleCount: number;
  isComplete: boolean;
  loading: boolean;
}

export function useSetupStatus(): SetupStatus {
  const { data: budget, loading: l1 } = useActiveBudget();
  const { data: items, loading: l2 } = useSwagItems();
  const { data: rules, loading: l3 } = useAllocationRules();
  const loading = l1 || l2 || l3;
  const hasBudgetPeriod = budget !== null;
  const hasInventory = items.length > 0;
  const hasRules = rules.length > 0;
  return {
    hasBudgetPeriod,
    hasInventory,
    hasRules,
    itemCount: items.length,
    ruleCount: rules.length,
    isComplete: hasBudgetPeriod && hasInventory && hasRules,
    loading,
  };
}

// ── Re-export types for convenience ──
export type { SwagItem, SwagEvent, Allocation, AllocationRule, BudgetPeriod, AllocationRuleSchema };
