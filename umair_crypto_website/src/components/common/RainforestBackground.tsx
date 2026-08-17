import './RainforestBackground.css';

export default function RainforestBackground() {
  return (
    <div className="rainforest-env" aria-hidden="true">

      <div className="rainforest-canopy-light" />
      <div className="rainforest-foliage-mist" />

      <div className="rainforest-vines-wrapper">

        <svg
          className="vine vine--left"
          viewBox="0 0 120 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 0 C40 80, -10 160, 30 240 C50 290, 10 350, 25 400"
            stroke="#1d3d2c"
            strokeWidth="3"
            fill="none"
          />

          <path d="M20 50 Q40 40, 35 65 Z" fill="#29543d" />
          <path d="M12 120 Q-10 110, -2 135 Z" fill="#1e422f" />
          <path d="M28 200 Q50 190, 42 215 Z" fill="#2d5e44" />
          <path d="M18 310 Q-2 300, 8 325 Z" fill="#1e422f" />
        </svg>

        <div className="vine-monkey-group">
          <svg
            className="vine vine--right"
            viewBox="0 0 140 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 0 C70 100, 120 200, 80 300 C60 350, 90 410, 75 450"
              stroke="#1d3d2c"
              strokeWidth="3.5"
              fill="none"
            />

            <path d="M90 60 Q60 50, 70 75 Z" fill="#2d5e44" />
            <path d="M105 150 Q130 140, 120 165 Z" fill="#1e422f" />
            <path d="M82 240 Q55 230, 65 255 Z" fill="#29543d" />
            <path d="M88 360 Q115 350, 102 375 Z" fill="#1e422f" />
          </svg>

          <div className="rainforest-monkey">
            <svg
              width="50"
              height="65"
              viewBox="0 0 60 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >

              <path
                d="M30 0 C30 15, 20 20, 25 30"
                stroke="#6e4d28"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              <ellipse cx="30" cy="45" rx="14" ry="18" fill="#54391c" />

              <ellipse cx="30" cy="47" rx="9" ry="12" fill="#8c683c" />

              <circle cx="30" cy="25" r="12" fill="#54391c" />

              <circle cx="17" cy="24" r="4" fill="#6e4d28" />
              <circle cx="43" cy="24" r="4" fill="#6e4d28" />
              <circle cx="17" cy="24" r="2" fill="#8c683c" />
              <circle cx="43" cy="24" r="2" fill="#8c683c" />

              <ellipse cx="30" cy="27" rx="8" ry="7" fill="#cfa570" />

              <circle cx="26" cy="25" r="1.5" fill="#111" />
              <circle cx="34" cy="25" r="1.5" fill="#111" />

              <path
                d="M27 30 Q30 33, 33 30"
                stroke="#4a2e12"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />

              <path
                d="M18 40 Q10 20, 25 5"
                stroke="#54391c"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M42 40 Q50 20, 35 5"
                stroke="#54391c"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              <ellipse cx="23" cy="62" rx="4" ry="3" fill="#6e4d28" />
              <ellipse cx="37" cy="62" rx="4" ry="3" fill="#6e4d28" />
            </svg>
          </div>
        </div>
      </div>

      <div className="falling-bananas-layer">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`falling-banana falling-banana--${i + 1}`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 22 C10 28, 22 28, 26 18 C28 13, 27 8, 27 6 C25 6, 20 7, 15 11 C9 15, 5 18, 6 22 Z"
                fill="#F5A623"
                opacity="0.85"
              />
              <path
                d="M27 6 C28 4, 26 3, 25 4 C24 5, 25 6, 27 6 Z"
                fill="#8C6111"
              />
              <path
                d="M8 23 C12 27, 21 26, 25 18"
                stroke="#FFD700"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
