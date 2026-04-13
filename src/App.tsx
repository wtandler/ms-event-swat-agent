import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

export const App: React.FC = () => (
  <FluentProvider theme={webLightTheme}>
    <RouterProvider router={router} />
  </FluentProvider>
);
