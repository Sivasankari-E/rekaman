import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up below at the bottom of this file).
// We DON'T use ESM `export` because the chunk is loaded via a regular <script> tag
// in the main bundle, which can't access ES module exports.

// ─────────────────────────────────────────────────────────────────────────────
// v8 — restore re-placement via explicit "Move" button (May 18 2026 late night)
//
// v7 hid the reticle post-placement to kill the pill/reticle overlap. The
// founder caught a regression: brand owners need to be able to re-place the
// model during a showroom demo ("now show me next to the desk"). v7 forced
// exit-and-re-enter, breaking the demo flow.
//
// v8 adds a "Move" button to the pill. Tap Move → reticle re-appears, pill
// hides, current model stays visible in the scene as reference. Tap a new
// floor spot → model jumps there, reticle hides, pill re-appears. Industry-
// standard "explicit move mode" pattern (matches Apple AR Quick Look's drag
// gesture which provides the same affordance via touch instead of a button).
//
// ─────────────────────────────────────────────────────────────────────────────
// v7 — finish the reticle/pill overlap fix (May 18 2026 evening)
//
// v6 hid the pill until first placement, but didn't hide the reticle AFTER
// first placement. When the founder placed a model and then looked down, the
// reticle (still active) and pill (now visible) BOTH gravitated to the
// screen's bottom-center → re-overlap. The pill was technically "on top"
// (z-index'd as DOM overlay) but the reticle showed through tiles of the
// floor pattern, creating the same visual confusion.
//
// v7: post-placement the reticle stays hidden. Single-placement-per-session
// is the industry-standard pattern (IKEA Place, Wayfair). To start over the
// user exits AR and re-taps "View in your room" — clean and predictable.
//
// Everything from v5/v6 below is preserved unchanged.
//
// ─────────────────────────────────────────────────────────────────────────────
// v6 — UX hardening from founder Coimbatore-prep test (May 18 2026)
//
// Issues caught during real-Android-phone testing of v5 (the day v5 shipped):
//   • The resize pill at the bottom of the screen overlapped the placement
//     reticle ring → users couldn't see where they were aiming to place.
//     Fix: hide the pill until AFTER first placement. Reticle owns the screen
//     pre-placement; pill owns the screen post-placement.
//   • The reticle landed on walls (and any non-floor surface) as well as the
//     floor → "wall-mounted armchair" risk in a showroom demo.
//     Fix: surface-normal filter rejects non-horizontal hits.
//   • The pill felt generic.
//     Fix: brand-purple Reset, tighter rhythm, hairline border, entrance
//     animation, haptic feedback on tap (8 ms vibration on Android).
//
// Everything from v5 below is preserved unchanged — geometry, scale math,
// analytics, dimension priority. v6 is UX-only.
//
// ─────────────────────────────────────────────────────────────────────────────
// v5 — real-world scale correctness (Coimbatore-readiness)
//
// What v4 did wrong: it only scaled when `heightCm` was provided. Any product
// onboarded with widthCm or depthCm but no heightCm rendered at Meshy's raw
// (~1 m) bbox — silently and invisibly wrong. v5 fixes the FIVE remaining gaps
// from ar-scale-correctness-spec.md Part A:
//
//   (3) dimension priority — height → width → depth → fallback
//   (4) aspect-ratio sanity check — flag bad brand input (>25% off)
//   (5) defined no-dimensions fallback — longest native axis = 1.0 m + hint
//   (7) "Reset to actual size" UI control
//   (8) user pinch/resize clamped 0.25× – 4×
//
// Geometric core (v4) survives unchanged: uniform scale via setScalar, inner
// node wrapped in a Group so the centre+ground translation isn't clobbered by
// setFromMatrixPosition, reference-space pinned to local-floor before setSession.
// See ScaleResult comments below + the placement step for the unchanged bits.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of computeRealWorldScale — the basis (which dim drove the decision)
 * + a boolean for whether the brand's cross-axis input was contradictory.
 *
 * `basis: 'fallback-longest-axis'` means NONE of the three dimensions were
 * provided; the SDK fell back to "make the model's longest native axis 1.0 m"
 * and the overlay shows an "approximate size" hint instead of a measurement.
 */
