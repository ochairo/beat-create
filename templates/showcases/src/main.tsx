import { render } from "@ochairo/beat";
import { App } from "./App";
import "./styles/reset.css";
import "./styles/global.css";

const root = document.getElementById("app");

if (root === null) {
  throw new Error("Root element #app not found");
}

render(root, <App />);
