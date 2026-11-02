/**
 * profileSync — API build: the server's user record is the source of truth
 * for the training profile.
 *
 * Onboarding and the Training Profile screen write through to the API, but the
 * app reads `profile` from the local store, which sign-out wipes. Without this,
 * signing back in (or opening another browser) silently fell back to the
 * defaults — including "lb", so a metric lifter's kg went in as pounds.
 *
 * Server values win; a field the server has no value for keeps the local one.
 * Fields the server doesn't store (preferred days) stay local.
 */
import { api } from "../api/client";
import type { FitnessGoal, User, UserFull } from "../api/types";
import { loadData, mergeProfile, resetLocalData, type Profile, type Units } from "./localStore";
import { EQUIPMENT_API_KEY, GOAL_TO_API, LB_TO_KG } from "./profileOptions";

const API_TO_GOAL: Partial<Record<FitnessGoal, string>> = {
  build_muscle: "muscle",
  lose_fat: "lose",
  get_stronger: "strength",
  general_fitness: "fitness",
  maintain: "maintain",
};

const LABEL_FOR_KEY = Object.fromEntries(Object.entries(EQUIPMENT_API_KEY).map(([label, key]) => [key, label]));

export function profileFromUser(u: User, current: Profile): Partial<Profile> {
  const p: Partial<Profile> = {};
  // the login response is a slim user without these fields — absent isn't "imperial"
  if (u.unitPreference) p.units = u.unitPreference === "metric" ? "kg" : "lb";
  const units: Units = p.units ?? current.units;
  if (u.name) p.name = u.name;
  // "sleep" and "fitness" both map to general_fitness, so keep the local pick when it agrees
  if (u.fitnessGoal && GOAL_TO_API[current.goal ?? ""] !== u.fitnessGoal) {
    const goal = API_TO_GOAL[u.fitnessGoal];
    if (goal) p.goal = goal;
  }
  if (u.experienceLevel) p.experience = u.experienceLevel;
  if (u.trainingFrequencyTarget) p.daysPerWeek = u.trainingFrequencyTarget;
  if (u.sessionLengthTargetMin) p.sessionMin = u.sessionLengthTargetMin;
  if (u.trainingLocation) p.environment = u.trainingLocation;
  if (u.weightKg) p.bodyweight = Math.round((units === "kg" ? u.weightKg : u.weightKg / LB_TO_KG) * 10) / 10;
  if (u.onboardingCompletedAt) p.onboardedAt = u.onboardingCompletedAt;
  return p;
}

function equipmentAndInjuries(u: UserFull, current: Profile): Partial<Profile> {
  const p: Partial<Profile> = {};
  const labels = u.equipment.map((e) => LABEL_FOR_KEY[e.equipment.key]).filter((l): l is string => Boolean(l));
  if (labels.length) {
    // keep local-only options (pull-up bar) the server can't hold
    const localOnly = current.equipment.filter((l) => !EQUIPMENT_API_KEY[l]);
    p.equipment = [...labels, ...localOnly];
  }
  const injuries = u.injuries.filter((i) => i.active).map((i) => i.tag);
  if (injuries.length) p.injuries = injuries.join("; ");
  return p;
}

/**
 * Bring the local profile in line with the signed-in user. Whatever `u`
 * carries applies synchronously, before the app renders — session restore's
 * `/auth/me` is the full record, but sign-in returns a slim user — and the
 * rest (plus equipment and injuries) follows from `GET /me`.
 */
export function hydrateProfile(u: User): void {
  const owner = loadData().owner;
  if (owner && owner !== u.id) resetLocalData();
  mergeProfile(profileFromUser(u, loadData().profile), u.id);
  void api.me
    .get()
    .then((full) => {
      if (loadData().owner !== u.id) return; // signed out meanwhile
      const current = loadData().profile;
      mergeProfile({ ...profileFromUser(full, current), ...equipmentAndInjuries(full, current) }, u.id);
    })
    .catch(() => {
      /* offline — keep what we have */
    });
}
