import React from 'react';

interface BBWashLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'icon' | 'badge';
}

export const BBWashLogo: React.FC<BBWashLogoProps> = ({
  className = "w-16 h-16",
  variant = 'full'
}) => {
  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        {/* Shadow for badge */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
        </filter>
        <radialGradient id="cloudGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </radialGradient>
        <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* 1. White circular background */}
      <circle cx="250" cy="250" r="240" fill="#FFFFFF" />

      {/* 2. Outer Black Ring */}
      <circle cx="250" cy="250" r="236" stroke="#18181B" strokeWidth="18" fill="none" />

      {/* 3. Dotted Circle Ring */}
      <circle
        cx="250"
        cy="250"
        r="206"
        stroke="#18181B"
        strokeWidth="9"
        strokeDasharray="2 18.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* 4. Soft Cloud behind Mascot */}
      <ellipse cx="120" cy="255" rx="42" ry="24" fill="url(#cloudGrad)" opacity="0.9" />
      <circle cx="102" cy="245" r="20" fill="url(#cloudGrad)" opacity="0.9" />
      <circle cx="138" cy="248" r="18" fill="url(#cloudGrad)" opacity="0.9" />

      {/* 5. Mascot (Bee with Laundry Basket) */}
      <g id="bee-mascot">
        {/* Stinger */}
        <polygon points="116,285 124,285 120,296" fill="#F59E0B" />

        {/* Laundry Basket (Green tub) */}
        <path
          d="M92 245 C90 270 98 285 120 285 C142 285 150 270 148 245 Z"
          fill="#34D399"
          stroke="#059669"
          strokeWidth="3"
        />
        {/* Basket Rim */}
        <ellipse cx="120" cy="245" rx="30" ry="6" fill="#10B981" stroke="#059669" strokeWidth="2" />

        {/* Clothes inside Basket */}
        {/* Red shirt */}
        <path d="M96 242 Q105 220 114 240 Z" fill="#EF4444" />
        {/* Orange fold */}
        <path d="M106 242 Q118 215 128 238 Z" fill="#F97316" />
        {/* Yellow towel */}
        <path d="M118 243 Q128 222 136 240 Z" fill="#FBBF24" />
        {/* Blue clothes tag/edge */}
        <path d="M130 242 Q138 226 144 242 Z" fill="#3B82F6" />

        {/* Bee Head */}
        <circle cx="120" cy="205" r="24" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />

        {/* Antennae */}
        <path d="M112 185 Q102 170 98 174" stroke="#18181B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="98" cy="174" r="3.5" fill="#F59E0B" />
        <path d="M128 185 Q138 170 142 174" stroke="#18181B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="142" cy="174" r="3.5" fill="#F59E0B" />

        {/* Bee Eyes */}
        <ellipse cx="112" cy="202" rx="3.5" ry="5.5" fill="#18181B" />
        <circle cx="111" cy="200" r="1.2" fill="#FFFFFF" />
        <ellipse cx="128" cy="202" rx="3.5" ry="5.5" fill="#18181B" />
        <circle cx="127" cy="200" r="1.2" fill="#FFFFFF" />

        {/* Blush */}
        <ellipse cx="106" cy="210" rx="3.5" ry="2" fill="#FCA5A5" opacity="0.8" />
        <ellipse cx="134" cy="210" rx="3.5" ry="2" fill="#FCA5A5" opacity="0.8" />

        {/* Bee Smile */}
        <path d="M115 212 Q120 217 125 212" stroke="#18181B" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Bee Little Hands holding basket */}
        <ellipse cx="98" cy="246" rx="4.5" ry="6" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
        <ellipse cx="142" cy="246" rx="4.5" ry="6" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
      </g>

      {/* 6. Big Bold "BB" Letters */}
      <g id="letters-BB">
        {/* First B */}
        <path
          d="M185 170 
             H242 
             C262 170 274 182 274 202 
             C274 214 266 224 254 228 
             C268 232 277 244 277 262 
             C277 284 262 298 240 298 
             H185 
             Z"
          fill="#FBBF24"
        />
        {/* First B - Top Hole */}
        <rect x="210" y="190" width="30" height="24" rx="8" fill="#FFFFFF" />
        {/* First B - Bottom Hole with Honey/Water Drip */}
        <path
          d="M210 242 
             H240 
             C246 242 250 246 250 252 
             C250 264 244 274 234 274 
             C232 274 231 270 230 266 
             C228 258 222 258 220 268 
             C219 274 214 274 210 274 
             Z"
          fill="#FFFFFF"
        />
        {/* Honey Drip Drop Inside */}
        <path
          d="M225 258 C225 258 221 268 225 272 C229 275 233 270 233 266 C233 262 229 258 225 258 Z"
          fill="#F59E0B"
        />

        {/* Second B */}
        <path
          d="M268 170 
             H324 
             C344 170 356 182 356 202 
             C356 214 348 224 336 228 
             C350 232 359 244 359 262 
             C359 284 344 298 322 298 
             H268 
             Z"
          fill="#FDE047"
        />
        {/* Second B - Top Hole */}
        <rect x="292" y="190" width="30" height="24" rx="8" fill="#FFFFFF" />
        {/* Second B - Bottom Hole */}
        <rect x="292" y="244" width="32" height="32" rx="8" fill="#FFFFFF" />
        
        {/* Washing Machine Icon inside Second B bottom hole */}
        <g id="washing-machine-mini">
          <rect x="295" y="247" width="26" height="26" rx="4" fill="#F59E0B" />
          {/* Controls */}
          <circle cx="300" cy="251" r="1.5" fill="#FFFFFF" />
          <circle cx="304" cy="251" r="1.5" fill="#FFFFFF" />
          <line x1="312" y1="251" x2="317" y2="251" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          {/* Drum Door */}
          <circle cx="308" cy="261" r="7.5" fill="#FFFFFF" />
          <circle cx="308" cy="261" r="5" fill="#F59E0B" />
          <path d="M306 259 Q308 262 311 260" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* 7. Text: WASH & DRY */}
      <g id="wash-and-dry-text" fill="#18181B">
        {/* WASH */}
        <text
          x="396"
          y="200"
          fontFamily="'Kanit', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="36"
          textAnchor="middle"
          letterSpacing="1"
        >
          WASH
        </text>

        {/* & */}
        <text
          x="396"
          y="244"
          fontFamily="'Kanit', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="38"
          textAnchor="middle"
        >
          &amp;
        </text>

        {/* DRY */}
        <text
          x="396"
          y="288"
          fontFamily="'Kanit', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="36"
          textAnchor="middle"
          letterSpacing="1"
        >
          DRY
        </text>
      </g>

      {/* 8. Bottom Thai Text: ร้านสะดวกซัก 24 ชั่วโมง */}
      <g id="thai-subtitle">
        <text
          x="250"
          y="348"
          fontFamily="'Kanit', 'Noto Sans Thai', sans-serif"
          fontWeight="700"
          fontSize="32"
          fill="#18181B"
          textAnchor="middle"
          letterSpacing="2.5"
        >
          ร้านสะดวกซัก 24 ชั่วโมง
        </text>
      </g>
    </svg>
  );
};

export default BBWashLogo;
