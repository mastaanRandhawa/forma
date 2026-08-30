import { createContext, useContext } from "react";
import type { Dashboard } from "./types";

/**
 * Dashboard aggregate, provided by the Home page. Child cards read it here and
 * fall back to their local mock when rendered outside a provider.
 */
const DashboardContext = createContext<Dashboard | null>(null);

export const DashboardProvider = DashboardContext.Provider;
export const useDashboardData = () => useContext(DashboardContext);
