import './ScreenTexture.css';

/*
 * Purely decorative CRT layer: scanlines plus a vignette, both very low
 * contrast. Sits above the page but below all chrome, and never takes pointer
 * events. Two elements so the vignette does not inherit the scanline tiling.
 */
export default function ScreenTexture() {
  return (
    <div className="screen-texture" aria-hidden="true">
      <div className="screen-texture__scanlines" />
      <div className="screen-texture__vignette" />
    </div>
  );
}
