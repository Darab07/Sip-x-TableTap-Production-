import React from "react";
import AppRouter from "@/routes/app-router";
import { AppProviders } from "@/providers/app-providers";

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
