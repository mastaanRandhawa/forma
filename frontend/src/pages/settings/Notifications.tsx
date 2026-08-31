import { usePrefs, useSettings } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";

const ITEMS: { key: keyof ReturnType<typeof usePrefs>["notifications"]; label: string; hint: string }[] = [
  { key: "workoutReminders", label: "workout reminders", hint: "a nudge on your training days." },
  { key: "trainerCheckins", label: "trainer check-ins", hint: "proactive messages from kai between sessions." },
  { key: "milestones", label: "pr & milestone celebrations", hint: "when you hit a personal record or streak milestone." },
  { key: "weeklyDigest", label: "weekly progress report", hint: "a summary of your week, by email." },
];

export default function Notifications() {
  const prefs = usePrefs();
  const { update } = useSettings();
  return (
    <Section title="notifications" description="what forma is allowed to reach out about.">
      <div className="divide-y divide-[var(--line-soft)]">
        {ITEMS.map((it) => (
          <Toggle
            key={it.key}
            label={it.label}
            hint={it.hint}
            checked={prefs.notifications[it.key]}
            onChange={(v) => update({ prefs: { notifications: { [it.key]: v } } })}
          />
        ))}
      </div>
    </Section>
  );
}
