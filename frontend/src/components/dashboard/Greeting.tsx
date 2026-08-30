import { user } from "../../lib/data";

/** Time-of-day greeting + one contextual nudge. Makes the dashboard feel personal. */
export function Greeting() {
  const h = new Date().getHours();
  const part =
    h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Winding down";

  const nudge =
    h < 12
      ? "Recovery looks good. You're cleared to train hard today."
      : h < 17
        ? "3,200 steps left to your daily goal, and today's session is still open."
        : h < 22
          ? "You're 18g short of your protein target. One more meal should cover it."
          : "Your average bedtime is in 40 minutes.";

  return (
    <header className="mb-6">
      <h1 className="text-[1.5rem] font-light leading-tight text-content-primary sm:text-[1.75rem]">
        {part}, {user.name}
      </h1>
      <p className="mt-1 text-[0.9rem] text-content-secondary">{nudge}</p>
    </header>
  );
}
