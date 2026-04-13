import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  makeStyles,
  tokens,
  Text,
  Spinner,
} from "@fluentui/react-components";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { SetupChecklist } from "@/components/SetupChecklist";
import { CreateBudgetPeriodDialog } from "@/components/CreateBudgetPeriodDialog";
import {
  useActiveBudget,
  useEvents,
  useWeeklySpend,
  useSetupStatus,
} from "@/hooks/useDataverse";
import type { BudgetPeriod, SwagEvent } from "@/types";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  kpiBar: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  kpi: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  kpiLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  kpiValue: {
    fontSize: "24px",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  kpiGreen: { color: tokens.colorPaletteGreenForeground1 },
  kpiYellow: { color: tokens.colorPaletteYellowForeground1 },
  kpiRed: { color: tokens.colorPaletteRedForeground1 },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  chartContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    padding: "16px",
    height: "240px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  td: {
    padding: "8px 12px",
    fontSize: tokens.fontSizeBase300,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    color: tokens.colorNeutralForeground1,
  },
  clickableRow: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function budgetColor(budget: BudgetPeriod): string {
  const pct = budget.remainingAvailable / budget.programTotal;
  if (pct < 0.1) return "red";
  if (pct < 0.3) return "yellow";
  return "green";
}

export const BudgetDashboard: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [createBudgetOpen, setCreateBudgetOpen] = useState(false);
  const { data: activeBudget, loading } = useActiveBudget();
  const { data: allEvents } = useEvents();
  const { data: weeklySpend } = useWeeklySpend();
  const setupStatus = useSetupStatus();

  const now = new Date().toISOString().slice(0, 10);
  const upcomingEvents = allEvents
    .filter((e) => e.eventDate >= now && e.status !== "cancelled")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="Budget Dashboard" />
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spinner label="Loading budget data..." />
        </div>
      </div>
    );
  }

  // Show setup checklist if anything isn't configured yet
  if (!setupStatus.isComplete) {
    return (
      <div className={styles.page}>
        <PageHeader title="Budget Dashboard" />
        <div style={{ padding: 24 }}>
          <SetupChecklist />
        </div>
      </div>
    );
  }

  if (!activeBudget) {
    return (
      <div className={styles.page}>
        <PageHeader title="Budget Dashboard" />
        <EmptyState
          message="No budget period configured for this quarter. Create one to get started."
          actionLabel="Create Budget Period"
          onAction={() => setCreateBudgetOpen(true)}
        />
        <CreateBudgetPeriodDialog
          open={createBudgetOpen}
          onOpenChange={setCreateBudgetOpen}
        />
      </div>
    );
  }

  const color = budgetColor(activeBudget);
  const colorClass = color === "green" ? styles.kpiGreen : color === "yellow" ? styles.kpiYellow : styles.kpiRed;

  return (
    <div className={styles.page}>
      <PageHeader title="Budget Dashboard" />
      <div className={styles.body}>
        {/* KPI Bar */}
        <div className={styles.kpiBar}>
          <div className={styles.kpi}>
            <Text className={styles.kpiLabel}>Program Total</Text>
            <Text className={styles.kpiValue}>{fmt(activeBudget.programTotal)}</Text>
          </div>
          <div className={styles.kpi}>
            <Text className={styles.kpiLabel}>Spent</Text>
            <Text className={styles.kpiValue}>{fmt(activeBudget.totalSpent)}</Text>
          </div>
          <div className={styles.kpi}>
            <Text className={styles.kpiLabel}>Reserved</Text>
            <Text className={styles.kpiValue}>{fmt(activeBudget.totalReserved)}</Text>
          </div>
          <div className={styles.kpi}>
            <Text className={styles.kpiLabel}>Available</Text>
            <Text className={`${styles.kpiValue} ${colorClass}`}>
              {fmt(activeBudget.remainingAvailable)}
            </Text>
          </div>
        </div>

        {/* Spend Chart */}
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Spend Over Time</Text>
          <div className={styles.chartContainer}>
            {weeklySpend.length === 0 ? (
              <EmptyState message="No allocations this quarter" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySpend} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke3} />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(value: number) => fmt(value)} />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    name="Spent"
                    stroke="#0078D4"
                    fill="#0078D4"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="reserved"
                    name="Reserved"
                    stroke="#8764B8"
                    fill="#8764B8"
                    fillOpacity={0.08}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.length === 0 ? (
            <EmptyState message="No upcoming events. Sellers haven't submitted requests yet." />
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Event Date</th>
                  <th className={styles.th}>Seller</th>
                  <th className={styles.th}>Attendees</th>
                  <th className={styles.th}>Projected Cost</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((evt: SwagEvent) => (
                  <tr
                    key={evt.id}
                    className={styles.clickableRow}
                    onClick={() => navigate(`/orders?event=${evt.id}`)}
                  >
                    <td className={styles.td}>{evt.eventDate}</td>
                    <td className={styles.td}>{evt.sellerName}</td>
                    <td className={styles.td}>{evt.attendeeCount}</td>
                    <td className={styles.td}>{evt.totalCost > 0 ? fmt(evt.totalCost) : "TBD"}</td>
                    <td className={styles.td}><StatusBadge status={evt.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
