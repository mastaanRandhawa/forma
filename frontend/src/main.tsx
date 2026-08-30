import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import "./index.css";
import { AppShell } from "./components/AppShell";

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
      { path: "/body", element: <Body /> },
      { path: "/progress", element: <Progress /> },
      { path: "/goals", element: <Goals /> },
      { path: "/store", element: <Store /> },
      { path: "/exercise-library", element: <ExerciseLibrary /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
