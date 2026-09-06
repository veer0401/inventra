import React from "react";
import ReactDOM from "react-dom/client";
import { App, DesktopRuntimeAdapter } from "@inventra/app";
import "./index.css";

const desktopRuntime = new DesktopRuntimeAdapter();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App runtime={desktopRuntime} />
  </React.StrictMode>
);

