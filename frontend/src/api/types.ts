/**
 * Forma API — DTOs.  Hand-kept in sync with backend/openapi.yaml.
 * When the backend changes the contract, regenerate/adjust this file.
 *
 * Conventions: metric units (kg / cm), ISO-8601 UTC date strings, opaque CUID ids,
 * form scores & readiness 0–100, muscle activation 0–1, RPE 1–10.
 */

// ── shared ──────────────────────────────────────────────────────────────────
export type ISODate = string;

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface Tokens {
  accessToken: string;
  /** Only returned to native clients (X-Client-Platform: native). Web uses the httpOnly cookie. */
  refreshToken?: string;
}
export interface AuthSession extends Tokens {
  user: User;
  /** dev-only convenience: the email-verification token, when NODE_ENV !== production */
  devVerificationToken?: string;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "account_locked"
  | "account_inactive"
  | "email_not_verified"
  | "session_expired"
  | "csrf_failed"
  | "too_many_requests"
  | "token_invalid"
  | "token_expired"
  | "reset_link_expired"
  | "no_password"
  | "last_credential"
  | "conflict"
  | "bad_request";

export interface SessionInfo {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  createdAt: ISODate;
  lastSeenAt: ISODate;
  expiresAt: ISODate;
}

export interface ConnectedAccounts {
  password: boolean;
  google: boolean;
  apple: boolean;
}

export interface AuthConfig {
  providers: { google: boolean; apple: boolean };
  googleClientId: string | null;
  appleClientId: string | null;
  passwordPolicy: { minLength: number; classesRequired: number };
}

// ── enums ───────────────────────────────────────────────────────────────────
export type UnitPreference = "metric" | "imperial";
export type FitnessGoal =
  | "build_muscle" | "lose_fat" | "get_stronger" | "general_fitness" | "athletic_performance" | "maintain";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TrainingLocation = "gym" | "home" | "both";
export type MuscleRegion = "upper" | "lower" | "core";
export type MuscleRole = "primary" | "secondary" | "stabilizer";
export type WorkoutSource = "ai_generated" | "manual" | "template" | "program";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type TrackingMode = "camera" | "manual";
export type PersonalRecordType = "max_weight" | "max_1rm_estimate" | "max_reps" | "max_volume";
export type ProgressMetricType =
  | "bodyweight" | "measurement" | "form_score_aggregate" | "volume_aggregate"
  | "readiness" | "sleep" | "hrv" | "resting_hr" | "steps" | "protein" | "calories";
export type ProgressMetricSource = "manual_entry" | "health_sync" | "computed";
export type PhotoPose = "front" | "side" | "back";
export type ChatRole = "user" | "trainer";
export type GoalCadence = "daily" | "weekly";
export type StoreCategory = "voice" | "personality" | "look" | "theme";
export type FormDataVerbosity = "minimal" | "categorical" | "detailed";
export type InsightCategory = "recovery" | "volume" | "form" | "consistency" | "nutrition" | "strength";
export type SupersetType = "straight" | "superset" | "circuit";
export type NotificationType =
  | "trainer_message" | "reminder" | "milestone" | "pr" | "check_in" | "weekly_summary";
export type SubscriptionStatus = "active" | "inactive" | "grace" | "cancelled";

// ── user / trainer ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  authProvider: "email" | "apple" | "google";
  unitPreference: UnitPreference;
  weekStartsMonday: boolean;
  dateOfBirth: ISODate | null;
  biologicalSex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  fitnessGoal: FitnessGoal | null;
  experienceLevel: ExperienceLevel | null;
  trainingLocation: TrainingLocation | null;
  trainingFrequencyTarget: number | null;
  sessionLengthTargetMin: number | null;
  onboardingCompletedAt: ISODate | null;
  emailVerified: boolean;
  emailVerifiedAt?: ISODate | null;
  role: "user" | "admin";
  formDataVerbosity: FormDataVerbosity;
  saveHighlightClips: boolean;
  createdAt: ISODate;
  trainer?: Trainer;
  wallet?: Wallet;
}

export interface UserFull extends User {
  subscription: Subscription;
  notificationPrefs: NotificationPreference;
  injuries: InjuryNote[];
  equipment: Array<{ equipment: Equipment }>;
  deviceConnections: DeviceConnection[];
}

