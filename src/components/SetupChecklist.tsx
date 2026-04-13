import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  makeStyles,
  tokens,
  Text,
  Button,
} from "@fluentui/react-components";
import {
  CheckmarkCircleFilled,
  CircleRegular,
  WalletRegular,
  BoxRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import { useSetupStatus } from "@/hooks/useDataverse";
import { CreateBudgetPeriodDialog } from "./CreateBudgetPeriodDialog";
import { AddSwagItemDialog } from "./AddSwagItemDialog";

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  stepDone: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    border: `1px solid ${tokens.colorPaletteGreenBorder1}`,
  },
  stepIcon: {
    flexShrink: 0,
    width: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  stepTitleText: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepDetail: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

export const SetupChecklist: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const status = useSetupStatus();
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);

  const steps = [
    {
      done: status.hasBudgetPeriod,
      icon: <WalletRegular fontSize={20} />,
      title: "Set up the budget period",
      detail: status.hasBudgetPeriod
        ? "Active budget period configured."
        : "No active budget period for this quarter. Adrea or Dana sets the program total.",
      action: () => setBudgetDialogOpen(true),
      actionLabel: "Create Budget Period",
    },
    {
      done: status.hasInventory,
      icon: <BoxRegular fontSize={20} />,
      title: "Add swag inventory",
      detail: status.hasInventory
        ? `${status.itemCount} swag item(s) in inventory.`
        : "No swag items configured. Adrea/Chris seed the catalog from the manufacturer.",
      action: () => setItemDialogOpen(true),
      actionLabel: "Add First Item",
    },
    {
      done: status.hasRules,
      icon: <SettingsRegular fontSize={20} />,
      title: "Configure tier allocation rules",
      detail: status.hasRules
        ? `${status.ruleCount} rule(s) configured.`
        : "No rules configured. Adrea defines what each attendee tier (Exec, Champ, Tier 3, Tier 4) gets.",
      action: () => navigate("/rules"),
      actionLabel: "Open Rules Editor",
    },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.title}>Setup Checklist</Text>
        <Text className={styles.subtitle}>
          {status.isComplete
            ? "All set up. The agent is ready to handle seller requests."
            : "Configure these items before the agent goes live with sellers."}
        </Text>
      </div>
      <div className={styles.steps}>
        {steps.map((step) => (
          <div
            key={step.title}
            className={`${styles.step} ${step.done ? styles.stepDone : ""}`}
          >
            <span
              className={styles.stepIcon}
              style={{
                color: step.done
                  ? tokens.colorPaletteGreenForeground1
                  : tokens.colorNeutralForeground3,
              }}
            >
              {step.done ? <CheckmarkCircleFilled fontSize={24} /> : <CircleRegular fontSize={24} />}
            </span>
            <span className={styles.stepIcon}>{step.icon}</span>
            <div className={styles.stepBody}>
              <Text className={styles.stepTitleText}>{step.title}</Text>
              <Text className={styles.stepDetail}>{step.detail}</Text>
            </div>
            {!step.done && (
              <Button appearance="primary" onClick={step.action}>
                {step.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>

      <CreateBudgetPeriodDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
      />
      <AddSwagItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
      />
    </div>
  );
};
