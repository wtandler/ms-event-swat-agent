import React from "react";
import { tokens, Tooltip } from "@fluentui/react-components";
import {
  CheckmarkCircleRegular,
  WarningRegular,
  ErrorCircleRegular,
} from "@fluentui/react-icons";
import type { SwagItem } from "@/types";
import { getStockLevel, getStockPct } from "@/types";

interface StockIndicatorProps {
  item: SwagItem;
}

export const StockIndicator: React.FC<StockIndicatorProps> = ({ item }) => {
  const level = getStockLevel(item);
  const pct = getStockPct(item);
  const label = `${pct}% available`;

  const config = {
    healthy: { icon: <CheckmarkCircleRegular />, color: tokens.colorPaletteGreenForeground1 },
    low: { icon: <WarningRegular />, color: tokens.colorPaletteYellowForeground1 },
    critical: { icon: <ErrorCircleRegular />, color: tokens.colorPaletteRedForeground1 },
  }[level];

  return (
    <Tooltip content={label} relationship="label">
      <span
        style={{ color: config.color, display: "inline-flex", alignItems: "center", gap: 4 }}
        role="img"
        aria-label={label}
      >
        {config.icon}
        <span style={{ fontSize: 12 }}>{pct}%</span>
      </span>
    </Tooltip>
  );
};