export interface ProfilePatch {
  name?: string;
  dateOfBirth?: ISODate;
  biologicalSex?: "male" | "female" | "other" | "prefer_not_to_say";
  heightCm?: number;
  weightKg?: number;
  unitPreference?: UnitPreference;
  weekStartsMonday?: boolean;
  fitnessGoal?: FitnessGoal;
  experienceLevel?: ExperienceLevel;
  trainingLocation?: TrainingLocation;
  trainingFrequencyTarget?: number;
  sessionLengthTargetMin?: number;
}

export interface OnboardingPayload extends ProfilePatch {
  trainer?: TrainerPatch;
  equipmentKeys?: string[];
  injuries?: Array<{ tag: string; note?: string }>;
  /** calmMode → quiet widgets + reduced motion + gating on; false → power-user defaults. */
  experience?: { calmMode?: boolean; startTier?: Tier };
}

// ── settings bundle (GET/PUT /me/settings) ──────────────────────────────────
export type DisclosureMode = "always" | "on_interaction";

export interface BackgroundGradient {
  angle: number;
  stops: Array<{ color: string; at: number }>;
}
export interface GlassSettings {
  opacity: number; // 0.35..0.95
  blurPx: number; // 0..40
  tint: string;
}
export interface AppearanceSettings {
  presetId: string | null;
  backgroundMode: "solid" | "gradient" | "image";
  backgroundColor: string;
  backgroundGradient: BackgroundGradient | null;
  backgroundImageUrl: string | null;
  backgroundDim: number; // 0..1
  glass: GlassSettings;
  accentColor: string; // resolved — brand default when unset
  reduceMotion: boolean;
  updatedAt: ISODate;
}
export interface DisclosureSettings {
  mode: DisclosureMode;
  widgetOverrides: Record<string, DisclosureMode>;
}
export interface CameraSettings {
  formDataVerbosity: FormDataVerbosity;
  saveHighlightClips: boolean;
}
export interface UnitSettings {
  unitPreference: UnitPreference;
  weekStartsMonday: boolean;
}
export interface ProgressionState {
  tier: Tier;
  unlockedFeatures: FeatureKey[];
  gatingEnabled: boolean;
  nextUnlock: NextUnlock | null;
}
/**
 * Frontend-owned preference slice. The backend `SettingsBundle` has no home for
 * these yet, so they are always persisted to localStorage (see `api/settings`)
 * and preserved across the initial server fetch.
 */
export interface LocalPrefs {
  camera: { formTracking: boolean };
  recovery: { manualCheckins: boolean; promptBeforeFirstWorkout: boolean };
  research: { anonFormData: boolean };
  notifications: {
    workoutReminders: boolean;
    trainerCheckins: boolean;
    milestones: boolean;
    weeklyDigest: boolean;
  };
}
export interface SettingsBundle {
  camera: CameraSettings;
  units: UnitSettings;
  appearance: AppearanceSettings;
  disclosure: DisclosureSettings;
  progression: ProgressionState;
  prefs: LocalPrefs;
}
export interface SettingsPatch {
  camera?: Partial<CameraSettings>;
  units?: Partial<UnitSettings>;
  prefs?: {
    camera?: Partial<LocalPrefs["camera"]>;
    recovery?: Partial<LocalPrefs["recovery"]>;
    research?: Partial<LocalPrefs["research"]>;
    notifications?: Partial<LocalPrefs["notifications"]>;
  };
  appearance?: Partial<{
    presetId: string | null;
    backgroundMode: "solid" | "gradient" | "image";
    backgroundColor: string;
    backgroundGradient: BackgroundGradient | null;
    backgroundImageUrl: string | null;
    backgroundDim: number;
    glass: GlassSettings;
    accentColor: string | null;
    reduceMotion: boolean;
  }>;
  disclosure?: Partial<DisclosureSettings>;
}

// ── unlock progression ─────────────────────────────────────────────────────
export type Tier = "starter" | "building" | "established" | "full";
export type FeatureKey =
  | "dashboard" | "workouts" | "trainer" | "body_map" | "progress_basic" | "goals"
  | "programs" | "progress_advanced" | "achievements" | "store" | "insights" | "voice_chat";

