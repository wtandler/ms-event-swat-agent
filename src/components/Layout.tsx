import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { makeStyles, tokens, Tooltip } from "@fluentui/react-components";
import {
  WalletRegular,
  SettingsRegular,
  BoxRegular,
  ClipboardTaskListLtrRegular,
} from "@fluentui/react-icons";

const NAV_WIDTH = 200;

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    width: `${NAV_WIDTH}px`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke3}`,
    flexShrink: 0,
    overflowY: "auto",
    overflowX: "hidden",
  },
  brand: {
    padding: "16px 12px 8px 12px",
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  navGroup: {
    listStyle: "none",
    margin: 0,
    padding: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 12px",
    height: "36px",
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
    border: "none",
    background: "none",
    width: "100%",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    position: "relative",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    "::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: "6px",
      bottom: "6px",
      width: "3px",
      borderRadius: "2px",
      backgroundColor: tokens.colorBrandForeground1,
    },
  },
  navIcon: {
    flexShrink: 0,
    width: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    overflow: "auto",
    backgroundColor: "#F5F5F5",
    display: "flex",
    flexDirection: "column",
  },
});

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Budget", path: "/", icon: <WalletRegular fontSize={18} /> },
  { label: "Rules", path: "/rules", icon: <SettingsRegular fontSize={18} /> },
  { label: "Inventory", path: "/inventory", icon: <BoxRegular fontSize={18} /> },
  { label: "Orders", path: "/orders", icon: <ClipboardTaskListLtrRegular fontSize={18} /> },
];

export const Layout: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className={styles.root}>
      <nav className={styles.sidebar} role="navigation" aria-label="Main navigation">
        <div className={styles.brand}>Swag Admin</div>
        <ul className={styles.navGroup}>
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <Tooltip content={item.label} relationship="label" positioning="after">
                <button
                  className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ""}`}
                  onClick={() => navigate(item.path)}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles.content} role="main">
        <Outlet />
      </main>
    </div>
  );
};
