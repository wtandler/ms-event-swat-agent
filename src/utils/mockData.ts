import type {
  SwagItem,
  SwagEvent,
  Allocation,
  AllocationRule,
  BudgetPeriod,
  AllocationRuleSchema,
} from "@/types";

// ── Mock: whether to use local data (dev) or Dataverse SDK (production) ──
export const IS_DEV = import.meta.env.DEV;

// ── Swag Items (inventory) ──

export const MOCK_SWAG_ITEMS: SwagItem[] = [
  { id: "item-01", name: "Logo T-Shirt", sizeCategory: "L", unitCost: 18.00, quantityTotal: 200, quantityReserved: 85, quantityAvailable: 115, tierEligibility: "Exec,Champ" },
  { id: "item-02", name: "Branded Hoodie", sizeCategory: "L", unitCost: 35.00, quantityTotal: 100, quantityReserved: 42, quantityAvailable: 58, tierEligibility: "Exec" },
  { id: "item-03", name: "Performance Socks", sizeCategory: "M", unitCost: 8.50, quantityTotal: 500, quantityReserved: 310, quantityAvailable: 190, tierEligibility: "Exec,Champ,Tier3" },
  { id: "item-04", name: "Notebook + Pen Set", sizeCategory: "M", unitCost: 12.00, quantityTotal: 300, quantityReserved: 180, quantityAvailable: 120, tierEligibility: "Exec,Champ,Tier3" },
  { id: "item-05", name: "Branded Pen", sizeCategory: "S", unitCost: 2.50, quantityTotal: 2000, quantityReserved: 800, quantityAvailable: 1200, tierEligibility: "Exec,Champ,Tier3,Tier4" },
  { id: "item-06", name: "Enamel Pin", sizeCategory: "S", unitCost: 1.75, quantityTotal: 3000, quantityReserved: 1400, quantityAvailable: 1600, tierEligibility: "Exec,Champ,Tier3,Tier4" },
  { id: "item-07", name: "Sticker Pack", sizeCategory: "S", unitCost: 0.50, quantityTotal: 5000, quantityReserved: 2200, quantityAvailable: 2800, tierEligibility: "Exec,Champ,Tier3,Tier4" },
  { id: "item-08", name: "Water Bottle", sizeCategory: "M", unitCost: 15.00, quantityTotal: 150, quantityReserved: 90, quantityAvailable: 60, tierEligibility: "Exec,Champ" },
  { id: "item-09", name: "Tote Bag", sizeCategory: "M", unitCost: 6.00, quantityTotal: 400, quantityReserved: 250, quantityAvailable: 150, tierEligibility: "Champ,Tier3,Tier4" },
  { id: "item-10", name: "Laptop Sticker Sheet", sizeCategory: "S", unitCost: 1.25, quantityTotal: 4000, quantityReserved: 1800, quantityAvailable: 2200, tierEligibility: "Exec,Champ,Tier3,Tier4" },
  { id: "item-11", name: "Wireless Charger", sizeCategory: "L", unitCost: 25.00, quantityTotal: 50, quantityReserved: 45, quantityAvailable: 5, tierEligibility: "Exec" },
  { id: "item-12", name: "Sunglasses", sizeCategory: "M", unitCost: 7.00, quantityTotal: 200, quantityReserved: 195, quantityAvailable: 5, tierEligibility: "Champ,Tier3" },
];

// ── Events ──

