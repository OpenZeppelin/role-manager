/**
 * RISE Chain Icon
 * Custom network icon for RISE mainnet and testnet.
 * Renders the RISE "R" logo mark as an inline SVG.
 */

interface RiseChainIconProps {
  size?: number;
  variant?: 'mono' | 'branded';
  className?: string;
}

export function RiseChainIcon({ size = 16, className }: RiseChainIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="16" fill="#0052FF" />
      <path
        d="M10 8h8a5 5 0 0 1 0 10h-2l5 6h-4l-5-6h-1v6h-3V8h2Zm2 3v4h5a2 2 0 1 0 0-4h-5Z"
        fill="white"
      />
    </svg>
  );
}
