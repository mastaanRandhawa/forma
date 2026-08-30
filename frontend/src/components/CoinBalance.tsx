import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { useWalletBalance } from "../lib/wallet";

/**
 * CoinBalance — the wallet pill. Coins are earned from workouts, streaks and
 * goals, and spent in the trainer store. Lives in the top nav.
 */
export function CoinBalance() {
  const balance = useWalletBalance();
  return (
    <Link
      to="/store"
      aria-label={`${balance} coins — open store`}
      className="focus-ring tactile flex items-center gap-1.5 rounded-pill border border-white/10 bg-white/[0.05] py-1.5 pl-2.5 pr-3 transition-colors hover:border-white/20 hover:bg-white/[0.09]"
    >
      <Coins size={14} strokeWidth={2} className="text-[var(--accent-amber)]" />
      <span className="num text-[0.82rem] font-medium tabular-nums text-content-primary">
        {balance.toLocaleString()}
      </span>
    </Link>
  );
}
