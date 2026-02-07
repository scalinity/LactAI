import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

// Catch unhandled promise rejections globally
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontFamily: "DM Sans, sans-serif",
            background: "#3D2C3E",
            color: "#FFF8F0",
            borderRadius: "12px",
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
