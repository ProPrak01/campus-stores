import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

async function start() {
  // GitHub Pages build: answer /api calls in the browser (see static-mode.ts).
  if (import.meta.env.VITE_STATIC) await import("./static-mode");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void start();
