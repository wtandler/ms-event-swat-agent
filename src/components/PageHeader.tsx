import React from "react";
import {
  makeStyles,
  tokens,
  Text,
  Toolbar,
  ToolbarButton,
  Tooltip,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    backgroundColor: tokens.colorNeutralBackground1,
    paddingLeft: "24px",
    paddingRight: "12px",
    minHeight: "44px",
    gap: "16px",
    flexShrink: 0,
  },
  titleArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap",
  },
});

export interface PageAction {
  key: string;
  label: string;
  icon?: React.ReactElement;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

interface PageHeaderProps {
  title: string;
  titleExtra?: React.ReactNode;
  actions?: PageAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, titleExtra, actions }) => {
  const styles = useStyles();

  return (
    <div className={styles.bar}>
      <div className={styles.titleArea}>
        <Text className={styles.title}>{title}</Text>
        {titleExtra}
      </div>
      {actions && actions.length > 0 && (
        <Toolbar size="small">
          {actions.map((action) => (
            <Tooltip content={action.label} relationship="label" key={action.key}>
              <ToolbarButton
                icon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                appearance={action.primary ? "primary" : "subtle"}
              >
                {action.label}
              </ToolbarButton>
            </Tooltip>
          ))}
        </Toolbar>
      )}
    </div>
  );
};
