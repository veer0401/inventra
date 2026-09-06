import React from "react";
import ReactDOM from "react-dom/client";
import { App, WebRuntimeAdapter } from "@inventra/app";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const webRuntime = new WebRuntimeAdapter();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App runtime={webRuntime} />
  </React.StrictMode>
);
