// Cindy Nat monogram. A code-drawn SVG (no image asset) so it stays crisp at
// any size and shares one source of truth. Gold gradient tile + a subtle inner
// ring for a "seal" feel + a refined navy serif "CN".
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Cindy Nat"
    >
      <defs>
        <linearGradient id="cnGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C766" />
          <stop offset="100%" stopColor="#C49A2B" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="url(#cnGold)" />
      <rect x="6" y="6" width="88" height="88" rx="19" fill="none" stroke="#131921" strokeOpacity="0.18" strokeWidth="2" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="50"
        letterSpacing="1"
        fill="#131921"
      >
        CN
      </text>
    </svg>
  );
}
