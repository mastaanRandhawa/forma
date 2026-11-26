export type TourStep = {
  id: string;
  /** which screen the target lives on */
  route: "/dashboard" | "/workouts" | "/nutrition" | "/trainer";
  /** matches an element's `data-tour` attribute */
  target: string;
  title: string;
  body: string;
  /** the target is pinned to the screen edge (nav) — don't try to scroll it into view */
  pinned?: boolean;
};

/**
 * The shortest path to value: where today's workout is, how to log things,
 * how to move around, and how to ask Kai. Each step covers one idea and
 * points at something that exists on that screen.
 */
export const TOUR_STEPS: TourStep[] = [
  { id: "readiness", route: "/dashboard", target: "home-rings", title: "How ready you are", body: "Readiness, 7-day volume and consistency at a glance. Open any of them to see what's driving it." },
  { id: "today", route: "/dashboard", target: "home-session", title: "Today's workout", body: "Your plan for the day. Start it from here, or let Kai build one if nothing is scheduled." },
  { id: "nav", route: "/dashboard", target: "nav", pinned: true, title: "Get around", body: "Home, training, nutrition and your trainer. Records, games, the exercise library and settings are under the menu." },

  { id: "train-tabs", route: "/workouts", target: "train-tabs", title: "Plan, review, reuse", body: "Today is your session, History is what you've done, and Templates holds saved and prebuilt workouts." },
  { id: "train-start", route: "/workouts", target: "train-start", title: "Start training", body: "Start your planned workout, or Quick start to begin an empty one and add exercises as you go." },
  { id: "train-create", route: "/workouts", target: "train-create", title: "Build your own", body: "Create a custom workout from the exercise library and save it as a template." },

  { id: "nutrition", route: "/nutrition", target: "nutrition-summary", title: "Calories at a glance", body: "The ring shows what's left today. Protein, carbs and fat sit just below, against your targets." },
  { id: "addfood", route: "/nutrition", target: "nutrition-add", title: "Add food", body: "Search, scan a barcode or enter calories by hand." },

  { id: "kai", route: "/trainer", target: "coach-composer", title: "Ask Kai anything", body: "Questions about form, today's session or a lift. Kai knows your plan and your history." },
];