export const MOCK_EVENTS: SwagEvent[] = [
  { id: "evt-01", eventDate: "2026-04-25", attendeeCount: 150, execCount: 5, champCount: 15, tier3Count: 50, tier4Count: 80, inPerson: true, sellerName: "Sarah Chen", sellerUserId: "u-001", tpid: "TPID-12345", status: "confirmed", totalCost: 1250.00 },
  { id: "evt-02", eventDate: "2026-05-03", attendeeCount: 40, execCount: 3, champCount: 8, tier3Count: 15, tier4Count: 14, inPerson: true, sellerName: "Marcus Johnson", sellerUserId: "u-002", tpid: "TPID-67890", status: "confirmed", totalCost: 680.00 },
  { id: "evt-03", eventDate: "2026-05-10", attendeeCount: 500, execCount: 10, champCount: 30, tier3Count: 160, tier4Count: 300, inPerson: true, sellerName: "Priya Patel", sellerUserId: "u-003", tpid: "TPID-11111", status: "draft", totalCost: 2100.00 },
  { id: "evt-04", eventDate: "2026-04-18", attendeeCount: 25, execCount: 2, champCount: 5, tier3Count: 10, tier4Count: 8, inPerson: false, sellerName: "David Kim", sellerUserId: "u-004", tpid: "TPID-22222", status: "ordered", totalCost: 320.00 },
  { id: "evt-05", eventDate: "2026-05-20", attendeeCount: 200, execCount: 8, champCount: 20, tier3Count: 72, tier4Count: 100, inPerson: true, sellerName: "Lisa Torres", sellerUserId: "u-005", tpid: "TPID-33333", status: "confirmed", totalCost: 1800.00 },
  { id: "evt-06", eventDate: "2026-04-12", attendeeCount: 75, execCount: 4, champCount: 10, tier3Count: 25, tier4Count: 36, inPerson: true, sellerName: "James Wright", sellerUserId: "u-006", tpid: "TPID-44444", status: "ordered", totalCost: 890.00 },
  { id: "evt-07", eventDate: "2026-03-28", attendeeCount: 60, execCount: 3, champCount: 8, tier3Count: 20, tier4Count: 29, inPerson: false, sellerName: "Emily Watson", sellerUserId: "u-007", tpid: "TPID-55555", status: "ordered", totalCost: 450.00 },
  { id: "evt-08", eventDate: "2026-05-28", attendeeCount: 350, execCount: 12, champCount: 25, tier3Count: 113, tier4Count: 200, inPerson: true, sellerName: "Robert Garcia", sellerUserId: "u-008", tpid: "TPID-66666", status: "draft", totalCost: 0 },
  { id: "evt-09", eventDate: "2026-04-05", attendeeCount: 90, execCount: 5, champCount: 12, tier3Count: 30, tier4Count: 43, inPerson: true, sellerName: "Ana Rodriguez", sellerUserId: "u-009", tpid: "TPID-77777", status: "cancelled", totalCost: 0 },
];

// ── Allocations (line items for confirmed/ordered events) ──

export const MOCK_ALLOCATIONS: Allocation[] = [
  // evt-01 (Sarah Chen, confirmed)
  { id: "alloc-01", eventId: "evt-01", itemId: "item-02", itemName: "Branded Hoodie", quantity: 5, totalCost: 175.00, status: "confirmed" },
  { id: "alloc-02", eventId: "evt-01", itemId: "item-03", itemName: "Performance Socks", quantity: 20, totalCost: 170.00, status: "confirmed" },
  { id: "alloc-03", eventId: "evt-01", itemId: "item-04", itemName: "Notebook + Pen Set", quantity: 15, totalCost: 180.00, status: "confirmed" },
  { id: "alloc-04", eventId: "evt-01", itemId: "item-06", itemName: "Enamel Pin", quantity: 150, totalCost: 262.50, status: "confirmed" },
  { id: "alloc-05", eventId: "evt-01", itemId: "item-07", itemName: "Sticker Pack", quantity: 150, totalCost: 75.00, status: "confirmed" },
  // evt-02 (Marcus Johnson, confirmed)
  { id: "alloc-06", eventId: "evt-02", itemId: "item-01", itemName: "Logo T-Shirt", quantity: 3, totalCost: 54.00, status: "confirmed" },
  { id: "alloc-07", eventId: "evt-02", itemId: "item-03", itemName: "Performance Socks", quantity: 8, totalCost: 68.00, status: "confirmed" },
  { id: "alloc-08", eventId: "evt-02", itemId: "item-05", itemName: "Branded Pen", quantity: 40, totalCost: 100.00, status: "confirmed" },
  { id: "alloc-09", eventId: "evt-02", itemId: "item-07", itemName: "Sticker Pack", quantity: 40, totalCost: 20.00, status: "confirmed" },
  // evt-04 (David Kim, ordered)
  { id: "alloc-10", eventId: "evt-04", itemId: "item-04", itemName: "Notebook + Pen Set", quantity: 7, totalCost: 84.00, status: "ordered" },
  { id: "alloc-11", eventId: "evt-04", itemId: "item-05", itemName: "Branded Pen", quantity: 25, totalCost: 62.50, status: "ordered" },
  { id: "alloc-12", eventId: "evt-04", itemId: "item-10", itemName: "Laptop Sticker Sheet", quantity: 25, totalCost: 31.25, status: "ordered" },
  // evt-05 (Lisa Torres, confirmed)
  { id: "alloc-13", eventId: "evt-05", itemId: "item-02", itemName: "Branded Hoodie", quantity: 8, totalCost: 280.00, status: "confirmed" },
  { id: "alloc-14", eventId: "evt-05", itemId: "item-01", itemName: "Logo T-Shirt", quantity: 20, totalCost: 360.00, status: "confirmed" },
  { id: "alloc-15", eventId: "evt-05", itemId: "item-08", itemName: "Water Bottle", quantity: 20, totalCost: 300.00, status: "confirmed" },
  { id: "alloc-16", eventId: "evt-05", itemId: "item-06", itemName: "Enamel Pin", quantity: 200, totalCost: 350.00, status: "confirmed" },
  { id: "alloc-17", eventId: "evt-05", itemId: "item-07", itemName: "Sticker Pack", quantity: 200, totalCost: 100.00, status: "confirmed" },
  // evt-06 (James Wright, ordered)
  { id: "alloc-18", eventId: "evt-06", itemId: "item-01", itemName: "Logo T-Shirt", quantity: 4, totalCost: 72.00, status: "ordered" },
  { id: "alloc-19", eventId: "evt-06", itemId: "item-03", itemName: "Performance Socks", quantity: 10, totalCost: 85.00, status: "ordered" },
  { id: "alloc-20", eventId: "evt-06", itemId: "item-09", itemName: "Tote Bag", quantity: 75, totalCost: 450.00, status: "ordered" },
  // evt-07 (Emily Watson, ordered - virtual)
  { id: "alloc-21", eventId: "evt-07", itemId: "item-04", itemName: "Notebook + Pen Set", quantity: 11, totalCost: 132.00, status: "ordered" },
  { id: "alloc-22", eventId: "evt-07", itemId: "item-03", itemName: "Performance Socks", quantity: 11, totalCost: 93.50, status: "ordered" },
];

