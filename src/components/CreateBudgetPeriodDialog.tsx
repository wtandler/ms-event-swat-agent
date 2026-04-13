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
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useCreateBudgetPeriod } from "@/hooks/useDataverse";

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
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function defaultQuarter() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const qStart = new Date(year, Math.floor(month / 3) * 3, 1);
  const qEnd = new Date(year, Math.floor(month / 3) * 3 + 3, 0);
  const fy = month >= 6 ? `FY${(year + 1).toString().slice(2)}` : `FY${year.toString().slice(2)}`;
  const q = ["Q3", "Q4", "Q1", "Q2"][Math.floor(month / 3)]; // Microsoft FY starts July
  return {
    programName: `Excite Days ${fy} ${q}`,
    quarterStart: qStart.toISOString().slice(0, 10),
    quarterEnd: qEnd.toISOString().slice(0, 10),
  };
}

export const CreateBudgetPeriodDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const styles = useStyles();
  const { mutate, loading } = useCreateBudgetPeriod();
  const defaults = defaultQuarter();

  const [programName, setProgramName] = useState(defaults.programName);
  const [programTotal, setProgramTotal] = useState("20000");
  const [quarterStart, setQuarterStart] = useState(defaults.quarterStart);
  const [quarterEnd, setQuarterEnd] = useState(defaults.quarterEnd);

  const totalNum = Number(programTotal);
  const valid =
    programName.trim().length > 0 &&
    !isNaN(totalNum) && totalNum > 0 &&
    quarterStart && quarterEnd &&
    quarterStart < quarterEnd;

  const handleCreate = async () => {
    if (!valid) return;
    await mutate({
      programName: programName.trim(),
      programTotal: totalNum,
      quarterStart,
      quarterEnd,
    });
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create Budget Period</DialogTitle>
          <DialogContent>
            <div className={styles.fields}>
              <Field label="Program Name" required>
                <Input
                  value={programName}
                  onChange={(_, d) => setProgramName(d.value)}
                  placeholder="Excite Days FY26 Q3"
                />
              </Field>
              <Field
                label="Program Total ($)"
                required
                hint="Total budget allocated to this program for the quarter"
              >
                <Input
                  type="number"
                  value={programTotal}
                  onChange={(_, d) => setProgramTotal(d.value)}
                  contentBefore="$"
                />
              </Field>
              <div className={styles.row}>
                <Field label="Quarter Start" required className={styles.rowItem}>
                  <Input
                    type="date"
                    value={quarterStart}
                    onChange={(_, d) => setQuarterStart(d.value)}
                  />
                </Field>
                <Field label="Quarter End" required className={styles.rowItem}>
                  <Input
                    type="date"
                    value={quarterEnd}
                    onChange={(_, d) => setQuarterEnd(d.value)}
                  />
                </Field>
              </div>
              <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                Get the actual program total from Dana before going live.
                Default values are placeholders.
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={loading}>Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handleCreate} disabled={!valid || loading}>
              {loading ? "Creating..." : "Create Period"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