export interface NextUnlock {
  feature: FeatureKey;
  requirement: string;
  progress: { current: number; target: number };
}
export interface ProgressionResult extends ProgressionState {
  newlyUnlocked: FeatureKey[];
}

// ── appearance presets (GET /config/appearance-presets) ─────────────────────
export interface BackgroundPreset {
  id: string;
  name: string;
  mode: "solid" | "gradient" | "image";
  backgroundColor: string | null;
  gradient: BackgroundGradient | null;
  imageUrl: string | null;
  backgroundDim: number;
  glass: GlassSettings;
  accentColor: string | null;
  isDefault: boolean;
  premium: boolean;
}

export interface Trainer {
  id: string;
  name: string;
  avatarId: string;
  voiceId: string;
  equippedThemeId: string;
  motivationLevel: number;
  coachingDirectness: number;
  formStrictness: number;
  speakingFrequency: number;
  coachingDetail: number;
  humor: number;
}
export type TrainerPatch = Partial<Omit<Trainer, "id">>;

export interface InjuryNote {
  id: string;
  tag: string;
  note: string | null;
  active: boolean;
  createdAt: ISODate;
}
export interface Equipment {
  id: string;
  key: string;
  name: string;
  icon: string | null;
}
export interface DeviceConnection {
  id: string;
  provider: string;
  status: string; // "connected" | "disconnected" | "error" | "pending"
  lastSyncAt: ISODate | null;
  lastError?: string | null;
  lastErrorAt?: ISODate | null;
  oauthConnected?: boolean;
}

// ── nutrition daily log (§5) ───────────────────────────────────────────────
export interface NutritionEntryInput {
  date?: string; // YYYY-MM-DD
  label?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  note?: string;
}
export interface NutritionEntry extends NutritionEntryInput {
  id: string;
  date: string;
  createdAt: ISODate;
}
export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
export interface NutritionDay {
  date: string;
  entries: NutritionEntry[];
  totals: NutritionTotals;
}
export interface NutritionDayTotals extends NutritionTotals {
  date: string;
}

// ── food logging & nutrition tracking ─────────────────────────────────────
export type FoodSource = "open_food_facts" | "usda" | "nutritionix" | "edamam" | "custom";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodSearchResult {
  source: FoodSource;
  sourceId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100: number;
  proteinPer100: number;
  servingGrams: number | null;
  servingUnit: string | null;
  perServingOnly: boolean;
  dataPer: string;
}
export interface FoodSearchResponse {
  query: string;
  results: FoodSearchResult[];
  sources: { usda: boolean; nutritionix: boolean; edamam: boolean; custom: number };
  /** which external tier the results came from */
  via: FoodSource | null;
  degraded: boolean;
}

export interface ServingOption {
  unit: "serving" | "g" | "oz" | string;
  label: string;
  grams: number | null;
}
export interface Food {
  id: string;
  source: FoodSource;
  sourceId: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingGrams: number | null;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100: number | null;
  sugarPer100: number | null;
  sodiumPer100: number | null;
  perServingOnly: boolean;
  dataPer: string;
  servingOptions: ServingOption[];
}

export interface BarcodeResponse {
  code: string;
  status: "found" | "not_found" | "source_unavailable" | "parsed_from_label";
  /** which tier answered: a data source, "cache", or "label" (OCR) */
  via: FoodSource | "cache" | "label" | null;
  degraded: boolean;
  /** 0..1 confidence — only set when status is "parsed_from_label" */
  confidence: number | null;
  food: Food | null;
}

