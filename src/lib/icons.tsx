// Inline SVGs (頭腦/放大鏡/地球/書本/文字游標/圖片/圖片+/複製/下載/勾/重試)
import { SVGProps } from "react";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const BrainIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M9.5 3a2.5 2.5 0 0 0-2.5 2.5v.2A3 3 0 0 0 4 8.5v.2A3 3 0 0 0 3 11.2v.6a3 3 0 0 0 1.5 2.6V15a3 3 0 0 0 2 2.83V18a2.5 2.5 0 0 0 3 2.45" />
    <path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.2a3 3 0 0 1 3 2.8v.2a3 3 0 0 1 1 2.5v.6a3 3 0 0 1-1.5 2.6V15a3 3 0 0 1-2 2.83V18a2.5 2.5 0 0 1-3 2.45" />
    <path d="M9.5 3v17.5M14.5 3v17.5" />
  </svg>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const BookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
    <path d="M4 19V5" />
    <path d="M9 7h7M9 11h7" />
  </svg>
);

export const TextCursorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M9 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" />
    <path d="M15 4h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2" />
    <path d="M12 8v8" />
  </svg>
);

export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 18 5-5 4 4 3-3 4 4" />
  </svg>
);

export const ImagePlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="14" height="16" rx="2.5" />
    <circle cx="8" cy="10" r="1.4" />
    <path d="m4 18 4-4 3 3 2-2 3 3" />
    <path d="M19 3v6M16 6h6" />
  </svg>
);

export const CopyIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="13" height="13" rx="2.5" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </svg>
);

export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5 9-11" />
  </svg>
);

export const RetryIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
