/**
 * Forma API client — typed wrapper over fetch.
 *
 *   import { api, auth } from "@/api";
 *   await auth.login("alex@forma.app", "forma1234");
 *   const dash = await api.dashboard();
 *
 * Handles: bearer auth, one automatic refresh + retry on 401, the error envelope,
 * and 204 responses. Framework-agnostic — wrap calls in React Query / SWR as you like.
 */
import type * as T from "./types";

const BASE_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_API_URL ??
  "http://localhost:4000/api/v1";

// ── token store ─────────────────────────────────────────────────────────────
// Bearer model: a short-lived access token + an opaque, rotating refresh token.
// The API and web app are served from different origins (GitHub Pages ⇄ API
// host), which makes an HttpOnly refresh cookie a blocked third-party cookie in
// modern browsers — so the refresh token is held client-side. Every
// authenticated request carries an explicit `Authorization` header, so there is
// no ambient-credential / CSRF surface. Server-side, each session is a DB row
// that can be revoked (see backend middleware/auth.ts), which is the real
// control — a stolen token stops working the moment its session is revoked.
const ACCESS_KEY = "forma.access";
const REFRESH_KEY = "forma.refresh";

let accessToken: string | null = safeGet(ACCESS_KEY);
let refreshToken: string | null = safeGet(REFRESH_KEY);
let restoreAttempted = false;
const listeners = new Set<(authed: boolean) => void>();

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function persist() {
  try {
    accessToken ? localStorage.setItem(ACCESS_KEY, accessToken) : localStorage.removeItem(ACCESS_KEY);
    refreshToken ? localStorage.setItem(REFRESH_KEY, refreshToken) : localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* private mode — tokens stay in memory only */
  }
}
function setTokens(t: T.Tokens | null) {
  const was = !!accessToken;
  accessToken = t?.accessToken ?? null;
  refreshToken = t?.refreshToken ?? refreshToken ?? null; // refresh may be omitted on plain rotation errors
  if (!t) refreshToken = null;
  persist();
  if (was !== !!accessToken) for (const l of listeners) l(!!accessToken);
}

