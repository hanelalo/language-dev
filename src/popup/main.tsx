import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./App";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
