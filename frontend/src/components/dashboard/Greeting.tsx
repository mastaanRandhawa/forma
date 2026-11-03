import { useDashboardData } from "../../api/dashboard-context";
import { useFormaData } from "../../lib/localStore";
import { ProfileBadge, ProfileTitle } from "../ProfileTag";

/** Time-of-day greeting + the trainer's nudge, when there is a real one. */
export function Greeting() {
  const dash = useDashboardData();
  const profileName = useFormaData().profile.name;
  const h = new Date().getHours();
  const part =
    dash?.greeting ??
    (h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Winding down");
  const name = dash?.user?.name ?? profileName;
  const nudge = dash?.trainerMessage;

  return (
    <header className="mb-6">
      <h1 className="text-[1.5rem] font-light leading-tight text-content-primary sm:text-[1.75rem]">
        {name ? `${part}, ${name}` : part}
        {name && <ProfileBadge size={18} />}
      </h1>
      <ProfileTitle className="mt-1" />
      {nudge && <p className="mt-1 line-clamp-2 text-[0.9rem] text-content-secondary">{nudge}</p>}
    </header>
  );
}
