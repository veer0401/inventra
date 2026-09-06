import { App as SharedApp, WebRuntimeAdapter } from "@inventra/app";

const webRuntime = new WebRuntimeAdapter();

export function App() {
  return <SharedApp runtime={webRuntime} />;
}
