// Inline SVGs: 頭腦, 放大鏡, 地球. Use currentColor.
import { SVGProps } from "react";

export const BrainIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.5 3a2.5 2.5 0 0 0-2.5 2.5v.2A3 3 0 0 0 4 8.5v.2A3 3 0 0 0 3 11.2v.6a3 3 0 0 0 1.5 2.6V15a3 3 0 0 0 2 2.83V18a2.5 2.5 0 0 0 3 2.45" />
    <path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.2a3 3 0 0 1 3 2.8v.2a3 3 0 0 1 1 2.5v.6a3 3 0 0 1-1.5 2.6V15a3 3 0 0 1-2 2.83V18a2.5 2.5 0 0 1-3 2.45" />
    <path d="M9.5 3v17.5M14.5 3v17.5" />
    <path d="M7 9.5h2.5M14.5 9.5H17M7 14h2.5M14.5 14H17" />
  </svg>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const GlobeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