export interface FoodNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}
export interface FoodLogEntry extends FoodNutrients {
  id: string;
  foodId: string | null;
  source: FoodSource | null;
  sourceId: string | null;
  foodName: string;
  brand: string | null;
  mealType: MealType;
  quantity: number;
  servingUnit: string;
  grams: number | null;
  loggedAt: ISODate;
  date: string;
}
export interface NutritionGoalRow {
  userId: string;
  dailyCalories: number | null;
  proteinGrams: number | null;
  carbGrams: number | null;
  fatGrams: number | null;
  fiberGrams: number | null;
}
export interface NutritionGoalInput {
  dailyCalories?: number | null;
  proteinGrams?: number | null;
  carbGrams?: number | null;
  fatGrams?: number | null;
  fiberGrams?: number | null;
}
export interface FoodDay {
  date: string;
  goal: NutritionGoalRow | null;
  meals: Record<MealType, FoodLogEntry[]>;
  mealTotals: Record<MealType, FoodNutrients>;
  totals: FoodNutrients;
  remaining: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
  } | null;
}
export interface FoodLogInput {
  source?: FoodSource;
  sourceId?: string;
  quickAdd?: { name?: string; calories: number; protein?: number; carbs?: number; fat?: number };
  mealType?: MealType;
  quantity?: number;
  servingUnit?: "serving" | "g" | "oz";
  date?: string;
  loggedAt?: string;
}
export interface FoodLogPatch {
  quantity?: number;
  servingUnit?: "serving" | "g" | "oz";
  mealType?: MealType;
  date?: string;
  loggedAt?: string;
}
export interface RecentFood {
  source: FoodSource;
  sourceId: string;
  foodName: string;
  brand: string | null;
  lastQuantity: number;
  lastServingUnit: string;
  lastMealType: MealType;
  calories: number;
  protein: number;
  lastLoggedAt: ISODate;
}
export interface FavoriteFood {
  id: string;
  source: FoodSource;
  sourceId: string;
  foodName: string;
  brand: string | null;
  createdAt: ISODate;
}
export interface CustomFoodInput {
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  servingGrams?: number;
  basis: "serving" | "100g";
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}
export interface FoodAttribution {
  openFoodFacts: { name: string; url: string; license: string; licenseUrl: string; note: string };
  usda: { name: string; url: string; license: string; note: string };
  nutritionix: { name: string; url: string; license: string; note: string };
  edamam: { name: string; url: string; license: string; note: string };
}
export interface FoodDayResult {
  entry: FoodLogEntry;
  day: FoodDay;
}

// ── recovery check-in (§3.1) ────────────────────────────────────────────────
export interface RecoveryCheckinInput {
  sleepH?: number;
  sleepQuality?: number; // 1..5
  fatigue?: number; // 1..5
  soreness?: number; // 1..5
  note?: string;
  recordedAt?: ISODate;
}
export interface RecoveryCheckin extends RecoveryCheckinInput {
  id: string;
  recordedAt: ISODate;
}

// ── mobile health ingest (§3.2) ────────────────────────────────────────────
export interface HealthSamplesInput {
  provider: "apple_health" | "health_connect";
  samples: Array<{
    type: "sleep" | "hrv" | "resting_hr" | "steps";
    value: number;
    unit: string;
    recordedAt?: ISODate;
    date?: ISODate;
    start?: ISODate;
    end?: ISODate;
    sourceBundleId?: string;
  }>;
}

// ── recommendation provenance (§4) ─────────────────────────────────────────
export interface RecommendationAudit {
  id: string;
  kind: "prescription" | "deload" | "readiness_adjustment" | "swap";
  subjectId: string;
  inputs: Record<string, unknown>;
  rule: string;
  output: Record<string, unknown>;
  createdAt: ISODate;
}

// ── library ─────────────────────────────────────────────────────────────────
export interface MuscleGroup {
  id: string;
  key: string;
  name: string;
  plainName: string;
  region: MuscleRegion;
  meshRegionId: string | null;
  parentGroupId: string | null;
}

export interface ExerciseMuscleLink {
  role: MuscleRole;
  weight: number;
  muscleGroup: MuscleGroup;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  movementPattern: string | null;
  equipment: string[];
  difficulty: ExperienceLevel;
  instructions: string[];
  commonMistakes: string[];
  aiFormTips: string[];
  videoAssetRef: string | null;
  supportsCameraTracking: boolean;
  alternativeSlugs: string[];
  muscles?: ExerciseMuscleLink[];

  // ── enrichment layer (RepDB — repdb.co) — all optional / nullable ──────────
  source?: string; // "native" | "repdb"
  externalId?: string | null;
  description?: string | null;
  formTips?: string[];
  bodyPart?: string | null;
  forceType?: string | null; // "push" | "pull" | "static" | "dynamic"
  mechanic?: string | null; // "compound" | "isolation"
  discipline?: string | null; // "strength" | "stretching" | "cardio" | ...
  isUnilateral?: boolean | null;
  isBodyweight?: boolean | null;
  metValue?: number | null;
  trainingGoals?: string[];
  imageStartUrl?: string | null;
  imageEndUrl?: string | null;
}

