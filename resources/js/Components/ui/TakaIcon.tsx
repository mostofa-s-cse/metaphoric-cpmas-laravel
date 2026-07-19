import React from 'react';

/**
 * Lucide has no BDT/Taka glyph — this mimics a lucide icon's props/sizing
 * (24x24 viewBox, currentColor) so it drops into any `<DollarSign .../>`
 * usage without touching surrounding className/color classes.
 */
export function TakaIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontSize="17"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        ৳
      </text>
    </svg>
  );
}
