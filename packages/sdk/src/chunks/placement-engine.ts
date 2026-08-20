import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up below at the bottom of this file).
// We DON'T use ESM `export` because the chunk is loaded via a regular <script> tag
// in the main bundle, which can't access ES module exports.

// ─────────────────────────────────────────────────────────────────────────────
// v11 — fix v10's session-killing overlay removal (May 20 2026 late evening)
//
// v10's `dismissHint()` called `overlayHost.remove()` 500ms after the CSS
// fade completed. That removal was a WebXR spec violation: the dom-overlay
// root MUST remain in the document for the session's lifetime. Removing it
// signals the browser to end the session. Founder caught this on first
// real-phone test: camera closed itself ~500ms after the reticle appeared.
//
// v11 fix: never remove `overlayHost` mid-session. Just hide the inner
// `.hint` pill via display:none after the fade. The overlay host stays as
// an invisible empty container until the session 'end' handler removes it.
//
// ─────────────────────────────────────────────────────────────────────────────
// v10 — "Move your phone slowly" loading hint (May 20 2026)
//
// Founder hit the standard WebXR timing gap during real-phone testing:
// Chrome's camera feed appears within ~500ms of session start, but ARCore
// takes another 1-3 seconds to scan the environment and detect the first
// floor plane. During that window, the user sees a blank camera with no
// reticle and wonders if the AR is broken.
//
// v10 fix: a non-interactive hint pill at ~30% from the top of the screen
// ("Move your phone slowly across the floor") shows from session start and
// fades out the moment ARCore returns the first valid floor hit. After fade
// the AR view is clean camera-only exactly as in v9.
//
// Why this is safe re-using dom-overlay (which v5-v8 abused and v9 dropped):
//   • Non-interactive — no buttons, no taps, no `select` event hijack risk
//   • Self-dismissing — fades out automatically; never coexists with the
//     reticle for more than the 400ms fade animation
//   • Positioned at the TOP of the screen — nowhere near where the reticle
//     naturally appears (bottom-center, where the floor is looking-direction)
//
// ─────────────────────────────────────────────────────────────────────────────
// v9 — simplification (May 19 2026)
//
// v5-v8 added an in-AR dom-overlay pill with − / + / Reset / Move buttons.
// During Coimbatore-prep testing the founder hit overlap regressions and
// cache-of-overlay-changes problems three iterations in a row. The pill UI
// was strictly optional for the value proposition (model at real size in
// the showroom) and was causing more grief than value. v9 strips it.
//
// What v9 KEEPS from v5-v8 (the load-bearing correctness work):
//   • computeRealWorldScale() — dimension-priority scaling
//     (heightCm → widthCm → depthCm → fallback 1.0 m longest axis)
//   • Aspect-ratio sanity check → `ar_scale_applied` analytics
//   • Floor-only hit-test filter (no wall placement for furniture)
//
// What v9 REMOVES:
//   • The entire dom-overlay UI (pill, buttons, haptic, animations)
//   • User-driven resize (model is at actual size, period — measuring tape
//     verifies size; UI labels don't add credibility)
//   • The "Move" button (tap a new spot to re-place — reverts to v4
//     behavior; reticle stays visible always so re-placement is natural)
//   • Reticle-hide-post-placement (v7 fix) — no pill = nothing to overlap
//
// What v9 KEEPS from v4 (the geometric core):
//   • Group-wrapper grounding (model bottom always on the hit point)
//   • Reference-space pinned to local-floor before setSession
//   • Uniform scale via setScalar (never non-uniform)
//
// Net result: clean AR with model at correct real-world size, tap-to-place
// and tap-to-re-place via the reticle. No dependency on dom-overlay being
// supported. No overlap problems. Less code = less surface area for bugs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of computeRealWorldScale — the basis (which dim drove the decision)
 * + a boolean for whether the brand's cross-axis input was contradictory.
 *
 * `basis: 'fallback-longest-axis'` means NONE of the three dimensions were
 * provided; the SDK fell back to "make the model's longest native axis 1.0 m".
 * The dashboard groups by this to find brands with missing dims and prompt
 * them to fix their product data.
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
   * The basis dimension's target in metres, used in analytics for dashboard
   * visualisation. `null` for the fallback case (we don't claim a real
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
 * Exported intentionally so we can unit-test it in isolation when Vitest
 * lands for the SDK (Phase 2).
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

  if (heightM != null && !tooSmall(nativeSize.y)) {
    const scalar = heightM / nativeSize.y;
    return { scalar, basis: 'heightCm', aspectWarning: checkAspect(scalar, 'y'), basisMetres: heightM };
  }
  if (widthM != null && !tooSmall(nativeSize.x)) {
    const scalar = widthM / nativeSize.x;
    return { scalar, basis: 'widthCm', aspectWarning: checkAspect(scalar, 'x'), basisMetres: widthM };
  }
  if (depthM != null && !tooSmall(nativeSize.z)) {
    const scalar = depthM / nativeSize.z;
    return { scalar, basis: 'depthCm', aspectWarning: checkAspect(scalar, 'z'), basisMetres: depthM };
  }

  // Fallback — longest native axis → 1.0 m. Better than trusting Meshy's raw
  // arbitrary scale; brands without dims still get a reasonable default
  // until they fix their data.
  const longest = Math.max(nativeSize.x, nativeSize.y, nativeSize.z);
  if (tooSmall(longest)) {
    return { scalar: 1, basis: 'fallback-longest-axis', aspectWarning: false, basisMetres: null };
  }
  return { scalar: 1.0 / longest, basis: 'fallback-longest-axis', aspectWarning: false, basisMetres: null };
}

