interface CodeGymLandscapeProps {
  className?: string;
  compact?: boolean;
  developer?: boolean;
}

export function CodeGymLandscape({
  className = '',
  compact = false,
  developer = false,
}: CodeGymLandscapeProps) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 900 420"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient
            id="cg-sky"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#071326" />
            <stop offset="43%" stopColor="#111340" />
            <stop offset="100%" stopColor="#48209b" />
          </linearGradient>

          <linearGradient
            id="cg-back"
            x1="0"
            x2="1"
          >
            <stop offset="0%" stopColor="#162752" />
            <stop offset="100%" stopColor="#5431a1" />
          </linearGradient>

          <linearGradient
            id="cg-mid"
            x1="0"
            x2="1"
          >
            <stop offset="0%" stopColor="#0d1b39" />
            <stop offset="100%" stopColor="#281755" />
          </linearGradient>

          <linearGradient
            id="cg-front"
            x1="0"
            x2="1"
          >
            <stop offset="0%" stopColor="#050d1b" />
            <stop offset="100%" stopColor="#11122f" />
          </linearGradient>

          <radialGradient
            id="cg-moon"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="#b18aff" />
            <stop offset="100%" stopColor="#6232df" />
          </radialGradient>

          <radialGradient
            id="cg-moon-glow"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="#8057ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8057ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="900" height="420" fill="url(#cg-sky)" />

        <circle
          cx="735"
          cy="82"
          r="91"
          fill="url(#cg-moon-glow)"
        />

        <circle
          cx="735"
          cy="82"
          r="48"
          fill="url(#cg-moon)"
        />

        <path
          d="M0 269 L105 205 L178 241 L292 126 L382 227 L475 156 L558 236 L657 138 L900 271 L900 420 L0 420 Z"
          fill="url(#cg-back)"
        />

        <path
          d="M292 126 L337 192 L308 179 L287 209 L262 174 Z"
          fill="#7150d0"
          opacity="0.72"
        />

        <path
          d="M657 138 L697 193 L670 180 L646 212 L620 176 Z"
          fill="#7e52dc"
          opacity="0.7"
        />

        <path
          d="M0 322 L130 245 L228 303 L342 210 L442 302 L565 218 L654 280 L752 213 L900 297 L900 420 L0 420 Z"
          fill="url(#cg-mid)"
        />

        <path
          d="M0 363 C152 313 265 350 402 318 C542 286 675 317 900 265 L900 420 L0 420 Z"
          fill="url(#cg-front)"
        />

        <g opacity="0.88">
          <path d="M42 375 l24 -68 l24 68 z" fill="#091326" />
          <path d="M84 381 l20 -55 l20 55 z" fill="#0a1429" />
          <path d="M798 366 l28 -79 l28 79 z" fill="#0b1128" />
          <path d="M840 380 l22 -61 l22 61 z" fill="#0a1025" />
        </g>

        {developer ? (
          <g transform="translate(650 230)">
            <ellipse
              cx="72"
              cy="51"
              rx="19"
              ry="22"
              fill="#070a17"
            />

            <path
              d="M52 72 C56 55 87 54 94 75 L105 126 L69 139 L39 112 Z"
              fill="#080b18"
            />

            <path
              d="M68 131 L34 176 L9 170 L51 116 Z"
              fill="#060815"
            />

            <path
              d="M91 126 L133 157 L121 173 L78 143 Z"
              fill="#060815"
            />

            <path
              d="M42 108 L20 127 L7 116 L35 87 Z"
              fill="#14133d"
            />

            <path
              d="M17 127 L4 146"
              stroke="#070915"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <path
              d="M105 156 L148 171"
              stroke="#070915"
              strokeWidth="12"
              strokeLinecap="round"
            />

            <path
              d="M7 174 C53 160 104 168 166 149 L185 177 C112 199 51 196 0 194 Z"
              fill="#080c19"
            />
          </g>
        ) : null}
      </svg>

      {!compact ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-background/15 via-transparent to-primary/5" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/70 to-transparent" />
        </>
      ) : null}
    </div>
  );
}
