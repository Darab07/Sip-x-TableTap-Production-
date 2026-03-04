import type { PropsWithChildren } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TableConfigProvider } from "@/hooks/useTableConfig";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <TooltipProvider>
    <TableConfigProvider>{children}</TableConfigProvider>
  </TooltipProvider>
);