export interface ExerciseDetail extends Exercise {
  alternatives: Array<{ slug: string; name: string; equipment: string[] }>;
}

export interface ExerciseHistory {
  exercise: { slug: string; name: string };
  personalRecords: PersonalRecord[];
  history: Array<{
    date: ISODate;
    sessionId: string;
    formScoreAvg: number | null;
    sets: Array<{ weightKg: number | null; reps: number | null; rpe: number | null; isPersonalRecord: boolean }>;
  }>;
}

// ── workouts / programs ─────────────────────────────────────────────────────
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightKg: number | null;
  targetRestSec: number | null;
  notes: string | null;
  supersetGroup: number | null;
  supersetType: SupersetType;
  exercise: Exercise;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  source: WorkoutSource;
  isTemplate: boolean;
  scheduledDate: ISODate | null;
  estimatedDurationMin: number | null;
  targetMuscleKeys: string[];
  notes: string | null;
  createdAt: ISODate;
  exercises: WorkoutExercise[];
}

export interface WorkoutInput {
  name: string;
  source?: WorkoutSource;
  isTemplate?: boolean;
  scheduledDate?: ISODate;
  estimatedDurationMin?: number;
  targetMuscleKeys?: string[];
  notes?: string;
  exercises?: Array<{
    exerciseId: string;
    order: number;
    targetSets: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    targetWeightKg?: number;
    targetRestSec?: number;
    notes?: string;
    supersetGroup?: number | null;
    supersetType?: SupersetType;
  }>;
}

export interface GenerateWorkoutInput {
  focus: string[];
  durationMin?: number;
  equipmentKeys?: string[];
  difficulty?: ExperienceLevel;
  scheduledDate?: ISODate;
  save?: boolean;
}

export interface GeneratedPlan {
  name: string;
  estimatedDurationMin: number;
  exercises: Array<{
    exerciseId: string;
    slug: string;
    name: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    restSec: number;
  }>;
}

export interface SwapSuggestion {
  slug: string;
  name: string;
  equipment: string[];
  difficulty: ExperienceLevel;
  movementPattern?: string | null;
  rationale?: string;
  reasons: string[];
  score: number;
}
export interface SwapSuggestionsResult {
  original: { slug: string; name: string };
  recommended: SwapSuggestion[];
  all: SwapSuggestion[];
}

export interface Program {
  id: string;
  name: string;
  structureType: "linear" | "undulating" | "split_defined";
  durationWeeks: number;
  generatedBy: WorkoutSource;
  active: boolean;
  createdAt: ISODate;
  days: ProgramDay[];
}
export interface ProgramDay {
  id: string;
  weekIndex: number;
  dayIndex: number;
  label: string | null;
  workoutId: string | null;
  workout?: Workout;
}
export interface GenerateProgramInput {
  split?: "full_body" | "upper_lower" | "ppl";
  daysPerWeek?: number;
  durationWeeks?: number;
  sessionLengthMin?: number;
  equipmentKeys?: string[];
  name?: string;
  activate?: boolean;
}

// ── sessions ────────────────────────────────────────────────────────────────
export interface ExerciseSet {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  restSecondsTaken: number | null;
  isWarmup: boolean;
  completedAt: ISODate | null;
  formScore: number | null;
  romValue: number | null;
  isPersonalRecord: boolean;
}

export interface ExercisePerformance {
  id: string;
  exerciseId: string;
  order: number;
  formScoreAvg: number | null;
  romAvg: number | null;
  supersetGroup: number | null;
  prescribedWeightKg?: number | null;
  prescribedReps?: number | null;
  prescribedRpe?: number | null;
  prescriptionAudit?: RecommendationAudit | null;
  exercise: Exercise;
  sets: ExerciseSet[];
}

