import { App as SharedApp, DesktopRuntimeAdapter } from "@inventra/app";

const desktopRuntime = new DesktopRuntimeAdapter();

export function App() {
  return <SharedApp runtime={desktopRuntime} />;
}
