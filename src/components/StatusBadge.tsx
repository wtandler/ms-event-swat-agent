import React from "react";
import { Badge } from "@fluentui/react-components";
import type { EventStatus } from "@/types";

const STATUS_CONFIG: Record<EventStatus, { color: "brand" | "success" | "warning" | "danger" | "informative"; label: string }> = {
  draft: { color: "informative", label: "Draft" },
  confirmed: { color: "brand", label: "Confirmed" },
  amended: { color: "warning", label: "Amended" },
  ordered: { color: "success", label: "Ordered" },
  cancelled: { color: "danger", label: "Cancelled" },
};

interface StatusBadgeProps {
  status: EventStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge appearance="filled" color={config.color}>
      {config.label}
    </Badge>
  );
};
