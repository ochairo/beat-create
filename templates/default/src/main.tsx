import { createRoot } from "@ochairo/beat";
import { App } from "./App";
import "./styles.css";

const target = document.getElementById("app");

if (!(target instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

createRoot(target).render(<App />);