export interface MuscleActivation {
  id: string;
  muscleGroupId: string;
  role: MuscleRole;
  activationScore: number;
  muscleGroup: MuscleGroup;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string | null;
  name: string;
  startedAt: ISODate;
  endedAt: ISODate | null;
  status: SessionStatus;
  trackingMode: TrackingMode;
  totalVolumeKg: number;
  durationSeconds: number;
  caloriesEstimate: number | null;
  trainerComment: string | null;
  performances: ExercisePerformance[];
  muscleActivations?: MuscleActivation[];
  personalRecords?: PersonalRecord[];
  /** present on the response of POST /sessions/:id/finish */
  progression?: ProgressionResult | null;
}

export interface SetLogInput {
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  restSecondsTaken?: number;
  isWarmup?: boolean;
  formScore?: number | null;
  romValue?: number | null;
  completed?: boolean;
}

export interface FormAnalysisInput {
  performanceId: string;
  setNumber: number;
  reps: Array<{
    repIndex: number;
    jointAngleSnapshot: Record<string, number>;
    romValue?: number;
    tempoSeconds?: number;
    detectedFaults?: Array<{ type: string; severity: number }>;
    overallRepScore?: number;
  }>;
}

// ── progress ────────────────────────────────────────────────────────────────
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  recordType: PersonalRecordType;
  value: number;
  previousValue: number | null;
  achievedAt: ISODate;
  exercise?: Exercise;
}

export interface ProgressMetric {
  id: string;
  metricType: ProgressMetricType;
  key: string | null;
  value: number;
  unit: string;
  recordedAt: ISODate;
  source: ProgressMetricSource;
}
export interface ProgressMetricInput {
  metricType: ProgressMetricType;
  key?: string;
  value: number;
  unit: string;
  recordedAt?: ISODate;
  source?: ProgressMetricSource;
}

export interface BodyMeasurementInput {
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
  recordedAt?: ISODate;
}
export interface BodyMeasurement extends BodyMeasurementInput {
  id: string;
}

export interface ProgressPhoto {
  id: string;
  assetRef: string;
  poseTag: PhotoPose;
  takenAt: ISODate;
}
export interface ProgressPhotoUpload {
  photo: ProgressPhoto;
  upload: { method: string; url: string; headers: Record<string, string> };
}

export interface ReadinessBreakdown {
  score: number;
  recommendation: string;
  factors: Array<{ label: string; value: string; fraction: number }>;
}

export interface StrengthSeries {
  slug: string;
  series: Array<{ date: string; e1rm: number }>;
}
export interface ProgressOverview {
  summary: string;
  sessions: number;
  totalVolumeKg: number;
  personalRecords: number;
}
export interface ConsistencyReport {
  target: number;
  currentStreak: number;
  adherence: number;
  weeks: Array<{ week: string; sessions: number; volumeKg: number }>;
  days?: Array<{ date: string; sessions: number }>;
}

// ── resolved program schedule (§2.4) ───────────────────────────────────────
export interface ProgramScheduleDay {
  programDayId: string;
  weekIndex: number;
  dayIndex: number;
  label: string | null;
  workoutId: string | null;
  workoutName: string | null;
  date: string | null;
  completedAt: ISODate | null;
  status: "scheduled" | "completed" | "missed" | "rescheduled";
}
export interface ProgramSchedule {
  programId: string;
  startDate: string | null;
  preferredWeekdays: number[];
  anchored: boolean;
  days: ProgramScheduleDay[];
  upcoming: ProgramScheduleDay[];
}
export interface FormTrends {
  slug: string | null;
  samples: number;
  series: Array<{ date: string; formScore: number }>;
}

// ── body ────────────────────────────────────────────────────────────────────
export interface MuscleMapEntry {
  key: string;
  name: string;
  region: string;
  score: number;
  role: MuscleRole;
}
export interface MuscleMap {
  range: "today" | "week" | "month";
  muscles: MuscleMapEntry[];
}
export interface MuscleLoad {
  key: string;
  name: string;
  region: string;
  load: number;
}
export interface MuscleBalance {
  mostTrained: MuscleLoad[];
  undertrained: MuscleLoad[];
}
export interface MuscleDetail {
  key: string;
  name: string;
  anatomicalName: string;
  region: string;
  sessionsHit: number;
  totalLoad: number;
  activitySeries: Array<{ date: string; score: number }>;
  recentExercises: Array<{
    name: string;
    slug: string;
    date: ISODate;
    sets: number;
    topSet: { weightKg: number | null; reps: number | null };
  }>;
  allExercises: Array<{ name: string; slug: string; role?: MuscleRole }>;
}

