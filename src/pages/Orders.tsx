import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  makeStyles,
  tokens,
  Text,
  Dropdown,
  Option,
  Button,
  Checkbox,
  Toaster,
  useToastController,
  useId,
  Toast,
  ToastBody,
  ToastTitle,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
} from "@fluentui/react-components";
import {
  CheckmarkRegular,
  DismissRegular,
} from "@fluentui/react-icons";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_EVENTS, MOCK_ALLOCATIONS } from "@/utils/mockData";
import type { SwagEvent, Allocation, EventStatus } from "@/types";

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
    gap: "12px",
    flex: 1,
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  tableArea: {
    display: "flex",
    flex: 1,
    gap: "16px",
    overflow: "hidden",
  },
  tableWrap: {
    flex: 1,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    backgroundColor: tokens.colorNeutralBackground3,
    position: "sticky",
    top: 0,
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
  selectedRow: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  detailSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "8px 0",
  },
  detailLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  allocTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  allocTh: {
    textAlign: "left",
    padding: "4px 8px",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  allocTd: {
    padding: "4px 8px",
    fontSize: tokens.fontSizeBase300,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

const STATUS_OPTIONS: EventStatus[] = ["draft", "confirmed", "amended", "ordered", "cancelled"];

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const Orders: React.FC = () => {
  const styles = useStyles();
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailEvent, setDetailEvent] = useState<SwagEvent | null>(null);
  const [events, setEvents] = useState<SwagEvent[]>(MOCK_EVENTS);

  // Filter by URL param if navigated from Budget Dashboard
  const eventIdParam = searchParams.get("event");

  const filteredEvents = useMemo(() => {
    let result = events;
    if (eventIdParam) {
      result = result.filter((e) => e.id === eventIdParam);
    }
    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }
    return result.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [events, statusFilter, eventIdParam]);

  const detailAllocations: Allocation[] = detailEvent
    ? MOCK_ALLOCATIONS.filter((a) => a.eventId === detailEvent.id)
    : [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const confirmable = filteredEvents.filter((e) => e.status === "confirmed");
    if (selected.size === confirmable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(confirmable.map((e) => e.id)));
    }
  };

  const handleMarkOrdered = () => {
    // State machine guard: only confirmed events can be marked as ordered
    const validIds = [...selected].filter((id) => {
      const evt = events.find((e) => e.id === id);
      return evt?.status === "confirmed";
    });
    if (validIds.length === 0) return;

    setEvents((prev) =>
      prev.map((e) =>
        validIds.includes(e.id) ? { ...e, status: "ordered" as EventStatus } : e
      )
    );
    setSelected(new Set());
    dispatchToast(
      <Toast>
        <ToastTitle>Marked as ordered</ToastTitle>
        <ToastBody>{validIds.length} allocation(s) updated.</ToastBody>
      </Toast>,
      { intent: "success" }
    );
  };

  const confirmedSelected = [...selected].filter((id) => {
    const evt = events.find((e) => e.id === id);
    return evt?.status === "confirmed";
  });

  return (
    <div className={styles.page}>
      <Toaster toasterId={toasterId} position="top-end" />
      <PageHeader
        title="Orders"
        actions={
          confirmedSelected.length > 0
            ? [
                {
                  key: "mark-ordered",
                  label: `Mark ${confirmedSelected.length} as Ordered`,
                  icon: <CheckmarkRegular />,
                  onClick: handleMarkOrdered,
                  primary: true,
                },
              ]
            : undefined
        }
      />
      <div className={styles.body}>
        {/* Filter bar */}
        <div className={styles.filterBar}>
          <div className={styles.field}>
            <Text className={styles.fieldLabel}>Status</Text>
            <Dropdown
              value={statusFilter === "all" ? "All Statuses" : statusFilter}
              onOptionSelect={(_, data) => setStatusFilter(data.optionValue ?? "all")}
              style={{ minWidth: 150 }}
            >
              <Option value="all" text="All Statuses">All Statuses</Option>
              {STATUS_OPTIONS.map((s) => (
                <Option key={s} value={s} text={s}>{s}</Option>
              ))}
            </Dropdown>
          </div>
          {eventIdParam && (
            <Button
              appearance="subtle"
              size="small"
              onClick={() => navigate("/orders")}
            >
              Clear event filter
            </Button>
          )}
        </div>

        {/* Table + Detail panel */}
        <div className={styles.tableArea}>
          <div className={styles.tableWrap}>
            {filteredEvents.length === 0 ? (
              <EmptyState
                message={
                  statusFilter !== "all"
                    ? "No matching orders for these filters."
                    : "No allocations yet. Sellers haven't submitted requests through the agent."
                }
              />
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>
                      <Checkbox
                        checked={
                          filteredEvents.filter((e) => e.status === "confirmed").length > 0 &&
                          selected.size === filteredEvents.filter((e) => e.status === "confirmed").length
                        }
                        onChange={toggleAll}
                        aria-label="Select all confirmed"
                      />
                    </th>
                    <th className={styles.th}>Event Date</th>
                    <th className={styles.th}>Seller</th>
                    <th className={styles.th}>Attendees</th>
                    <th className={styles.th}>Total Cost</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className={`${styles.clickableRow} ${detailEvent?.id === evt.id ? styles.selectedRow : ""}`}
                      onClick={() => setDetailEvent(evt)}
                    >
                      <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                        {evt.status === "confirmed" && (
                          <Checkbox
                            checked={selected.has(evt.id)}
                            onChange={() => toggleSelect(evt.id)}
                            aria-label={`Select ${evt.sellerName}`}
                          />
                        )}
                      </td>
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

      {/* Detail Panel (Drawer) */}
      <Drawer
        open={detailEvent !== null}
        onOpenChange={(_, data) => { if (!data.open) setDetailEvent(null); }}
        position="end"
        size="medium"
      >
        {detailEvent && (
          <>
            <DrawerHeader>
              <DrawerHeaderTitle
                action={
                  <Button
                    appearance="subtle"
                    icon={<DismissRegular />}
                    onClick={() => setDetailEvent(null)}
                    aria-label="Close"
                  />
                }
              >
                {detailEvent.sellerName} - {detailEvent.eventDate}
              </DrawerHeaderTitle>
            </DrawerHeader>
            <DrawerBody>
              <div className={styles.detailSection}>
                <Text className={styles.detailLabel}>Event Details</Text>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Attendees</Text>
                    <Text style={{ display: "block", fontWeight: 600 }}>{detailEvent.attendeeCount}</Text>
                  </div>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Execs</Text>
                    <Text style={{ display: "block", fontWeight: 600 }}>{detailEvent.execCount}</Text>
                  </div>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Champs</Text>
                    <Text style={{ display: "block", fontWeight: 600 }}>{detailEvent.champCount}</Text>
                  </div>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Type</Text>
                    <Text style={{ display: "block", fontWeight: 600 }}>{detailEvent.inPerson ? "In-Person" : "Virtual"}</Text>
                  </div>
                  <div>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Status</Text>
                    <div style={{ marginTop: 2 }}><StatusBadge status={detailEvent.status} /></div>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <Text className={styles.detailLabel}>Allocation Line Items</Text>
                {detailAllocations.length === 0 ? (
                  <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
                    No allocations for this event yet.
                  </Text>
                ) : (
                  <>
                    <table className={styles.allocTable}>
                      <thead>
                        <tr>
                          <th className={styles.allocTh}>Item</th>
                          <th className={styles.allocTh}>Qty</th>
                          <th className={styles.allocTh}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailAllocations.map((alloc) => (
                          <tr key={alloc.id}>
                            <td className={styles.allocTd}>{alloc.itemName}</td>
                            <td className={styles.allocTd}>{alloc.quantity}</td>
                            <td className={styles.allocTd}>{fmt(alloc.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                      <Text style={{ fontWeight: 600 }}>
                        Total: {fmt(detailAllocations.reduce((s, a) => s + a.totalCost, 0))}
                      </Text>
                    </div>
                  </>
                )}
              </div>
            </DrawerBody>
          </>
        )}
      </Drawer>
    </div>
  );
};
