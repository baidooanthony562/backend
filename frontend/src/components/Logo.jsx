// Cindy Nat seal. A code-drawn SVG (no image asset) so it stays crisp at any
// size. A navy medallion with a gold frame and gold serif lettering — the
// roundel shape with a framed-ink treatment. "CINDY NAT" arcs over the top and
// "ENTERPRISE" sits below the CN monogram; at small sizes the microtype reads
// as fine detail, giving it a premium, minted-coin feel.
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
        <path id="cnArc" d="M13 50 A37 37 0 0 1 87 50" fill="none" />
      </defs>

      <circle cx="50" cy="50" r="49" fill="#131921" />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="url(#cnGold)" strokeWidth="2.5" />
      <circle cx="14" cy="50" r="1.4" fill="url(#cnGold)" />
      <circle cx="86" cy="50" r="1.4" fill="url(#cnGold)" />

      <text fontFamily="Georgia, 'Times New Roman', serif" fontSize="8" fontWeight="700" letterSpacing="3" fill="url(#cnGold)">
        <textPath href="#cnArc" startOffset="50%" textAnchor="middle">CINDY NAT</textPath>
      </text>
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="30" fill="url(#cnGold)">CN</text>
      <text x="50" y="77" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="6.5" fontWeight="600" letterSpacing="2.5" fill="url(#cnGold)">ENTERPRISE</text>
    </svg>
  );
}