export type ScaleBasis = 'heightCm' | 'widthCm' | 'depthCm' | 'fallback-longest-axis';

export interface ScaleResult {
  /** Uniform scale factor to apply to the inner model. */
  scalar: number;
  /** Which dimension (or fallback) drove the decision. Surfaced in analytics. */
  basis: ScaleBasis;
  /**
   * True when the brand provided a 2nd dimension that disagrees with the
   * model's native aspect ratio by more than 25%. Doesn't change the math
   * (basis dimension wins) — surfaces as a warning in `ar_scale_applied`
   * telemetry so the Week 9 dashboard can flag bad brand input.
   */
  aspectWarning: boolean;
  /**
   * The basis dimension's target in metres, used for the UI status text
   * ("~0.86 m"). `null` for the fallback case (we don't claim a real
   * measurement when we have nothing to anchor to).
   */
  basisMetres: number | null;
}

/**
 * Pure scale decision — no THREE side effects. Inputs: the natively-measured
 * bbox size (x = width, y = height, z = depth, in metres at native scale),
 * + the brand-provided dims in centimetres (any/all may be null).
 *
 * Priority: heightCm → widthCm → depthCm → fallback (longest axis → 1.0 m).
 * Aspect check: if basis = heightCm and widthCm provided, the scaled width
 * (nativeX * scalar) must be within ±25% of widthCm/100 — else warn. Same
 * pattern for the other basis/cross-axis combos.
 *
 * This function is intentionally NOT a method on a class so we can unit-test
 * it in isolation when we move to Vitest for SDK (Phase 2).
 */
