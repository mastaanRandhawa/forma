import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import "./index.css";
import { AppShell } from "./components/AppShell";
import { SettingsProvider } from "./api/settings";
import { AuthProvider, RequireAuth, RedirectIfAuthed } from "./api/auth";
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
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const SettingsOverview = lazy(() => import("./pages/settings/SettingsOverview"));
const TrainingProfile = lazy(() => import("./pages/settings/TrainingProfile"));
const Coaching = lazy(() => import("./pages/settings/Coaching"));
const Connections = lazy(() => import("./pages/settings/Connections"));
const NotificationsSettings = lazy(() => import("./pages/settings/Notifications"));
const AppearanceSettings = lazy(() => import("./pages/settings/Appearance"));
const PrivacySettings = lazy(() => import("./pages/settings/Privacy"));
const AccountSettings = lazy(() => import("./pages/settings/Account"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));

const gated = (feature: FeatureKey, el: React.ReactNode) => <FeatureGate feature={feature}>{el}</FeatureGate>;

const bare = (el: React.ReactNode) => (
  <Suspense fallback={<div className="min-h-[100dvh] bg-background-deep" />}>{el}</Suspense>
);

// Vite injects BASE_URL ("/forma/" in the Pages build, "/" in dev).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const router = createBrowserRouter([
  { path: "/login", element: bare(<RedirectIfAuthed><Login /></RedirectIfAuthed>) },
  { path: "/signup", element: bare(<RedirectIfAuthed><Signup /></RedirectIfAuthed>) },
  { path: "/forgot-password", element: bare(<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>) },
  { path: "/reset-password", element: bare(<ResetPassword />) },
  { path: "/verify-email", element: bare(<VerifyEmail />) },
  {
    path: "/onboarding",
    element: bare(
      <RequireAuth>
        <Onboarding />
      </RequireAuth>,
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
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
      {
        path: "/settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsOverview /> },
          { path: "training", element: <TrainingProfile /> },
          { path: "coaching", element: <Coaching /> },
          { path: "connections", element: <Connections /> },
          { path: "notifications", element: <NotificationsSettings /> },
          { path: "appearance", element: <AppearanceSettings /> },
          { path: "privacy", element: <PrivacySettings /> },
          { path: "account", element: <AccountSettings /> },
        ],
      },
      { path: "/settings/security", element: <AccountSecurity /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
], { basename });

// Reuse the root across Vite HMR re-executions of this entry module — creating a
// second root on the same container triggers a "createRoot() called twice"
// warning and DOM removeChild errors as the two trees fight over #root.
const container = document.getElementById("root")!;
const store = window as unknown as { __formaRoot?: ReactDOM.Root };
const root = store.__formaRoot ?? (store.__formaRoot = ReactDOM.createRoot(container));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
