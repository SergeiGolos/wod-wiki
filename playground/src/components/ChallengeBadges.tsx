import React from 'react';

// ─── Chapter Badges (from stitch mastery files) ──────────────────────

export const StructureBlocksBadge: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="struct-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00E676', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#struct-grad)" strokeWidth="4" />
    <path d="M35 35 L65 35 L65 45 L45 45 L45 65 L35 65 Z" fill="url(#struct-grad)" />
    <path d="M55 45 L65 45 L65 65 L45 65 L45 55 L55 55 Z" fill="url(#struct-grad)" opacity="0.7" />
  </svg>
);

export const ProtocolsTimerBadge: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="proto-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#FFD600', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#FFAB00', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#proto-grad)" strokeWidth="4" />
    <circle cx="50" cy="50" r="5" fill="url(#proto-grad)" />
    <circle cx="50" cy="50" r="15" fill="none" stroke="url(#proto-grad)" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="50" cy="50" r="25" fill="none" stroke="url(#proto-grad)" strokeWidth="1" opacity="0.5" />
    <line x1="50" y1="50" x2="50" y2="25" stroke="url(#proto-grad)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const ComplexPuzzleBadge: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="complex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#F50057', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#D500F9', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#complex-grad)" strokeWidth="4" />
    <path d="M40 35 H60 V45 A5 5 0 0 1 60 55 V65 H40 V55 A5 5 0 0 0 40 45 Z" fill="url(#complex-grad)" />
  </svg>
);

// ─── Quest / Challenge Icons (from stitch mastery files) ──────────────

export const BasicsMovementIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="basics-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#6200EA', stopOpacity: 1 }} />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#basics-grad)" strokeWidth="4" />
    <path d="M55 20 L30 55 L45 55 L40 85 L70 45 L55 45 Z" fill="url(#basics-grad)" filter="url(#glow)" />
  </svg>
);

export const BasicsRepsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="basics-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#6200EA', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#basics-grad)" strokeWidth="4" />
    <text x="50" y="65" fontFamily="monospace" fontSize="40" fontWeight="bold" fill="url(#basics-grad)" textAnchor="middle">10</text>
  </svg>
);

export const BasicsLoadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="basics-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#6200EA', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#basics-grad)" strokeWidth="4" />
    <rect x="30" y="30" width="40" height="8" rx="2" fill="url(#basics-grad)" />
    <rect x="30" y="45" width="40" height="8" rx="2" fill="url(#basics-grad)" />
    <rect x="30" y="60" width="40" height="8" rx="2" fill="url(#basics-grad)" />
  </svg>
);

export const StructureRoundsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="struct-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00E676', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#struct-grad)" strokeWidth="4" />
    <path d="M50 30 A20 20 0 1 1 35.8 35.8 L30 30 M35.8 35.8 L42 38" fill="none" stroke="url(#struct-grad)" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const StructureRepSchemeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="struct-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00E676', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#00F2FF', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#struct-grad)" strokeWidth="4" />
    <path d="M30 40 L45 40 M30 50 L55 50 M30 60 L70 60" fill="none" stroke="url(#struct-grad)" strokeWidth="6" strokeLinecap="round" />
    <text x="50" y="30" fontFamily="monospace" fontSize="12" fill="url(#struct-grad)" textAnchor="middle">21-15-9</text>
  </svg>
);

export const ProtocolsTagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="proto-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#FFD600', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#FFAB00', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#proto-grad)" strokeWidth="4" />
    <path d="M35 35 H65 V55 L50 70 L35 55 Z" fill="url(#proto-grad)" />
    <circle cx="50" cy="45" r="4" fill="#0b1326" />
  </svg>
);

export const MetricsCustomIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="metric-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00E5FF', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#1DE9B6', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#metric-grad)" strokeWidth="4" />
    <rect x="30" y="60" width="10" height="15" fill="url(#metric-grad)" />
    <rect x="45" y="40" width="10" height="35" fill="url(#metric-grad)" />
    <rect x="60" y="25" width="10" height="50" fill="url(#metric-grad)" />
  </svg>
);

export const MetricsCalcIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="metric-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00E5FF', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#1DE9B6', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#metric-grad)" strokeWidth="4" />
    <path d="M35 40 L65 60 M65 40 L35 60 M35 30 H65 M35 70 H65" fill="none" stroke="url(#metric-grad)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const DialectsLogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <defs>
      <linearGradient id="dialect-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#76FF03', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#00E676', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="url(#dialect-grad)" strokeWidth="4" />
    <path d="M35 30 H65 M35 45 H65 M35 60 H55 M35 75 H65" fill="none" stroke="url(#dialect-grad)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
