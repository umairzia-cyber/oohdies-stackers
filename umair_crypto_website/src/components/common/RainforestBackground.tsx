import './RainforestBackground.css';

/*
 * Ambient jungle layer. Every fill/stroke is set from CSS rather than as an SVG
 * presentation attribute, because presentation attributes cannot resolve var()
 * — keeping the colours in CSS is what lets the art follow the palette.
 */
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
            className="vine__stem"
            d="M20 0 C40 80, -10 160, 30 240 C50 290, 10 350, 25 400"
            strokeWidth="3"
          />

          <path className="vine__leaf vine__leaf--a" d="M20 50 Q40 40, 35 65 Z" />
          <path className="vine__leaf vine__leaf--b" d="M12 120 Q-10 110, -2 135 Z" />
          <path className="vine__leaf vine__leaf--c" d="M28 200 Q50 190, 42 215 Z" />
          <path className="vine__leaf vine__leaf--b" d="M18 310 Q-2 300, 8 325 Z" />
        </svg>

        <div className="vine-monkey-group">
          <svg
            className="vine vine--right"
            viewBox="0 0 140 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="vine__stem"
              d="M100 0 C70 100, 120 200, 80 300 C60 350, 90 410, 75 450"
              strokeWidth="3.5"
            />

            <path className="vine__leaf vine__leaf--c" d="M90 60 Q60 50, 70 75 Z" />
            <path className="vine__leaf vine__leaf--b" d="M105 150 Q130 140, 120 165 Z" />
            <path className="vine__leaf vine__leaf--a" d="M82 240 Q55 230, 65 255 Z" />
            <path className="vine__leaf vine__leaf--b" d="M88 360 Q115 350, 102 375 Z" />
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
                className="monkey__tail"
                d="M30 0 C30 15, 20 20, 25 30"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <ellipse className="monkey__body" cx="30" cy="45" rx="14" ry="18" />

              <ellipse className="monkey__belly" cx="30" cy="47" rx="9" ry="12" />

              <circle className="monkey__head" cx="30" cy="25" r="12" />

              <circle className="monkey__ear" cx="17" cy="24" r="4" />
              <circle className="monkey__ear" cx="43" cy="24" r="4" />
              <circle className="monkey__ear-inner" cx="17" cy="24" r="2" />
              <circle className="monkey__ear-inner" cx="43" cy="24" r="2" />

              <ellipse className="monkey__face" cx="30" cy="27" rx="8" ry="7" />

              <circle className="monkey__eye" cx="26" cy="25" r="1.5" />
              <circle className="monkey__eye" cx="34" cy="25" r="1.5" />

              <path
                className="monkey__mouth"
                d="M27 30 Q30 33, 33 30"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              <path
                className="monkey__arm"
                d="M18 40 Q10 20, 25 5"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                className="monkey__arm"
                d="M42 40 Q50 20, 35 5"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              <ellipse className="monkey__foot" cx="23" cy="62" rx="4" ry="3" />
              <ellipse className="monkey__foot" cx="37" cy="62" rx="4" ry="3" />
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
                className="banana__body"
                d="M6 22 C10 28, 22 28, 26 18 C28 13, 27 8, 27 6 C25 6, 20 7, 15 11 C9 15, 5 18, 6 22 Z"
              />
              <path
                className="banana__stem"
                d="M27 6 C28 4, 26 3, 25 4 C24 5, 25 6, 27 6 Z"
              />
              <path
                className="banana__shine"
                d="M8 23 C12 27, 21 26, 25 18"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