// ── chat / insights ─────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  richContent: Record<string, unknown> | null;
  viaVoice: boolean;
  trainerSnapshot: Record<string, unknown> | null;
  appliedAt: ISODate | null;
  createdAt: ISODate;
}
export interface ChatTurn {
  userMessage: ChatMessage;
  trainerMessage: ChatMessage;
}

export interface CoachingInsight {
  id: string;
  category: InsightCategory;
  title: string;
  body: string;
  actions: string[];
  dataRefs: Record<string, unknown> | null;
  sparkline: number[] | null;
  proactive: boolean;
  dismissedAt: ISODate | null;
  createdAt: ISODate;
}

export interface CheckIn {
  prompt: string;
  options: string[];
  topic: "injury" | "soreness" | "energy";
}

export interface TrainerCatalogue {
  voices: StoreItem[];
  avatars: StoreItem[];
  themes: StoreItem[];
  personalities: StoreItem[];
}

// ── goals / achievements ────────────────────────────────────────────────────
export interface Goal {
  id: string;
  key: string;
  label: string;
  target: number;
  unit: string;
  cadence: GoalCadence;
  tone: string;
  active: boolean;
}
export interface GoalWithProgress extends Goal {
  current: number;
  completed: boolean;
  periodKey: string;
}
export interface GoalInput {
  key: string;
  label: string;
  target: number;
  unit: string;
  cadence: GoalCadence;
  tone?: string;
}

export interface AchievementProgress {
  key: string;
  title: string;
  detail: string;
  icon: string;
  targetValue: number | null;
  progress: number;
  unlockedAt: ISODate | null;
}

// ── store / wallet ──────────────────────────────────────────────────────────
export interface Wallet {
  id: string;
  balance: number;
}
export interface WalletTransaction {
  id: string;
  type: "earn" | "spend";
  amount: number;
  label: string;
  createdAt: ISODate;
}
export interface WalletSummary {
  balance: number;
  earnedThisWeek: number;
  recent: WalletTransaction[];
}
export interface CustomizationState {
  owned: string[];
  equipped: Record<string, string>;
  balance: number;
}

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  detail: string;
  price: number;
  swatch: string | null;
  isDefault: boolean;
  style: { directness: number; warmth: number; detail: number; intensity: number; humor: number } | null;
  owned?: boolean;
  equipped?: boolean;
}

// ── notifications ───────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: ISODate | null;
  createdAt: ISODate;
}
export interface NotificationList {
  items: Notification[];
  unreadCount: number;
}
export interface NotificationPreference {
  workoutReminders: boolean;
  restTimerAlerts: boolean;
  trainerMessages: boolean;
  milestones: boolean;
  weeklySummary: boolean;
  checkIns: boolean;
  reminderTime: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// ── subscription ────────────────────────────────────────────────────────────
export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  store: "app_store" | "play_store" | null;
  currentPeriodEnd: ISODate | null;
}
export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string | null;
  features: string[];
}
export interface SubscriptionState extends Subscription {
  entitled: boolean;
  plans: Plan[];
}

// ── dashboard ───────────────────────────────────────────────────────────────
export interface WorkoutSummaryCard {
  name: string;
  durationMin: number | null;
  exercises: number;
  muscles: string[];
}
export interface Dashboard {
  greeting: string;
  user: { name: string };
  trainerName: string;
  trainerMessage: string;
  todayWorkout: WorkoutSummaryCard | null;
  upcomingWorkout: WorkoutSummaryCard | null;
  activeSessionId: string | null;
  weeklyRing: { done: number; target: number };
  weeklyVolumeKg: number;
  readiness: number;
  streakDays: number;
  recentPRs: Array<{ lift: string; recordType: string; value: number; previousValue: number | null }>;
  goals: Goal[];
  notificationsUnread: number;
  insights: CoachingInsight[];
  /** per-metric provenance (§5) — render "—" when unavailable. */
  readinessAvailable?: "live" | "unavailable" | "computed";
  formAvailable?: "live" | "unavailable" | "computed";
  volumeSource?: "computed" | "unavailable";
}
