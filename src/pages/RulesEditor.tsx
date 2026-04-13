import React, { useState, useMemo } from "react";
import {
  makeStyles,
  tokens,
  Text,
  TabList,
  Tab,
  Combobox,
  Option,
  SpinButton,
  Button,
  Toaster,
  useToastController,
  useId,
  Toast,
  ToastBody,
  ToastTitle,
  ToggleButton,
} from "@fluentui/react-components";
import {
  AddRegular,
  DeleteRegular,
  SaveRegular,
} from "@fluentui/react-icons";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { MOCK_SWAG_ITEMS, MOCK_ALLOCATION_RULES } from "@/utils/mockData";
import type { PackItem, AllocationRuleSchema, SwagItem } from "@/types";

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
  tierBar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  editorLayout: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  addRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
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
  packList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: "320px",
  },
  packItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  packItemName: {
    flex: 1,
    fontSize: tokens.fontSizeBase300,
  },
  packItemDetail: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
  },
  summary: {
    display: "flex",
    gap: "24px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
});

type TierName = "Exec" | "Champ" | "Tier3" | "Tier4";
type EventType = "in-person" | "virtual";

const TIERS: TierName[] = ["Exec", "Champ", "Tier3", "Tier4"];

export const RulesEditor: React.FC = () => {
  const styles = useStyles();
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);

  const [selectedTier, setSelectedTier] = useState<TierName>("Exec");
  const [eventType, setEventType] = useState<EventType>("in-person");
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [addItemId, setAddItemId] = useState<string>("");
  const [addQty, setAddQty] = useState<number>(1);

  // Load existing rule for selected tier + event type
  React.useEffect(() => {
    const existing = MOCK_ALLOCATION_RULES.find(
      (r) => r.tierName === selectedTier && r.eventType === eventType
    );
    if (existing) {
      try {
        const parsed: AllocationRuleSchema = JSON.parse(existing.rulesJSON);
        setPackItems(parsed.packItems);
      } catch {
        setPackItems([]);
      }
    } else {
      setPackItems([]);
    }
  }, [selectedTier, eventType]);

  const availableItems = useMemo(() =>
    MOCK_SWAG_ITEMS.filter((item) =>
      item.tierEligibility.includes(selectedTier)
    ),
    [selectedTier]
  );

  const selectedItem: SwagItem | undefined = availableItems.find((i) => i.id === addItemId);

  const handleAdd = () => {
    if (!selectedItem || addQty < 1) return;
    const existingIdx = packItems.findIndex((p) => p.itemId === selectedItem.id);
    if (existingIdx >= 0) {
      // Increment quantity of existing item
      const updated = [...packItems];
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: updated[existingIdx].quantity + addQty,
      };
      setPackItems(updated);
    } else {
      setPackItems([
        ...packItems,
        {
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          sizeCategory: selectedItem.sizeCategory,
          quantity: addQty,
          unitCost: selectedItem.unitCost,
        },
      ]);
    }
    setAddItemId("");
    setAddQty(1);
  };

  const handleRemove = (itemId: string) => {
    setPackItems(packItems.filter((p) => p.itemId !== itemId));
  };

  const totalItems = packItems.reduce((s, p) => s + p.quantity, 0);
  const totalCost = packItems.reduce((s, p) => s + p.quantity * p.unitCost, 0);

  const handleSave = () => {
    // In production: write to Dataverse AllocationRules table
    // const rule: AllocationRuleSchema = { tierName: selectedTier, eventType, packItems, totalPackCost: totalCost };
    // const json = JSON.stringify(rule);
    void totalCost; // used in toast below
    dispatchToast(
      <Toast>
        <ToastTitle>Rule saved</ToastTitle>
        <ToastBody>{selectedTier} ({eventType}) pack updated.</ToastBody>
      </Toast>,
      { intent: "success" }
    );
  };

  return (
    <div className={styles.page}>
      <Toaster toasterId={toasterId} position="top-end" />
      <PageHeader
        title="Rules Editor"
        actions={[
          {
            key: "save",
            label: "Save Rule",
            icon: <SaveRegular />,
            onClick: handleSave,
            primary: true,
            disabled: packItems.length === 0,
          },
        ]}
      />
      <div className={styles.body}>
        {/* Tier + Event Type selector */}
        <div className={styles.tierBar}>
          <TabList
            selectedValue={selectedTier}
            onTabSelect={(_, data) => setSelectedTier(data.value as TierName)}
          >
            {TIERS.map((t) => (
              <Tab key={t} value={t}>{t}</Tab>
            ))}
          </TabList>
          <div style={{ display: "flex", gap: 4 }}>
            <ToggleButton
              checked={eventType === "in-person"}
              onClick={() => setEventType("in-person")}
              size="small"
            >
              In-Person
            </ToggleButton>
            <ToggleButton
              checked={eventType === "virtual"}
              onClick={() => setEventType("virtual")}
              size="small"
            >
              Virtual
            </ToggleButton>
          </div>
        </div>

        {/* Add item row */}
        <div className={styles.addRow}>
          <div className={styles.field}>
            <Text className={styles.fieldLabel}>Swag Item</Text>
            <Combobox
              placeholder="Search items..."
              value={selectedItem?.name ?? ""}
              onOptionSelect={(_, data) => setAddItemId(data.optionValue ?? "")}
              style={{ minWidth: 220 }}
            >
              {availableItems.map((item) => (
                <Option key={item.id} value={item.id} text={item.name}>
                  {item.name} ({item.sizeCategory}) - ${item.unitCost.toFixed(2)}
                </Option>
              ))}
            </Combobox>
          </div>
          <div className={styles.field}>
            <Text className={styles.fieldLabel}>Quantity</Text>
            <SpinButton
              value={addQty}
              onChange={(_, data) => setAddQty(data.value ?? 1)}
              min={1}
              max={999}
              style={{ width: 80 }}
            />
          </div>
          <Button
            icon={<AddRegular />}
            onClick={handleAdd}
            disabled={!selectedItem || addQty < 1}
          >
            Add
          </Button>
        </div>

        {/* Pack items list */}
        {packItems.length === 0 ? (
          <EmptyState message="Select a tier to configure its swag pack. Each tier defines what items attendees at that level receive." />
        ) : (
          <div className={styles.packList}>
            {packItems.map((item) => (
              <div key={item.itemId} className={styles.packItem}>
                <Text className={styles.packItemName}>{item.itemName}</Text>
                <Text className={styles.packItemDetail}>{item.sizeCategory}</Text>
                <Text className={styles.packItemDetail}>x{item.quantity}</Text>
                <Text className={styles.packItemDetail}>
                  ${(item.quantity * item.unitCost).toFixed(2)}
                </Text>
                <Button
                  icon={<DeleteRegular />}
                  appearance="subtle"
                  size="small"
                  onClick={() => handleRemove(item.itemId)}
                  aria-label={`Remove ${item.itemName}`}
                />
              </div>
            ))}

            {/* Summary */}
            <div className={styles.summary}>
              <div>
                <Text className={styles.fieldLabel}>Total Items</Text>
                <Text style={{ fontWeight: 600, display: "block" }}>{totalItems}</Text>
              </div>
              <div>
                <Text className={styles.fieldLabel}>Pack Cost</Text>
                <Text style={{ fontWeight: 600, display: "block" }}>${totalCost.toFixed(2)}</Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