export const session = {
  isAuthenticated: () => !!accessToken,
  getRefreshToken: () => refreshToken,
  /** Re-establish auth state on app boot: refresh if we hold a refresh token. */
  async restore(): Promise<boolean> {
    restoreAttempted = true;
    if (accessToken) return true;
    if (!refreshToken) return false;
    return doRefresh();
  },
  hasRestored: () => restoreAttempted,
  /** Subscribe to auth changes (login / logout / refresh failure). */
  onChange(fn: (authed: boolean) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  clear: () => setTokens(null),
};

// ── error type ──────────────────────────────────────────────────────────────
export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, body: T.ApiError | undefined) {
    super(body?.error?.message ?? `HTTP ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body?.error?.code ?? "error";
    this.details = body?.error?.details;
  }
}

// ── core request ────────────────────────────────────────────────────────────
type Query = Record<string, string | number | boolean | undefined | null>;
interface Opts {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean; // default true
  _retry?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight)
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          setTokens(null);
          return false;
        }
        setTokens((await res.json()) as T.Tokens);
        return true;
      } catch {
        setTokens(null);
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  return refreshInFlight;
}

async function request<R>(path: string, opts: Opts = {}): Promise<R> {
  const { method = "GET", body, query, auth = true } = opts;

  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !opts._retry && (await doRefresh())) {
    return request<R>(path, { ...opts, _retry: true });
  }

  if (res.status === 204) return undefined as R;

  const payload = await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiRequestError(res.status, payload as T.ApiError);
  return payload as R;
}

const get = <R>(p: string, query?: Query) => request<R>(p, { query });
const post = <R>(p: string, body?: unknown, query?: Query) => request<R>(p, { method: "POST", body, query });
const put = <R>(p: string, body?: unknown) => request<R>(p, { method: "PUT", body });
const patch = <R>(p: string, body?: unknown) => request<R>(p, { method: "PATCH", body });
const del = <R>(p: string, body?: unknown) => request<R>(p, { method: "DELETE", body });

// ── auth ────────────────────────────────────────────────────────────────────
interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  rememberMe?: boolean;
}

export const auth = {
  async register(input: RegisterInput) {
    const s = await request<T.AuthSession>("/auth/register", { method: "POST", body: input, auth: false });
    setTokens(s);
    return s;
  },
  async login(email: string, password: string, rememberMe = false) {
    const s = await request<T.AuthSession>("/auth/login", {
      method: "POST",
      body: { email, password, rememberMe },
      auth: false,
    });
    setTokens(s);
    return s;
  },
  async social(provider: "apple" | "google", identityToken: string, name?: string, rememberMe = false) {
    const s = await request<T.AuthSession>(`/auth/social/${provider}`, {
      method: "POST",
      body: { identityToken, name, rememberMe },
      auth: false,
    });
    setTokens(s);
    return s;
  },
  forgotPassword: (email: string) =>
    request<{ ok: boolean; devToken?: string }>("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/auth/reset-password", { method: "POST", body: { token, password }, auth: false }),
  verifyEmail: (token: string) =>
    request<{ ok: boolean }>("/auth/verify-email", { method: "POST", body: { token }, auth: false }),
  resendVerification: () =>
    request<{ ok: boolean; alreadyVerified?: boolean; throttled?: boolean; devVerificationToken?: string }>(
      "/auth/resend-verification",
      { method: "POST" },
    ),
  async logout() {
    if (refreshToken)
      await request("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(() => {});
    setTokens(null);
  },
  async logoutAll() {
    await request("/auth/logout-all", { method: "POST" }).catch(() => {});
    setTokens(null);
  },
  me: () => get<T.User>("/auth/me"),
};

// ── the rest of the surface ─────────────────────────────────────────────────
export const api = {
  health: () => request<{ ok: boolean; ts: string }>("/health", { auth: false }),

  // config — appearance presets (auth optional; more presets when signed in)
  config: {
    appearancePresets: () => request<T.BackgroundPreset[]>("/config/appearance-presets", { auth: session.isAuthenticated() }),
    auth: () => request<T.AuthConfig>("/config/auth", { auth: false }),
  },

  // me
  me: {
    get: () => get<T.UserFull>("/me"),
    update: (p: T.ProfilePatch) => patch<T.User>("/me", p),
    onboarding: (p: T.OnboardingPayload) => post<{ ok: true }>("/me/onboarding", p),
    settings: () => get<T.SettingsBundle>("/me/settings"),
    updateSettings: (p: T.SettingsPatch) => put<T.SettingsBundle>("/me/settings", p),
    progression: {
      evaluate: () => post<T.ProgressionResult>("/me/progression/evaluate"),
      setGating: (gatingEnabled: boolean) => put<T.ProgressionResult>("/me/progression", { gatingEnabled }),
    },
    export: () => get<unknown>("/me/export"),
    deleteAccount: (password?: string) => del<void>("/me", { confirm: true, password }),

    // ── account & security ──
    changePassword: (currentPassword: string, newPassword: string) =>
      put<{ ok: true }>("/me/password", { currentPassword, newPassword }),
    changeEmail: (newEmail: string, currentPassword: string) =>
      post<{ ok: true; devToken?: string }>("/me/email/change", { newEmail, currentPassword }),
    confirmEmailChange: (token: string) =>
      post<{ ok: true; email: string }>("/me/email/change/confirm", { token }),
    sessions: () => get<T.SessionInfo[]>("/me/sessions"),
    revokeSession: (id: string) => del<void>(`/me/sessions/${id}`),
    revokeOtherSessions: () => del<{ ok: true; revoked: number }>("/me/sessions"),
    connectedAccounts: () => get<T.ConnectedAccounts>("/me/connected-accounts"),
    unlinkAccount: (provider: "google" | "apple") => del<void>(`/me/connected-accounts/${provider}`),
    injuries: () => get<T.InjuryNote[]>("/me/injuries"),
    addInjury: (tag: string, note?: string) => post<T.InjuryNote>("/me/injuries", { tag, note }),
    deleteInjury: (id: string) => del<void>(`/me/injuries/${id}`),
    equipment: () => get<Array<T.Equipment & { owned: boolean }>>("/me/equipment"),
    setEquipment: (equipmentKeys: string[]) => put<{ ok: true; count: number }>("/me/equipment", { equipmentKeys }),
    devices: () => get<T.DeviceConnection[]>("/me/devices"),
    setDevice: (provider: string, status: "connected" | "disconnected") =>
      put<T.DeviceConnection>(`/me/devices/${provider}`, { status }),
    connectDevice: (provider: "whoop" | "oura" | "garmin") =>
      get<{ provider: string; configured: boolean; status?: string; message?: string; authorizeUrl?: string }>(
        `/me/devices/${provider}/connect`,
      ),
    syncDevice: (provider: string) => post<{ ingested: number }>(`/me/devices/${provider}/sync`),
    disconnectDevice: (provider: string) => del<void>(`/me/devices/${provider}`),
    ingestHealthSamples: (body: T.HealthSamplesInput) =>
      post<{ received: number; ingested: number; deduped: number }>("/me/health/samples", body),
  },

  // trainer
  trainer: {
    get: () => get<T.Trainer>("/trainer"),
    update: (p: T.TrainerPatch) => patch<T.Trainer>("/trainer", p),
    applyPersonality: (storeItemId: string) => post<T.Trainer>(`/trainer/apply-personality/${storeItemId}`),
    insights: () => get<T.CoachingInsight[]>("/trainer/insights"),
    generateInsights: () => post<T.CoachingInsight[]>("/trainer/insights/generate"),
    dismissInsight: (id: string) => post<{ ok: true }>(`/trainer/insights/${id}/dismiss`),
    checkIn: () => get<T.CheckIn>("/trainer/check-in"),
    respondCheckIn: (topic: string, answer: string) => post<{ ok: true }>("/trainer/check-in/respond", { topic, answer }),
    catalogue: () => get<T.TrainerCatalogue>("/trainer/catalogue"),
  },

  // library
  library: {
    muscleGroups: () => get<T.MuscleGroup[]>("/library/muscle-groups"),
    muscleGroupExercises: (key: string) =>
      get<{ muscleGroup: T.MuscleGroup; exercises: T.Exercise[] }>(`/library/muscle-groups/${key}/exercises`),
    exercises: (q?: {
      q?: string; muscle?: string; equipment?: string; camera?: "true" | "false"; take?: number; skip?: number;
    }) => get<{ items: T.Exercise[]; total: number }>("/library/exercises", q),
    exercise: (slug: string) => get<T.ExerciseDetail>(`/library/exercises/${slug}`),
    exerciseHistory: (slug: string, take?: number) => get<T.ExerciseHistory>(`/library/exercises/${slug}/history`, { take }),
  },

  // workouts
  workouts: {
    list: (q?: { template?: "true" | "false"; from?: string; to?: string }) => get<T.Workout[]>("/workouts", q),
    get: (id: string) => get<T.Workout>(`/workouts/${id}`),
    create: (input: T.WorkoutInput) => post<T.Workout>("/workouts", input),
    update: (id: string, input: Partial<T.WorkoutInput>) => put<T.Workout>(`/workouts/${id}`, input),
    remove: (id: string) => del<void>(`/workouts/${id}`),
    duplicate: (id: string, opts?: { name?: string; asTemplate?: boolean; scheduledDate?: string }) =>
      post<T.Workout>(`/workouts/${id}/duplicate`, opts ?? {}),
    generate: (input: T.GenerateWorkoutInput) =>
      post<T.GeneratedPlan | T.Workout>("/workouts/generate", input),
    swapSuggestions: (body: { exerciseSlug: string; reason?: string; equipmentKeys?: string[] }) =>
      post<T.SwapSuggestionsResult>("/workouts/swap-suggestions", body),
  },

  // programs
  programs: {
    list: () => get<T.Program[]>("/programs"),
    get: (id: string) => get<T.Program>(`/programs/${id}`),
    week: (id: string, n: number) => get<T.ProgramDay[]>(`/programs/${id}/week/${n}`),
    generate: (input: T.GenerateProgramInput) => post<T.Program>("/programs/generate", input),
    activate: (id: string) => post<{ ok: true }>(`/programs/${id}/activate`),
    schedule: (id: string, weekIndex: number, startDate: string) =>
      post<{ scheduled: number; workouts: T.Workout[] }>(`/programs/${id}/schedule`, { weekIndex, startDate }),
    resolvedSchedule: (id: string) => get<T.ProgramSchedule>(`/programs/${id}/schedule`),
    remove: (id: string) => del<void>(`/programs/${id}`),
  },

  // sessions
  sessions: {
    list: (q?: { status?: T.SessionStatus; take?: number }) => get<T.WorkoutSession[]>("/sessions", q),
    get: (id: string) => get<T.WorkoutSession>(`/sessions/${id}`),
    start: (body: { workoutId?: string; name?: string; trackingMode?: T.TrackingMode }) =>
      post<T.WorkoutSession>("/sessions", body),
    addPerformance: (sessionId: string, exerciseId: string, order: number) =>
      post<T.ExercisePerformance>(`/sessions/${sessionId}/performances`, { exerciseId, order }),
    logSet: (sessionId: string, perfId: string, setNumber: number, input: T.SetLogInput) =>
      put<T.ExerciseSet>(`/sessions/${sessionId}/performances/${perfId}/sets/${setNumber}`, input),
    deleteSet: (sessionId: string, perfId: string, setNumber: number) =>
      del<void>(`/sessions/${sessionId}/performances/${perfId}/sets/${setNumber}`),
    formAnalysis: (sessionId: string, body: T.FormAnalysisInput) =>
      post<{ ok: true; reps: number }>(`/sessions/${sessionId}/form-analysis`, body),
    finish: (sessionId: string, body?: { durationSeconds?: number; caloriesEstimate?: number }) =>
      post<T.WorkoutSession>(`/sessions/${sessionId}/finish`, body ?? {}),
    abandon: (sessionId: string) => post<T.WorkoutSession>(`/sessions/${sessionId}/abandon`),
  },

  // body
  body: {
    muscleMap: (range: "today" | "week" | "month" = "week") => get<T.MuscleMap>("/body/muscle-map", { range }),
    balance: () => get<T.MuscleBalance>("/body/balance"),
    muscle: (key: string, days?: number) => get<T.MuscleDetail>(`/body/muscle/${key}`, { days }),
  },

  // progress
  progress: {
    metrics: (q?: { type?: string; key?: string; days?: number }) => get<T.ProgressMetric[]>("/progress/metrics", q),
    addMetric: (input: T.ProgressMetricInput) => post<T.ProgressMetric>("/progress/metrics", input),
    measurements: () => get<T.BodyMeasurement[]>("/progress/measurements"),
    addMeasurement: (input: T.BodyMeasurementInput) => post<T.BodyMeasurement>("/progress/measurements", input),
    personalRecords: () => get<T.PersonalRecord[]>("/progress/personal-records"),
    strength: (slug: string, days?: number) => get<T.StrengthSeries>(`/progress/strength/${slug}`, { days }),
    overview: () => get<T.ProgressOverview>("/progress/overview"),
    readiness: () => get<T.ReadinessBreakdown>("/progress/readiness"),
    consistency: (weeks?: number) => get<T.ConsistencyReport>("/progress/consistency", { weeks }),
    checkin: (body: T.RecoveryCheckinInput) =>
      post<{ checkin: T.RecoveryCheckin; readiness: T.ReadinessBreakdown }>("/progress/checkin", body),
    checkins: () => get<T.RecoveryCheckin[]>("/progress/checkin"),
    nutrition: (date?: string) => get<T.NutritionDay>("/progress/nutrition", { date }),
    nutritionSummary: (days?: number) => get<{ days: T.NutritionDayTotals[] }>("/progress/nutrition/summary", { days }),
    addNutrition: (body: T.NutritionEntryInput) =>
      post<{ entry: T.NutritionEntry; totals: T.NutritionTotals }>("/progress/nutrition", body),
    deleteNutrition: (id: string) => del<void>(`/progress/nutrition/${id}`),
    formTrends: (q?: { slug?: string; days?: number }) => get<T.FormTrends>("/progress/form-trends", q),
    photos: () => get<T.ProgressPhoto[]>("/progress/photos"),
    registerPhoto: (body: { poseTag?: T.PhotoPose; takenAt?: string; contentType?: string }) =>
      post<T.ProgressPhotoUpload>("/progress/photos", body),
    deletePhoto: (id: string) => del<void>(`/progress/photos/${id}`),
    comparePhotos: (a: string, b: string) =>
      get<{ a: T.ProgressPhoto; b: T.ProgressPhoto }>("/progress/photos/compare", { a, b }),
    report: (days?: number) => get<unknown>("/progress/report", { days }),
    trainingLoad: () => get<{ ctl: number; atl: number; tsb: number; status: string; weeklyTrimp: number[] }>("/progress/training-load"),
    nutritionCorrelation: () => get<{ correlation: number; interpretation: string; weeks: { week: string; avgProteinG: number; totalVolumeKg: number }[]; insufficient_data?: boolean }>("/progress/nutrition-correlation"),
    patterns: () => get<{ insight: string | null; bestDay: string | null; bestTimeWindow: string | null; adherenceByDay: { day: string; sessions: number; completionRate: number }[]; circadian: { label: string; sessions: number; avgVolumeKg: number; relativePerformance: number }[]; insufficient_data?: boolean }>("/progress/patterns"),
    cohort: (exercise: string) => get<{ percentile?: number; yourE1rm?: number; cohortSize: number; insufficient_data?: boolean; no_pr?: boolean }>("/progress/cohort", { exercise }),
  },

  // food logging & nutrition tracking
  food: {
    attribution: () => get<T.FoodAttribution>("/food/attribution"),
    search: (q: string) => get<T.FoodSearchResponse>("/food/search", { q }),
    barcode: (code: string, image?: string) =>
      image
        ? post<T.BarcodeResponse>(`/food/barcode/${encodeURIComponent(code)}`, { image })
        : get<T.BarcodeResponse>(`/food/barcode/${encodeURIComponent(code)}`),
    item: (source: T.FoodSource, sourceId: string) =>
      get<T.Food>(`/food/item/${source}/${encodeURIComponent(sourceId)}`),
    customs: () => get<T.Food[]>("/food/custom"),
    createCustom: (body: T.CustomFoodInput) => post<T.Food>("/food/custom", body),
    deleteCustom: (sourceId: string) => del<void>(`/food/custom/${encodeURIComponent(sourceId)}`),
    day: (date?: string) => get<T.FoodDay>("/food/log", { date }),
    log: (body: T.FoodLogInput) => post<T.FoodDayResult>("/food/log", body),
    updateLog: (id: string, body: T.FoodLogPatch) => patch<T.FoodDayResult>(`/food/log/${id}`, body),
    deleteLog: (id: string) => del<{ ok: true; day: T.FoodDay }>(`/food/log/${id}`),
    recent: (limit?: number) => get<T.RecentFood[]>("/food/recent", { limit }),
    favorites: () => get<T.FavoriteFood[]>("/food/favorites"),
    addFavorite: (source: T.FoodSource, sourceId: string) =>
      post<T.FavoriteFood>("/food/favorites", { source, sourceId }),
    removeFavorite: (id: string) => del<void>(`/food/favorites/${id}`),
    goal: () => get<T.NutritionGoalRow | null>("/food/goal"),
    setGoal: (body: T.NutritionGoalInput) => put<T.NutritionGoalRow>("/food/goal", body),
    copy: (body: { fromDate: string; toDate: string; meal?: T.MealType; toMeal?: T.MealType }) =>
      post<{ copied: number; day: T.FoodDay }>("/food/copy", body),
    summary: (days?: number) => get<{ days: (T.FoodNutrients & { date: string })[] }>("/food/summary", { days }),
  },

  // goals
  goals: {
    list: () => get<T.GoalWithProgress[]>("/goals"),
    upsert: (input: T.GoalInput) => post<T.Goal>("/goals", input),
    log: (id: string, value: number, mode: "set" | "increment" = "set") =>
      post<T.GoalWithProgress>(`/goals/${id}/log`, { value, mode }),
    remove: (id: string) => del<void>(`/goals/${id}`),
  },

  // store
  store: {
    wallet: () => get<T.WalletSummary>("/store/wallet"),
    earn: (amount: number, label: string) => post<T.Wallet>("/store/wallet/earn", { amount, label }),
    items: (category?: T.StoreCategory) => get<T.StoreItem[]>("/store/items", { category }),
    buy: (id: string) => post<{ item: unknown; balance: number }>(`/store/items/${id}/buy`),
    equip: (id: string) => post<{ ok: true }>(`/store/items/${id}/equip`),
  },

  // cosmetic customization (themes / accents / effects / avatar / chat / profile)
  customization: {
    get: () => get<T.CustomizationState>("/customization"),
    buy: (itemId: string) => post<T.CustomizationState>("/customization/buy", { itemId }),
    equip: (itemId: string) => post<T.CustomizationState>("/customization/equip", { itemId }),
    setSlot: (slot: string, itemId: string) =>
      post<T.CustomizationState>("/customization/slot", { slot, itemId }),
  },

  // chat
  chat: {
    history: (q?: { take?: number; before?: string }) => get<T.ChatMessage[]>("/chat", q),
    send: (content: string) => post<T.ChatTurn>("/chat", { content }),
    sendVoice: (transcript: string) => post<T.ChatTurn>("/chat/voice", { transcript }),
    applyAction: (messageId: string) => post<{ ok: true; result: unknown }>(`/chat/messages/${messageId}/apply`),
    clear: () => del<void>("/chat"),
    suggestedPrompts: () => get<string[]>("/chat/suggested-prompts"),
  },

  // notifications
  notifications: {
    list: (q?: { unread?: "true" | "false"; take?: number }) => get<T.NotificationList>("/notifications", q),
    markRead: (id: string) => post<{ ok: true }>(`/notifications/${id}/read`),
    markAllRead: () => post<{ ok: true }>("/notifications/read-all"),
    remove: (id: string) => del<void>(`/notifications/${id}`),
    preferences: () => get<T.NotificationPreference>("/notifications/preferences"),
    updatePreferences: (p: Partial<T.NotificationPreference>) =>
      put<T.NotificationPreference>("/notifications/preferences", p),
  },

  // achievements
  achievements: {
    list: () => get<T.AchievementProgress[]>("/achievements"),
    evaluate: () => post<{ ok: true; progression: T.ProgressionResult | null }>("/achievements/evaluate"),
  },

  // subscription
  subscription: {
    plans: () => get<T.Plan[]>("/subscription/plans"),
    get: () => get<T.SubscriptionState>("/subscription"),
    validateReceipt: (body: { store: "app_store" | "play_store"; receipt: string; plan: "pro_monthly" | "pro_annual" }) =>
      post<T.Subscription>("/subscription/validate-receipt", body),
    cancel: () => post<T.Subscription>("/subscription/cancel"),
  },

  // dashboard
  dashboard: () => get<T.Dashboard>("/dashboard"),
};
