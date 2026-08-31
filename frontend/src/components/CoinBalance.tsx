import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { useWallet } from "./../lib/wallet";

/**
 * CoinBalance — the wallet pill in the top nav. Shows the live balance and the
 * collector level. Coins are earned from workouts, streaks, goals, challenges
 * and the daily check-in, and spent in the store.
 */
export function CoinBalance() {
  const { balance, level } = useWallet();
  return (
    <Link
      to="/store"
      aria-label={`${balance} coins, level ${level.level} — open store`}
      className="focus-ring tactile flex items-center gap-1.5 rounded-pill border border-white/10 bg-white/[0.05] py-1.5 pl-2.5 pr-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.09]"
    >
      <Coins size={14} strokeWidth={2} className="text-[var(--accent-amber)]" />
      <span className="num text-[0.82rem] font-medium tabular-nums text-content-primary">
        {balance.toLocaleString()}
      </span>
      <span className="num rounded-full bg-[var(--accent-amber)]/15 px-1.5 text-[0.62rem] font-semibold leading-[1.35] text-[var(--accent-amber)]">
        {level.level}
      </span>
    </Link>
  );
}