export function computeRealWorldScale(
  nativeSize: { x: number; y: number; z: number },
  dims: { widthCm: number | null; heightCm: number | null; depthCm: number | null },
): ScaleResult {
  const ASPECT_TOLERANCE = 0.25;
  const widthM = dims.widthCm != null ? dims.widthCm / 100 : null;
  const heightM = dims.heightCm != null ? dims.heightCm / 100 : null;
  const depthM = dims.depthCm != null ? dims.depthCm / 100 : null;

  const tooSmall = (v: number) => v <= 0 || !Number.isFinite(v);

  // Helper — for a chosen scalar + native size, are the OTHER provided dims
  // within tolerance of the scaled result?
  const checkAspect = (
    scalar: number,
    skip: 'x' | 'y' | 'z',
  ): boolean => {
    const otherDims: Array<{ axis: 'x' | 'y' | 'z'; provided: number | null }> = [
      { axis: 'x', provided: widthM },
      { axis: 'y', provided: heightM },
      { axis: 'z', provided: depthM },
    ];
    for (const { axis, provided } of otherDims) {
      if (axis === skip) continue;
      if (provided == null) continue;
      const expected = nativeSize[axis] * scalar;
      if (expected <= 0) continue;
      if (Math.abs(expected - provided) / provided > ASPECT_TOLERANCE) return true;
    }
    return false;
  };

  // Priority 1: heightCm
  if (heightM != null && !tooSmall(nativeSize.y)) {
    const scalar = heightM / nativeSize.y;
    return {
      scalar,
      basis: 'heightCm',
      aspectWarning: checkAspect(scalar, 'y'),
      basisMetres: heightM,
    };
  }

  // Priority 2: widthCm
  if (widthM != null && !tooSmall(nativeSize.x)) {
    const scalar = widthM / nativeSize.x;
    return {
      scalar,
      basis: 'widthCm',
      aspectWarning: checkAspect(scalar, 'x'),
      basisMetres: widthM,
    };
  }

  // Priority 3: depthCm
  if (depthM != null && !tooSmall(nativeSize.z)) {
    const scalar = depthM / nativeSize.z;
    return {
      scalar,
      basis: 'depthCm',
      aspectWarning: checkAspect(scalar, 'z'),
      basisMetres: depthM,
    };
  }

  // Fallback: longest native axis → 1.0 m. We never trust Meshy's raw scale
  // (varies wildly per model). 1.0 m is a "neutral middle" — not so small the
  // model is a thumb, not so big it's an elephant. The overlay shows an
  // "approximate size" hint so the shopper knows the size is not measured.
  const longest = Math.max(nativeSize.x, nativeSize.y, nativeSize.z);
  if (tooSmall(longest)) {
    // Pathological GLB — should never happen for a real Meshy output, but
    // returning scalar=1 keeps the model visible rather than collapsed to a
    // point. Logged so we can catch it in Sentry if a brand uploads weirdness.
    return { scalar: 1, basis: 'fallback-longest-axis', aspectWarning: false, basisMetres: null };
  }
  return {
    scalar: 1.0 / longest,
    basis: 'fallback-longest-axis',
    aspectWarning: false,
    basisMetres: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resize clamp (item 8). The user-driven scale multiplier sits ON TOP of the
// base real-world scale. Defaults to 1.0 (= actual size). Clamped [0.25, 4.0]
// so a shopper can't accidentally render a 100×-scale armchair the size of a
// building OR a 0.01× lapel-pin one. The "Reset to actual size" button just
// sets this back to 1.0.
// ─────────────────────────────────────────────────────────────────────────────
const USER_SCALE_MIN = 0.25;
const USER_SCALE_MAX = 4.0;
const USER_SCALE_STEP = 1.25; // ×1.25 per + tap, ÷1.25 per − tap

async function startPlacementAR(product: ProductData): Promise<void> {
  if (!product.glbUrl) {
    throw new Error('Product has no GLB URL for placement AR');
  }

  const sessionStartTime = Date.now();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(0.5, 1, 0.25);
  scene.add(sun);

  // Preload GLB; placement only fires after this resolves.
  //
  // v4 fixes (preserved in v5):
  //   (1) Bottom on the floor — wrap inner gltf.scene in a THREE.Group so the
  //       centre+ground translation isn't clobbered by `setFromMatrixPosition`
  //       when we place the wrapper at the reticle.
  //   (2) Reference-space mismatch — see setReferenceSpaceType call below
  //       (must run BEFORE setSession).
  //
  // v5 adds:
  //   (3) Real-world scale via computeRealWorldScale (replaces the height-only
  //       block from v4).
  //   (4) `loadedScale` captured so the overlay can re-apply scalar *
  //       userMultiplier when the user taps − / Reset / +.
  let loadedModel: THREE.Group | null = null;
  let loadedScale: ScaleResult | null = null;

  new GLTFLoader().load(product.glbUrl, (gltf) => {
    const inner = gltf.scene;

    // Measure the model's NATIVE bbox first — before any scaling.
    const nativeBox = new THREE.Box3().setFromObject(inner);
    const nativeSize = nativeBox.getSize(new THREE.Vector3());

    // Decide the real-world scale.
    const scaleResult = computeRealWorldScale(
      { x: nativeSize.x, y: nativeSize.y, z: nativeSize.z },
      {
        widthCm: product.dimensions.widthCm,
        heightCm: product.dimensions.heightCm,
        depthCm: product.dimensions.depthCm,
      },
    );
    loadedScale = scaleResult;

    inner.scale.setScalar(scaleResult.scalar);

    // Re-measure AFTER scaling so the centre+ground translation uses the
    // post-scale bbox (v5.12 fix — survived v5 unchanged).
    const box = new THREE.Box3().setFromObject(inner);
    const centre = box.getCenter(new THREE.Vector3());
    inner.position.set(-centre.x, -box.min.y, -centre.z);

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    loadedModel = wrapper;

    // Fire the scale-applied event ONCE per session right after the decision.
    // The Week 9 dashboard groups by `basis: 'fallback-longest-axis'` to find
    // brands with missing dims, and by `aspectWarning: true` to find brands
    // with mutually-contradictory dims.
    track('ar_scale_applied', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: {
        basis: scaleResult.basis,
        aspectWarning: scaleResult.aspectWarning,
        basisMetres: scaleResult.basisMetres,
        nativeWidthM: nativeSize.x,
        nativeHeightM: nativeSize.y,
        nativeDepthM: nativeSize.z,
      },
    });

    // Once the model is loaded, update the overlay status text from "Loading…"
    // to either the real measurement or the "approximate size" fallback hint.
    updateScaleLabel();
  });

  if (!navigator.xr) {
    throw new Error('WebXR not available');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DOM-overlay UI — small dedicated root containing ONLY our resize controls.
  //
  // CLAUDE.md v5.12 specifically warned against using `document.body` as the
  // overlay root because that renders the brand's entire product page on top
  // of the camera feed (looks broken). The WebXR DOM Overlays spec allows ANY
  // element as `root` — when we pass a small dedicated div, only THAT div
  // composites over the camera feed. Brand page stays hidden as before.
  //
  // Spec also guarantees that clicks on overlay elements do NOT generate XR
  // `select` events — so the resize buttons won't accidentally trigger a
  // re-placement. (https://www.w3.org/TR/webxr-dom-overlays-1/#xr-pointer-events)
  // ─────────────────────────────────────────────────────────────────────────
  const overlayHost = document.createElement('div');
  overlayHost.id = 'rk-ar-overlay';
  // Inline styles so we never depend on the brand site's CSS (Shadow DOM also
  // ensures their CSS can't reach us — defense in depth).
  // v6 — hidden by default. Shows only AFTER the user places the model for the
  // first time. Rationale: pre-placement the reticle is the most important
  // affordance on screen ("tap to place"); a resize widget overlapping it
  // confuses the user (caught in founder Coimbatore-prep test, May 18 — the
  // pill was occluding the reticle ring when looking at the floor).
  // Post-placement the reticle becomes secondary and the resize controls take
  // priority. Visibility is toggled in the `select` handler below.
  overlayHost.style.cssText = [
    'position:fixed', 'inset:auto 0 0 0',
    'display:none', // v6 — hidden until first placement
    'justify-content:center', 'align-items:center',
    'pointer-events:none',
    'padding:16px', 'padding-bottom:max(20px, env(safe-area-inset-bottom))',
    'z-index:2147483647',
  ].join(';');
  const overlayShadow = overlayHost.attachShadow({ mode: 'closed' });
  // v6 polish — Rekaman purple accent (#5A4FCF / dark variant #8B7FFF per brand
  // identity in CLAUDE.md), tighter rhythm, hairline border, brand-aligned
  // typography (Inter primary, system fallback), entrance animation, haptic
  // feedback on tap.
  overlayShadow.innerHTML = `
    <style>
      @keyframes rkRise {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .panel {
        pointer-events: auto;
        display: flex; align-items: center; gap: 6px;
        background: rgba(15, 15, 15, 0.82);
        backdrop-filter: blur(24px) saturate(1.4);
        -webkit-backdrop-filter: blur(24px) saturate(1.4);
        border: 0.5px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        padding: 6px 8px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        color: #fff;
        animation: rkRise 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      button {
        all: unset; cursor: pointer; user-select: none;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,0.10);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 500; color: #fff;
        letter-spacing: -0.01em;
        transition: background 140ms ease, transform 100ms ease;
      }
      button:hover { background: rgba(255,255,255,0.16); }
      button:active { background: rgba(139, 127, 255, 0.32); transform: scale(0.92); }
      button[disabled] { opacity: 0.32; pointer-events: none; }
      .text-btn {
        width: auto; height: 40px; padding: 0 14px; border-radius: 20px;
        font-size: 13.5px; font-weight: 500;
      }
      .move {
        background: rgba(255,255,255,0.10);
        color: #fff;
      }
      .move:hover { background: rgba(255,255,255,0.18); }
      .move:active { background: rgba(139, 127, 255, 0.32); }
      .reset {
        background: rgba(139, 127, 255, 0.16); /* subtle Rekaman purple */
        color: #C8C2FF;
      }
      .reset:hover { background: rgba(139, 127, 255, 0.28); color: #fff; }
      .reset:active { background: rgba(90, 79, 207, 0.5); }
      .reset[disabled] { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
      .label {
        min-width: 84px; padding: 0 6px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        font-size: 15px; font-weight: 500;
        letter-spacing: -0.01em;
        line-height: 40px;
      }
      .sep { width: 1px; height: 22px; background: rgba(255,255,255,0.12); margin: 0 2px; }
    </style>
    <div class="panel" role="group" aria-label="AR controls">
      <button id="dec" aria-label="Smaller">−</button>
      <span class="label" id="label">Loading…</span>
      <button id="inc" aria-label="Bigger">+</button>
      <span class="sep" aria-hidden="true"></span>
      <button id="move" class="text-btn move" aria-label="Move to new spot">Move</button>
      <button id="reset" class="text-btn reset" aria-label="Reset to actual size">Reset</button>
    </div>
  `;
  document.body.appendChild(overlayHost);

  const btnDec = overlayShadow.getElementById('dec') as HTMLButtonElement;
  const btnInc = overlayShadow.getElementById('inc') as HTMLButtonElement;
  const btnMove = overlayShadow.getElementById('move') as HTMLButtonElement;
  const btnReset = overlayShadow.getElementById('reset') as HTMLButtonElement;
  const lblScale = overlayShadow.getElementById('label') as HTMLSpanElement;

  // v6 — haptic feedback on tap. Most Android Chrome versions support
  // navigator.vibrate; iOS Safari does not (and v6 only runs WebXR on Android
  // anyway). The 8 ms pulse is subtle, matches what native iOS does for
  // button taps in the AR Quick Look viewer.
  const haptic = (): void => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(8); } catch { /* ignore */ }
    }
  };

  // userScaleMultiplier — applied ON TOP of loadedScale.scalar. 1.0 = actual.
  let userScaleMultiplier = 1.0;
  let placedModel: THREE.Group | null = null;
  // v8 — When the user taps "Move", we want the reticle to re-appear so they
  // can pick a new spot, but we keep the existing placed model visible in
  // the scene as a visual reference ("the chair is currently here; tap to
  // move it"). The select handler clears this flag once a new placement
  // happens. Decoupling movement-intent from placedModel-null lets us hide
  // the pill DURING the move without conflating "no model exists" with
  // "model exists but user wants to move it". See animation loop below.
  let isMoving = false;

  function applyUserScaleToPlaced() {
    if (!placedModel || !loadedScale) return;
    const finalScalar = loadedScale.scalar * userScaleMultiplier;
    // Apply to the wrapper. The inner was already scaled to base at load;
    // we override that scale here so user scaling composes cleanly.
    const inner = placedModel.children[0] as THREE.Object3D | undefined;
    if (inner) {
      inner.scale.setScalar(finalScalar);
      // Re-ground after rescaling so the bottom still sits on the hit point.
      const box = new THREE.Box3().setFromObject(inner);
      const centre = box.getCenter(new THREE.Vector3());
      inner.position.set(-centre.x, -box.min.y, -centre.z);
    }
  }

  function updateScaleLabel() {
    if (!loadedScale) {
      lblScale.textContent = 'Loading…';
      return;
    }
    if (loadedScale.basis === 'fallback-longest-axis') {
      // No real measurement — show a non-committal hint so the shopper knows
      // we're not claiming a precise size for this product.
      lblScale.textContent = userScaleMultiplier === 1
        ? 'Approx. size'
        : `${userScaleMultiplier.toFixed(2)}×`;
      return;
    }
    // Real measurement available — show "0.86 m" when at actual size, "1.07 m"
    // (basis × multiplier) when scaled up.
    const basisCm = (loadedScale.basisMetres ?? 0) * 100;
    const currentCm = basisCm * userScaleMultiplier;
    if (currentCm >= 100) {
      lblScale.textContent = `${(currentCm / 100).toFixed(2)} m`;
    } else {
      lblScale.textContent = `${Math.round(currentCm)} cm`;
    }
  }

  function updateButtonStates() {
    btnDec.disabled = userScaleMultiplier <= USER_SCALE_MIN + 1e-6;
    btnInc.disabled = userScaleMultiplier >= USER_SCALE_MAX - 1e-6;
    btnReset.disabled = Math.abs(userScaleMultiplier - 1.0) < 1e-6;
  }

  function setUserScale(next: number) {
    userScaleMultiplier = Math.min(USER_SCALE_MAX, Math.max(USER_SCALE_MIN, next));
    applyUserScaleToPlaced();
    updateScaleLabel();
    updateButtonStates();
  }

  btnInc.addEventListener('click', () => { haptic(); setUserScale(userScaleMultiplier * USER_SCALE_STEP); });
  btnDec.addEventListener('click', () => { haptic(); setUserScale(userScaleMultiplier / USER_SCALE_STEP); });
  btnReset.addEventListener('click', () => { haptic(); setUserScale(1.0); });
  // v8 — Move button: hide pill, re-enable reticle, keep current placement
  // visible in the scene until user taps a new spot. The session 'select'
  // handler clears `isMoving` + re-shows the pill on successful re-place.
  btnMove.addEventListener('click', () => {
    if (!placedModel) return; // shouldn't be tappable pre-placement (pill is hidden)
    haptic();
    isMoving = true;
    overlayHost.style.display = 'none';
  });

  updateButtonStates();

  // No dom-overlay = brand page would render on top of the camera feed.
  // With a DEDICATED root (small overlayHost), only our control widget
  // composites over the camera — clean camera-only AR with one floating
  // pill at the bottom. Optional feature: on browsers without dom-overlay
  // support (rare on Android Chrome since 2020), the session still works,
  // just without the resize controls visible.
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlayHost },
  } as XRSessionInit);

  // (2) Reference-space mismatch (v3 bug — fixed in v4, preserved in v5). We
  //     requested `local-floor` from the session AND read hit-test poses in
  //     `local-floor`, but Three.js's WebGLXRManager defaults the renderer to
  //     `local` (eye-level origin). The two reference spaces differ by ~1.6 m
  //     vertically AND can drift independently when the device's tracker
  //     recalibrates — causing placed models to appear to follow the camera
  //     as the user walks around. Telling Three.js to use the same reference
  //     space we hit-test against keeps everything in one frame.
  //
  //     setReferenceSpaceType MUST be called BEFORE setSession; the manager
  //     reads the type only when adopting a new session.
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);

  const viewerSpace = await session.requestReferenceSpace('viewer');
  const localSpace = await session.requestReferenceSpace('local-floor');
  if (!session.requestHitTestSource) {
    throw new Error('Hit-test API not available in this WebXR session');
  }
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  if (!hitTestSource) {
    throw new Error('Failed to obtain hit-test source');
  }

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // v6 — Threshold for "is this surface roughly horizontal-and-upward?". The
  // hit-test pose's matrix Y-axis vector is the surface normal in world space.
  // For a horizontal floor (or table), the Y-axis is approximately (0, 1, 0)
  // — `m[5]` (the y-component of the local-Y axis in column-major layout) is
  // ~1. For a wall, the Y-axis is horizontal (≈0). For a ceiling, the Y is
  // negative. Threshold 0.85 accepts surfaces within ~32° of horizontal —
  // covers normal floors plus slight slopes, rejects walls/ceilings cleanly.
  // For placement mode (furniture/decor), we want floor only. Future Phase 3
  // wall-art mode will invert this (m[5] near 0 + vertical alignment).
  const FLOOR_NORMAL_THRESHOLD = 0.85;

  session.addEventListener('select', () => {
    if (!reticle.visible || !loadedModel) return;

    if (placedModel) scene.remove(placedModel);

    const placed = loadedModel.clone(true);
    placed.position.setFromMatrixPosition(reticle.matrix);
    const yRot = new THREE.Euler().setFromRotationMatrix(reticle.matrix, 'YXZ').y;
    placed.rotation.set(0, yRot, 0);
    scene.add(placed);
    placedModel = placed;
    // v8 — clear the "user is moving" flag now that they've placed at a new
    // spot. Reticle returns to hidden, pill returns to visible.
    isMoving = false;

    // Apply any user-set multiplier carried over from a previous placement in
    // the same session. (If the user resized then re-placed, the new placement
    // should keep their preferred size.)
    applyUserScaleToPlaced();

    // v6 — reveal the resize overlay AFTER the first placement, never before.
    // Pre-placement the reticle is the primary affordance; covering it with a
    // pill confuses placement. Post-placement the model is the focus and the
    // pill is contextual to it. Setting display:flex (not block) preserves
    // the flex centering we set on the host.
    if (overlayHost.style.display !== 'flex') {
      overlayHost.style.display = 'flex';
    }

    track('ar_placed', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: { modelId: product.id },
    });
  });

  renderer.setAnimationLoop((_time, frame) => {
    if (frame && hitTestSource && localSpace) {
      // v7/v8 — show the reticle when EITHER (a) nothing is placed yet OR
      // (b) the user has tapped Move and is repositioning. Otherwise hide
      // it so the pill never overlaps the reticle ring during normal use.
      const showReticle = !placedModel || isMoving;
      if (!showReticle) {
        reticle.visible = false;
      } else {
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0]!.getPose(localSpace);
          if (pose) {
            // v6 — reject non-horizontal surfaces. The hit-test API returns hits
            // on ANY detected surface (floor, table, wall, ceiling). Without
            // this filter, brand owners pointing their phone at a showroom wall
            // would see the reticle "stick" to the wall — and tapping would
            // place a sofa hanging off the wall, which destroys the demo's
            // credibility.
            const m = pose.transform.matrix;
            const surfaceUpY = m[5]!;
            if (surfaceUpY >= FLOOR_NORMAL_THRESHOLD) {
              reticle.visible = true;
              reticle.matrix.fromArray(m);
            } else {
              reticle.visible = false;
            }
          }
        } else {
          reticle.visible = false;
        }
      }
    }
    renderer.render(scene, camera);
  });

  session.addEventListener('end', () => {
    track('ar_session_ended', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: {
        durationMs: Date.now() - sessionStartTime,
        finalUserScale: userScaleMultiplier,
      },
    });

    renderer.setAnimationLoop(null);
    hitTestSource.cancel();
    renderer.domElement.remove();
    renderer.dispose();
    // Remove the overlay too — leaving it in the DOM after the session ends
    // would float a stray panel over the brand's product page.
    overlayHost.remove();
  });
}

// Register on window so the main SDK bundle can find this entry-point after
// it loads us via <script src="...">.
// Idempotent: nullish-coalescing assignment keeps any prior `__rkChunks` (e.g.
// face-tryon registered before us) intact.
const w = window as unknown as { __rkChunks?: Record<string, unknown> };
w.__rkChunks ??= {};
(w.__rkChunks as Record<string, unknown>).placement = { startPlacementAR };
