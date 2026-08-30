import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import "./index.css";
import { AppShell } from "./components/AppShell";
import { SettingsProvider } from "./api/settings";
import { FeatureGate } from "./components/FeatureGate";
import type { FeatureKey } from "./api/types";

const Home = lazy(() => import("./pages/Home"));
const Workouts = lazy(() => import("./pages/Workouts"));
const ActiveWorkout = lazy(() => import("./pages/ActiveWorkout"));
const Trainer = lazy(() => import("./pages/Trainer"));
const Body = lazy(() => import("./pages/Body"));
const Progress = lazy(() => import("./pages/Progress"));
const Goals = lazy(() => import("./pages/Goals"));
const Store = lazy(() => import("./pages/Store"));
const ExerciseLibrary = lazy(() => import("./pages/ExerciseLibrary"));
const Settings = lazy(() => import("./pages/Settings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const gated = (feature: FeatureKey, el: React.ReactNode) => <FeatureGate feature={feature}>{el}</FeatureGate>;

// Vite injects BASE_URL ("/forma/" in the Pages build, "/" in dev).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const router = createBrowserRouter([
  {
    path: "/onboarding",
    element: (
      <Suspense fallback={<div className="min-h-[100dvh] bg-background-deep" />}>
        <Onboarding />
      </Suspense>
    ),
  },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <Home /> },
      { path: "/workouts", element: <Workouts /> },
      { path: "/workouts/active", element: <ActiveWorkout /> },
      { path: "/trainer", element: <Trainer /> },
      { path: "/body", element: gated("body_map", <Body />) },
      { path: "/progress", element: gated("progress_basic", <Progress />) },
      { path: "/goals", element: gated("goals", <Goals />) },
      { path: "/store", element: gated("store", <Store />) },
      { path: "/exercise-library", element: <ExerciseLibrary /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
], { basename });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <RouterProvider router={router} />
    </SettingsProvider>
  </React.StrictMode>
);
