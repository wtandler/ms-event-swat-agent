// Data layer abstraction. Pages call these hooks; they never import mockData directly.
//
// Production swap: replace MOCK implementations below with calls to generated
// Power Apps SDK services (`pac code add-data-source -a dataverse -t <table>`).
// The hook signatures stay identical - only the body changes.
//
// Hooks return:
//   { data: T[] | T | null, loading: boolean, error: Error | null, refetch: () => Promise<void> }
//
// Mutations (create/update/delete) return { mutate: (...) => Promise<T>, loading, error }

import { useState, useEffect, useCallback } from "react";
import {
  MOCK_SWAG_ITEMS,
  MOCK_EVENTS,
  MOCK_ALLOCATIONS,
  MOCK_ALLOCATION_RULES,
  MOCK_BUDGET_PERIODS,
  MOCK_WEEKLY_SPEND,
} from "@/utils/mockData";
import type {
  SwagItem,
  SwagEvent,
  Allocation,
  AllocationRule,
  BudgetPeriod,
  AllocationRuleSchema,
  EventStatus,
} from "@/types";

// ── Module-level mutable copies so mutations persist across renders during dev ──
// In production, Dataverse is the source of truth; these vanish.
const _swagItems = [...MOCK_SWAG_ITEMS];
const _events = [...MOCK_EVENTS];
const _allocations = [...MOCK_ALLOCATIONS];
const _rules = [...MOCK_ALLOCATION_RULES];
const _budgets = [...MOCK_BUDGET_PERIODS];

// ── Subscribers for cross-hook reactivity ──
const subscribers = new Set<() => void>();
function notify() {
  subscribers.forEach((fn) => fn());
}
function useSubscription() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── SwagItems ──

export function useSwagItems() {
  useSubscription();
  return {
    data: _swagItems,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

export function useCreateSwagItem() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (input: Omit<SwagItem, "id" | "quantityAvailable" | "quantityReserved">) => {
    setLoading(true);
    try {
      const item: SwagItem = {
        ...input,
        id: genId("item"),
        quantityReserved: 0,
        quantityAvailable: input.quantityTotal,
      };
      _swagItems.push(item);
      notify();
      return item;
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
      for (const update of updates) {
        const idx = _swagItems.findIndex((i) => i.id === update.id);
        if (idx >= 0) {
          _swagItems[idx] = {
            ..._swagItems[idx],
            quantityTotal: update.quantityTotal,
            quantityAvailable: update.quantityTotal - _swagItems[idx].quantityReserved,
          };
        }
      }
      notify();
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Events ──

export function useEvents(filter?: { status?: EventStatus; from?: string; to?: string }) {
  useSubscription();
  let data = _events;
  if (filter?.status) data = data.filter((e) => e.status === filter.status);
  if (filter?.from) data = data.filter((e) => e.eventDate >= filter.from!);
  if (filter?.to) data = data.filter((e) => e.eventDate <= filter.to!);
  return {
    data,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

export function useUpdateEventStatus() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (eventIds: string[], newStatus: EventStatus) => {
    setLoading(true);
    try {
      for (const id of eventIds) {
        const idx = _events.findIndex((e) => e.id === id);
        if (idx >= 0) {
          _events[idx] = { ..._events[idx], status: newStatus };
        }
      }
      notify();
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Allocations ──

export function useAllocations(eventId?: string) {
  useSubscription();
  const data = eventId
    ? _allocations.filter((a) => a.eventId === eventId)
    : _allocations;
  return {
    data,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

// ── Allocation Rules ──

export function useAllocationRules() {
  useSubscription();
  return {
    data: _rules,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

export function useUpsertAllocationRule() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (rule: AllocationRuleSchema) => {
    setLoading(true);
    try {
      const json = JSON.stringify(rule);
      const idx = _rules.findIndex(
        (r) => r.tierName === rule.tierName && r.eventType === rule.eventType
      );
      if (idx >= 0) {
        _rules[idx] = { ..._rules[idx], rulesJSON: json };
      } else {
        _rules.push({
          id: genId("rule"),
          tierName: rule.tierName,
          eventType: rule.eventType,
          rulesJSON: json,
        });
      }
      notify();
      return rule;
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Budget ──

export function useActiveBudget() {
  useSubscription();
  const now = new Date().toISOString().slice(0, 10);
  const data = _budgets.find((b) => b.quarterStart <= now && b.quarterEnd >= now) ?? null;
  return {
    data,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

export function useAllBudgets() {
  useSubscription();
  return {
    data: _budgets,
    loading: false,
    error: null as Error | null,
    refetch: async () => { notify(); },
  };
}

export function useCreateBudgetPeriod() {
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (input: Omit<BudgetPeriod, "id" | "totalSpent" | "totalReserved" | "remainingAvailable">) => {
    setLoading(true);
    try {
      const period: BudgetPeriod = {
        ...input,
        id: genId("budget"),
        totalSpent: 0,
        totalReserved: 0,
        remainingAvailable: input.programTotal,
      };
      _budgets.push(period);
      notify();
      return period;
    } finally {
      setLoading(false);
    }
  }, []);
  return { mutate, loading };
}

// ── Weekly Spend (derived/static for now) ──

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
}

export function useSetupStatus(): SetupStatus {
  const { data: budget } = useActiveBudget();
  const { data: items } = useSwagItems();
  const { data: rules } = useAllocationRules();
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
  };
}

// ── Re-export types for convenience ──
export type { SwagItem, SwagEvent, Allocation, AllocationRule, BudgetPeriod, AllocationRuleSchema };
