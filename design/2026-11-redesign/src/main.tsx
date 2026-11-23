import React from "react";
import { createRoot } from "react-dom/client";
import { Experience } from "./components/generated/Experience";
createRoot(document.getElementById("root")!).render(<Experience desktop={location.pathname.endsWith("web.html")} />);
