import React, { useState, useCallback } from "react";
import {
  makeStyles,
  tokens,
  Text,
  Input,
  Toaster,
  useToastController,
  useId,
  Toast,
  ToastBody,
  ToastTitle,
} from "@fluentui/react-components";
import {
  SaveRegular,
  DismissRegular,
  AddRegular,
} from "@fluentui/react-icons";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StockIndicator } from "@/components/StockIndicator";
import { AddSwagItemDialog } from "@/components/AddSwagItemDialog";
import { useSwagItems, useUpdateSwagItemQuantity } from "@/hooks/useDataverse";

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
    padding: "6px 12px",
    fontSize: tokens.fontSizeBase300,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    color: tokens.colorNeutralForeground1,
  },
  editedCell: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  toolbar: {
    display: "flex",
    gap: "8px",
  },
});

export const InventoryManagement: React.FC = () => {
  const styles = useStyles();
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);

  const { data: items } = useSwagItems();
  const { mutate: updateQuantities, loading: saving } = useUpdateSwagItemQuantity();

  // Local staged edits (itemId -> new quantityTotal)
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [addItemOpen, setAddItemOpen] = useState(false);

  const hasEdits = Object.keys(edits).length > 0;

  // Build the displayed items: apply staged edits over the persisted items
  const displayItems = items.map((item) => {
    if (edits[item.id] !== undefined) {
      return {
        ...item,
        quantityTotal: edits[item.id],
        quantityAvailable: edits[item.id] - item.quantityReserved,
      };
    }
    return item;
  });

  const handleEdit = useCallback((itemId: string, newTotal: number) => {
    const original = items.find((i) => i.id === itemId);
    if (!original) return;

    if (newTotal === original.quantityTotal) {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setEdits((prev) => ({ ...prev, [itemId]: newTotal }));
    }
  }, [items]);

  const handleSave = async () => {
    const updates = Object.entries(edits).map(([id, quantityTotal]) => ({ id, quantityTotal }));
    try {
      await updateQuantities(updates);
      const count = Object.keys(edits).length;
      setEdits({});
      dispatchToast(
        <Toast>
          <ToastTitle>Inventory updated</ToastTitle>
          <ToastBody>{count} item(s) saved.</ToastBody>
        </Toast>,
        { intent: "success" }
      );
    } catch {
      dispatchToast(
        <Toast>
          <ToastTitle>Failed to update inventory</ToastTitle>
          <ToastBody>Try again, or contact support.</ToastBody>
        </Toast>,
        { intent: "error" }
      );
    }
  };

  const handleDiscard = () => {
    setEdits({});
  };

  return (
    <div className={styles.page}>
      <Toaster toasterId={toasterId} position="top-end" />
      <PageHeader
        title="Inventory"
        actions={
          hasEdits
            ? [
                {
                  key: "discard",
                  label: "Discard",
                  icon: <DismissRegular />,
                  onClick: handleDiscard,
                  disabled: saving,
                },
                {
                  key: "save",
                  label: saving ? "Saving..." : "Save Changes",
                  icon: <SaveRegular />,
                  onClick: handleSave,
                  primary: true,
                  disabled: saving,
                },
              ]
            : [
                {
                  key: "add",
                  label: "Add Item",
                  icon: <AddRegular />,
                  onClick: () => setAddItemOpen(true),
                },
              ]
        }
      />
      <div className={styles.body}>
        {displayItems.length === 0 ? (
          <EmptyState
            message="No swag items configured. Add your first item."
            actionLabel="Add Item"
            onAction={() => setAddItemOpen(true)}
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Item Name</th>
                <th className={styles.th}>Size</th>
                <th className={styles.th}>Unit Cost</th>
                <th className={styles.th}>Qty Total</th>
                <th className={styles.th}>Reserved</th>
                <th className={styles.th}>Available</th>
                <th className={styles.th}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item) => {
                const isEdited = item.id in edits;
                return (
                  <tr key={item.id}>
                    <td className={styles.td}>{item.name}</td>
                    <td className={styles.td}>
                      <Text size={200}>{item.sizeCategory}</Text>
                    </td>
                    <td className={styles.td}>${item.unitCost.toFixed(2)}</td>
                    <td className={`${styles.td} ${isEdited ? styles.editedCell : ""}`}>
                      <Input
                        type="number"
                        value={String(item.quantityTotal)}
                        onChange={(_, data) => {
                          const val = parseInt(data.value, 10);
                          if (!isNaN(val) && val >= 0) {
                            handleEdit(item.id, val);
                          }
                        }}
                        style={{ width: 80 }}
                        size="small"
                        appearance="underline"
                      />
                    </td>
                    <td className={styles.td}>{item.quantityReserved}</td>
                    <td className={styles.td}>{item.quantityAvailable}</td>
                    <td className={styles.td}>
                      <StockIndicator item={item} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <AddSwagItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} />
    </div>
  );
};