/**
 * A soft radial contact-shadow "blob" — a flat plane on the floor with a
 * dark-centre → transparent-edge gradient. Sits just under the model so it
 * reads as planted (see call site). Transparent + depthWrite:false so it
 * blends over the camera feed without occluding anything.
 */
function makeBlobShadow(diameter: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.65, 'rgba(0,0,0,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(diameter, diameter), mat);
  plane.rotation.x = -Math.PI / 2; // lay flat on the floor
  plane.position.y = 0.002; // hair above y=0 to avoid z-fighting with the floor
  plane.renderOrder = -1; // draw before the model
  return plane;
}

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
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(0.5, 1, 0.25);
  scene.add(sun);

  // Image-based lighting so the placed model is bright + natural in AR
  // regardless of the room's real lighting — and so a still-metallic GLB
  // doesn't render near-black (no env to reflect). Procedural RoomEnvironment
  // keeps the SDK self-contained (no external HDR). Only affects material
  // lighting; the camera feed (transparent background) is untouched.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Preload GLB; placement only fires after this resolves.
  //
  // v4 geometric core (preserved in v9):
  //   (1) Bottom on the floor — wrap inner gltf.scene in a THREE.Group so the
  //       centre+ground translation isn't clobbered by `setFromMatrixPosition`
  //       when we place the wrapper at the reticle.
  //   (2) Reference-space mismatch — see setReferenceSpaceType call below
  //       (must run BEFORE setSession).
  let loadedModel: THREE.Group | null = null;

  new GLTFLoader().load(product.glbUrl, (gltf) => {
    const inner = gltf.scene;

    // Measure the model's NATIVE bbox first — before any scaling.
    const nativeBox = new THREE.Box3().setFromObject(inner);
    const nativeSize = nativeBox.getSize(new THREE.Vector3());

    // Decide the real-world scale (v5.18 correctness).
    const scaleResult = computeRealWorldScale(
      { x: nativeSize.x, y: nativeSize.y, z: nativeSize.z },
      {
        widthCm: product.dimensions.widthCm,
        heightCm: product.dimensions.heightCm,
        depthCm: product.dimensions.depthCm,
      },
    );

    inner.scale.setScalar(scaleResult.scalar);

    // Re-measure AFTER scaling so the centre+ground translation uses the
    // post-scale bbox (v5.12 fix — survived v9 unchanged).
    const box = new THREE.Box3().setFromObject(inner);
    const centre = box.getCenter(new THREE.Vector3());
    inner.position.set(-centre.x, -box.min.y, -centre.z);

    const wrapper = new THREE.Group();
    wrapper.add(inner);

    // Contact shadow — a soft radial "blob" on the floor under the model.
    // Without it, a thin-legged object (this coffee table, a chair) reads as
    // FLOATING even though it's geometrically grounded (bottom at y=0). This
    // is the standard AR-realism fix (model-viewer / IKEA / Wayfair all do it).
    //
    // Why a blob, not a real DirectionalLight shadow map: the model is placed
    // at an ARBITRARY reticle position (often metres from the world origin),
    // and a directional shadow frustum anchored near the origin would miss it.
    // The blob is parented to the wrapper, so it clones + places WITH the
    // model — always correct, and far cheaper on mobile GPUs.
    const footprint = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    wrapper.add(makeBlobShadow(footprint * 1.15));

    loadedModel = wrapper;

    // Fire the scale-applied event ONCE per session right after the decision.
    // Silent for the user; surfaces in the Week 9 dashboard so we can flag
    // brands with missing or contradictory dimension data.
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
  });

  if (!navigator.xr) {
    throw new Error('WebXR not available');
  }

  // v10 — non-interactive "Move your phone slowly across the floor" hint that
  // appears during the 1-3 seconds between camera-opens and ARCore-detects-a-
  // plane. Without this, brand owners see a blank camera and wonder if the AR
  // is broken. This is the standard pattern from IKEA Place, Wayfair, etc.
  //
  // Why we can use dom-overlay here without re-introducing the v5-v8 problems:
  //   • Non-interactive (no buttons, no taps) → no overlap-with-reticle risk
  //     even if it briefly coexists with a hit-test result
  //   • Auto-fades after the first successful hit-test → invisible before
  //     the user has any reason to look at the floor for placement
  //   • Positioned high on the screen (~30% from top) so it's nowhere near
  //     where the reticle naturally lives (floor → bottom of screen)
  const overlayHost = document.createElement('div');
  overlayHost.id = 'rk-ar-loading-hint';
  overlayHost.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'display:flex',
    'justify-content:center',
    'align-items:flex-start',
    'padding-top:30vh',
    'z-index:2147483647',
  ].join(';');
  const overlayShadow = overlayHost.attachShadow({ mode: 'closed' });
  overlayShadow.innerHTML = `
    <style>
      @keyframes rkHintRise {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .hint {
        background: rgba(15, 15, 15, 0.75);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 0.5px solid rgba(255,255,255,0.08);
        color: #fff;
        padding: 11px 18px;
        border-radius: 999px;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 13.5px;
        font-weight: 500;
        letter-spacing: 0.01em;
        line-height: 1.2;
        max-width: 80vw;
        text-align: center;
        animation: rkHintRise 280ms 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
        opacity: 1;
        transition: opacity 380ms ease-out;
        box-shadow: 0 4px 18px rgba(0,0,0,0.35);
      }
      .hint.fade { opacity: 0; }
    </style>
    <div class="hint" id="hint">Move your phone slowly across the floor</div>
  `;
  document.body.appendChild(overlayHost);

  // No dom-overlay-as-document.body — only the small hint root composites.
  // After it fades out, the AR view is clean camera-only as in v9.
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlayHost },
  } as XRSessionInit);

  // (v4 fix preserved) Reference-space mismatch — we requested `local-floor`
  // from the session AND read hit-test poses in `local-floor`, but Three.js's
  // WebGLXRManager defaults to `local` (eye-level origin). The two reference
  // spaces differ by ~1.6 m vertically AND can drift independently when the
  // device's tracker recalibrates — causing placed models to appear to follow
  // the camera as the user walks around. Telling Three.js to use the same
  // reference space we hit-test against keeps everything in one frame.
  //
  // setReferenceSpaceType MUST be called BEFORE setSession; the manager
  // reads the type only when adopting a new session.
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

  let placedModel: THREE.Group | null = null;

  // v6 carry-over — reject non-horizontal surfaces. Hit-test API returns hits
  // on ANY detected surface (floor, table, wall, ceiling). Without this filter,
  // brand owners pointing their phone at a showroom wall would see the
  // reticle "stick" to the wall — and tapping would place a sofa hanging off
  // the wall, killing the demo's credibility. m[5] is the y-component of the
  // surface-local Y-axis = surface normal in world space; ~1 = horizontal-up.
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

    track('ar_placed', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: { modelId: product.id },
    });
  });

  // v11 — hint fade-out trigger. The hint shows from session start; once we
  // get a valid floor-pose result (= ARCore has found a plane), we fade the
  // hint pill out via CSS.
  //
  // CRITICAL DIFFERENCE FROM v10: we do NOT remove `overlayHost` from the
  // DOM during the session. v10 did that and it terminated the WebXR session
  // automatically — the dom-overlay spec requires the overlay root element
  // to remain in the document for the session's entire lifetime; removing it
  // signals "the user can no longer see the overlay" and the browser ends
  // the session. Founder caught this on first real-phone test: camera
  // closed itself ~500ms after the reticle appeared.
  //
  // v11 fix: just hide the visual hint pill via display:none after the CSS
  // fade transition. The empty overlay host stays in the DOM, satisfying
  // the spec. Final cleanup of `overlayHost` happens in the session 'end'
  // handler where it's safe.
  let hintDismissed = false;
  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    const hint = overlayShadow.getElementById('hint');
    if (!hint) return;
    hint.classList.add('fade');
    // After the CSS fade completes (380ms), hide the pill entirely so it
    // can't accidentally intercept anything. Keep the overlayHost mounted.
    setTimeout(() => {
      hint.style.display = 'none';
    }, 500);
  }

  renderer.setAnimationLoop((_time, frame) => {
    if (frame && hitTestSource && localSpace) {
      const results = frame.getHitTestResults(hitTestSource);
      if (results.length > 0) {
        const pose = results[0]!.getPose(localSpace);
        if (pose) {
          const m = pose.transform.matrix;
          const surfaceUpY = m[5]!;
          if (surfaceUpY >= FLOOR_NORMAL_THRESHOLD) {
            // Horizontal floor / table top — show reticle, ready to place
            // (or re-place an existing model). First time we hit this branch,
            // dismiss the loading hint.
            reticle.visible = true;
            reticle.matrix.fromArray(m);
            if (!hintDismissed) dismissHint();
          } else {
            // Wall or ceiling — hide reticle, can't place here.
            reticle.visible = false;
          }
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
      payload: { durationMs: Date.now() - sessionStartTime },
    });

    renderer.setAnimationLoop(null);
    hitTestSource.cancel();
    renderer.domElement.remove();
    renderer.dispose();
    // Final cleanup — safe to remove here because the WebXR session is
    // already ending. (v10 incorrectly removed this mid-session; v11 holds
    // it until 'end' fires.)
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
