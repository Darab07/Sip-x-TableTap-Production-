import { Switch, Route, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { AnimatePresence, motion } from "framer-motion";
import Menu from "@/pages/menu";
import Checkout from "@/pages/checkout";
import Admin from "@/pages/admin";
import React from "react";

function Router() {
  const [location] = useLocation();
  
  // Get table configuration from localStorage
  const getTableConfig = () => {
    try {
      const savedTables = localStorage.getItem('tableConfig');
      if (savedTables) {
        return JSON.parse(savedTables);
      }
    } catch (error) {
      console.error('Error loading table config:', error);
    }
    return [];
  };

  const tables = getTableConfig();
  const activeTables = tables.filter((table: any) => table.isActive);

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        {/* Dynamic routes based on active tables */}
        {activeTables.map((table: any) => (
          <React.Fragment key={table.id}>
            <Route path={`/Crusteez/${table.name}/home`} component={Home} />
            <Route path={`/Crusteez/${table.name}/menu`} component={Menu} />
            <Route path={`/Crusteez/${table.name}/checkout/:type`} component={Checkout} />
          </React.Fragment>
        ))}
        
        <Route path="/Crusteez/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  );
}

export default App;
