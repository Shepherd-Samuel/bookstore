import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Preload critical images (logo for loader & sidebar)
const preloadImages = ["/src/assets/logo.png"];
preloadImages.forEach((src) => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = new URL(src, import.meta.url).href;
  document.head.appendChild(link);
});

createRoot(document.getElementById("root")!).render(<App />);