// ── Allocation Rules ──

const execInPersonPack: AllocationRuleSchema = {
  tierName: "Exec",
  eventType: "in-person",
  packItems: [
    { itemId: "item-02", itemName: "Branded Hoodie", sizeCategory: "L", quantity: 1, unitCost: 35.00 },
    { itemId: "item-03", itemName: "Performance Socks", sizeCategory: "M", quantity: 2, unitCost: 8.50 },
    { itemId: "item-04", itemName: "Notebook + Pen Set", sizeCategory: "M", quantity: 1, unitCost: 12.00 },
  ],
  totalPackCost: 64.00,
};

const champInPersonPack: AllocationRuleSchema = {
  tierName: "Champ",
  eventType: "in-person",
  packItems: [
    { itemId: "item-03", itemName: "Performance Socks", sizeCategory: "M", quantity: 1, unitCost: 8.50 },
    { itemId: "item-04", itemName: "Notebook + Pen Set", sizeCategory: "M", quantity: 1, unitCost: 12.00 },
    { itemId: "item-09", itemName: "Tote Bag", sizeCategory: "M", quantity: 1, unitCost: 6.00 },
  ],
  totalPackCost: 26.50,
};

export const MOCK_ALLOCATION_RULES: AllocationRule[] = [
  { id: "rule-01", tierName: "Exec", eventType: "in-person", rulesJSON: JSON.stringify(execInPersonPack) },
  { id: "rule-02", tierName: "Champ", eventType: "in-person", rulesJSON: JSON.stringify(champInPersonPack) },
];

// ── Budget ──

export const MOCK_BUDGET_PERIODS: BudgetPeriod[] = [
  {
    id: "budget-01",
    programName: "Excite Days FY26 Q3",
    programTotal: 20000,
    totalSpent: 7540.75,
    totalReserved: 5130.00,
    remainingAvailable: 7329.25,
    quarterStart: "2026-04-01",
    quarterEnd: "2026-06-30",
  },
  {
    id: "budget-00",
    programName: "Excite Days FY26 Q2",
    programTotal: 18000,
    totalSpent: 17250.00,
    totalReserved: 0,
    remainingAvailable: 750.00,
    quarterStart: "2026-01-01",
    quarterEnd: "2026-03-31",
  },
];

// ── Weekly spend data for chart ──

export interface WeeklySpend {
  week: string;
  spent: number;
  reserved: number;
}

export const MOCK_WEEKLY_SPEND: WeeklySpend[] = [
  { week: "Apr 1", spent: 890, reserved: 1200 },
  { week: "Apr 7", spent: 1450, reserved: 1800 },
  { week: "Apr 14", spent: 2340, reserved: 2650 },
  { week: "Apr 21", spent: 3200, reserved: 3400 },
  { week: "Apr 28", spent: 4100, reserved: 4200 },
  { week: "May 5", spent: 5300, reserved: 4800 },
  { week: "May 12", spent: 6200, reserved: 5000 },
  { week: "May 19", spent: 7540, reserved: 5130 },
];
