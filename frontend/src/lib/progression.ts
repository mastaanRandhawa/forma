/**
 * Training progression + rewards — read from the server (GET /rewards/state).
 *
 *   • Weekly streak — consecutive weeks on your session target. Rest days never
 *     break it, one missed week per 4 is forgiven, and streak shields cover more.
 *   • Rank — from training alone (sessions + weeks on target, last 52 weeks).
 *   • Coins — granted by the server from what you did; the app never sends an
 *     amount. Quests, shields, pledges and weekly deals all live on the server.
 */
import { api } from "../api/client";
import { useResource } from "../api/hooks";
import { usePrefs } from "../api/settings";
import type { RewardsState } from "../api/types";

/** Full rewards state. The check-in quest swaps out when manual check-ins are off. */
export function useRewards() {
  const checkinsEnabled = usePrefs().recovery.manualCheckins;
  const res = useResource<RewardsState>(`rewards:${checkinsEnabled}`, () => api.rewards.state(checkinsEnabled));
  return Object.assign(res, { checkinsEnabled });
}
