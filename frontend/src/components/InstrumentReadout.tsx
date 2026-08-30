// Dot-matrix "Instrument Readout" — one hero number per screen, max.
// 5-wide x 7-tall grid of glowing dots per glyph.

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "%": ["11001", "11010", "00100", "00100", "01000", "01011", "10011"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

type Identity =
  | "ion"
  | "ember"
  | "chartreuse"
  | "orchid"
  | "jade"
  | "aurum"
  | "pink"
  | "mauve"
  | "cyan";

const STOPS: Record<Identity, [string, string]> = {
  ion: ["#E8A5C5", "#D51A7A"],
  ember: ["#FF9C63", "#C2410C"],
  chartreuse: ["#D8FF63", "#7FA829"],
  orchid: ["#D51A7A", "#7A174F"],
  jade: ["#83E9F4", "#0E8F6D"],
  aurum: ["#FFCE5C", "#B87F1B"],
  pink: ["#F2C4DC", "#D51A7A"],
  mauve: ["#D9A9C8", "#7A174F"],
  cyan: ["#B7F3F9", "#4D7CFF"],
};

export function InstrumentReadout({
  value,
  identity = "ion",
  dot = 7,
  gap = 3,
  className = "",
}: {
  value: string;
  identity?: Identity;
  dot?: number;
  gap?: number;
  className?: string;
}) {
  const chars = value.split("");
  const cell = dot + gap;
  const charW = 5 * cell - gap;
  const charGap = dot * 2;
  const height = 7 * cell - gap;
  const width = chars.reduce((w, _, i) => w + charW + (i ? charGap : 0), 0);
  const [light, dark] = STOPS[identity];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={value}
    >
      <defs>
        <linearGradient id={`ir-${identity}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <filter id="ir-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={dot * 0.5} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#ir-glow)">
        {chars.map((ch, ci) => {
          const rows = GLYPHS[ch] ?? GLYPHS[" "];
          const ox = ci * (charW + charGap);
          return rows.map((row, r) =>
            row.split("").map((bit, c) => (
              <circle
                key={`${ci}-${r}-${c}`}
                cx={ox + c * cell + dot / 2}
                cy={r * cell + dot / 2}
                r={dot / 2}
                fill={bit === "1" ? `url(#ir-${identity})` : "rgba(255,241,248,0.10)"}
                opacity={bit === "1" ? 1 : 0.6}
              />
            ))
          );
        })}
      </g>
    </svg>
  );
}
