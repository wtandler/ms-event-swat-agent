import { createHashRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { BudgetDashboard } from "@/pages/BudgetDashboard";
import { RulesEditor } from "@/pages/RulesEditor";
import { InventoryManagement } from "@/pages/InventoryManagement";
import { Orders } from "@/pages/Orders";

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <BudgetDashboard /> },
      { path: "rules", element: <RulesEditor /> },
      { path: "inventory", element: <InventoryManagement /> },
      { path: "orders", element: <Orders /> },
    ],
  },
]);
