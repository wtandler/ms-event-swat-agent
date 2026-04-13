import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  Checkbox,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useCreateSwagItem } from "@/hooks/useDataverse";
import type { SizeCategory } from "@/types";

const useStyles = makeStyles({
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  row: {
    display: "flex",
    gap: "12px",
  },
  rowItem: {
    flex: 1,
  },
  tierGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  hint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

const TIERS = ["Exec", "Champ", "Tier3", "Tier4"] as const;
type Tier = typeof TIERS[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export const AddSwagItemDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const styles = useStyles();
  const { mutate, loading } = useCreateSwagItem();

  const [name, setName] = useState("");
  const [sizeCategory, setSizeCategory] = useState<SizeCategory>("M");
  const [unitCost, setUnitCost] = useState("");
  const [quantityTotal, setQuantityTotal] = useState("");
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(["Exec", "Champ", "Tier3", "Tier4"]));

  const costNum = Number(unitCost);
  const qtyNum = Number(quantityTotal);
  const valid =
    name.trim().length > 0 &&
    !isNaN(costNum) && costNum > 0 &&
    !isNaN(qtyNum) && qtyNum > 0 &&
    tiers.size > 0;

  const reset = () => {
    setName("");
    setSizeCategory("M");
    setUnitCost("");
    setQuantityTotal("");
    setTiers(new Set(["Exec", "Champ", "Tier3", "Tier4"]));
  };

  const toggleTier = (tier: Tier) => {
    setTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!valid) return;
    await mutate({
      name: name.trim(),
      sizeCategory,
      unitCost: costNum,
      quantityTotal: qtyNum,
      tierEligibility: [...tiers].join(","),
    });
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add Swag Item</DialogTitle>
          <DialogContent>
            <div className={styles.fields}>
              <Field label="Item Name" required>
                <Input
                  value={name}
                  onChange={(_, d) => setName(d.value)}
                  placeholder="e.g., Branded Hoodie"
                />
              </Field>
              <div className={styles.row}>
                <Field label="Size Category" required className={styles.rowItem}>
                  <Dropdown
                    value={sizeCategory}
                    selectedOptions={[sizeCategory]}
                    onOptionSelect={(_, d) => setSizeCategory((d.optionValue as SizeCategory) ?? "M")}
                  >
                    <Option value="S" text="S">S - small (under $5)</Option>
                    <Option value="M" text="M">M - medium ($5-$20)</Option>
                    <Option value="L" text="L">L - large ($20+)</Option>
                  </Dropdown>
                </Field>
                <Field label="Unit Cost ($)" required className={styles.rowItem}>
                  <Input
                    type="number"
                    value={unitCost}
                    onChange={(_, d) => setUnitCost(d.value)}
                    contentBefore="$"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Qty Total" required className={styles.rowItem}>
                  <Input
                    type="number"
                    value={quantityTotal}
                    onChange={(_, d) => setQuantityTotal(d.value)}
                    placeholder="100"
                  />
                </Field>
              </div>
              <Field label="Tier Eligibility" required hint="Which attendee tiers can receive this item?">
                <div className={styles.tierGroup}>
                  {TIERS.map((tier) => (
                    <Checkbox
                      key={tier}
                      label={tier}
                      checked={tiers.has(tier)}
                      onChange={() => toggleTier(tier)}
                    />
                  ))}
                </div>
              </Field>
              <div className={styles.hint}>
                Get actual catalog (items, costs, eligibility) from Adrea/Chris before going live.
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={loading} onClick={reset}>Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handleCreate} disabled={!valid || loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
