import React from "react";
import { makeStyles, tokens, Text, Button } from "@fluentui/react-components";
import { BoxSearchRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    gap: "12px",
    color: tokens.colorNeutralForeground3,
  },
});

interface EmptyStateProps {
  message: string;
  icon?: React.ReactElement;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  actionLabel,
  onAction,
}) => {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {icon ?? <BoxSearchRegular fontSize={48} />}
      <Text size={400}>{message}</Text>
      {actionLabel && onAction && (
        <Button appearance="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
