import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up below at the bottom of this file).
// We DON'T use ESM `export` because the chunk is loaded via a regular <script> tag
// in the main bundle, which can't access ES module exports.

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
  overlayHost.style.cssText = [
    'position:fixed', 'inset:auto 0 0 0',
    'display:flex', 'justify-content:center', 'align-items:center',
    'pointer-events:none', // Children re-enable pointer-events selectively
    'padding:16px', 'padding-bottom:max(16px, env(safe-area-inset-bottom))',
    'z-index:2147483647',
  ].join(';');
  const overlayShadow = overlayHost.attachShadow({ mode: 'closed' });
  overlayShadow.innerHTML = `
    <style>
      .panel {
        pointer-events: auto;
        display: flex; align-items: center; gap: 10px;
        background: rgba(15, 15, 15, 0.75);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border-radius: 999px;
        padding: 8px 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        color: #fff; font-size: 14px; line-height: 1;
      }
      button {
        all: unset; cursor: pointer; user-select: none;
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 500; color: #fff;
        transition: background 120ms ease, transform 80ms ease;
      }
      button:active { background: rgba(255,255,255,0.24); transform: scale(0.94); }
      button[disabled] { opacity: 0.4; pointer-events: none; }
      .reset {
        width: auto; height: 36px; padding: 0 14px; border-radius: 18px;
        font-size: 13px; font-weight: 500;
      }
      .label { min-width: 78px; text-align: center; font-variant-numeric: tabular-nums; font-size: 13px; opacity: 0.85; }
    </style>
    <div class="panel" role="group" aria-label="Resize model">
      <button id="dec" aria-label="Smaller">−</button>
      <span class="label" id="label">Loading…</span>
      <button id="inc" aria-label="Bigger">+</button>
      <button id="reset" class="reset" aria-label="Reset to actual size">Reset</button>
    </div>
  `;
  document.body.appendChild(overlayHost);

  const btnDec = overlayShadow.getElementById('dec') as HTMLButtonElement;
  const btnInc = overlayShadow.getElementById('inc') as HTMLButtonElement;
  const btnReset = overlayShadow.getElementById('reset') as HTMLButtonElement;
  const lblScale = overlayShadow.getElementById('label') as HTMLSpanElement;

  // userScaleMultiplier — applied ON TOP of loadedScale.scalar. 1.0 = actual.
  let userScaleMultiplier = 1.0;
  let placedModel: THREE.Group | null = null;

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

  btnInc.addEventListener('click', () => setUserScale(userScaleMultiplier * USER_SCALE_STEP));
  btnDec.addEventListener('click', () => setUserScale(userScaleMultiplier / USER_SCALE_STEP));
  btnReset.addEventListener('click', () => setUserScale(1.0));

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

  session.addEventListener('select', () => {
    if (!reticle.visible || !loadedModel) return;

    if (placedModel) scene.remove(placedModel);

    const placed = loadedModel.clone(true);
    placed.position.setFromMatrixPosition(reticle.matrix);
    const yRot = new THREE.Euler().setFromRotationMatrix(reticle.matrix, 'YXZ').y;
    placed.rotation.set(0, yRot, 0);
    scene.add(placed);
    placedModel = placed;

    // Apply any user-set multiplier carried over from a previous placement in
    // the same session. (If the user resized then re-placed, the new placement
    // should keep their preferred size.)
    applyUserScaleToPlaced();

    track('ar_placed', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: { modelId: product.id },
    });
  });

  renderer.setAnimationLoop((_time, frame) => {
    if (frame && hitTestSource && localSpace) {
      const results = frame.getHitTestResults(hitTestSource);
      if (results.length > 0) {
        const pose = results[0]!.getPose(localSpace);
        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        reticle.visible = false;
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
