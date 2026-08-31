import { API_ENABLED } from "../api/hooks";
import OfflineNutrition from "../components/nutrition/OfflineNutrition";
import FoodLog from "../components/nutrition/FoodLog";

/**
 * Nutrition — the food logger.
 *
 * With a backend (`VITE_API_URL` set) this is the full food-logging system:
 * search (USDA), barcode scan (Open Food Facts), serving selection, meal
 * sections, daily goals, recent / favorites / custom foods, history and
 * copy-day. Without a backend it degrades to the local quick-log flow, since
 * the external food data sources have to be proxied server-side.
 */
export default function Nutrition() {
  return API_ENABLED ? <FoodLog /> : <OfflineNutrition />;
}
