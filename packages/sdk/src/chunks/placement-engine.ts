import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up below at the bottom of this file).
// We DON'T use ESM `export` because the chunk is loaded via a regular <script> tag
// in the main bundle, which can't access ES module exports.

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

  // No dom-overlay — clean camera-only AR view, no on-screen controls to
  // overlap the reticle or confuse brand owners during showroom demos. Exit
  // via the system-rendered "End AR" button (Chrome Android shows this in
  // the top-right corner automatically).
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor', 'hit-test'],
  });

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
            // (or re-place an existing model).
            reticle.visible = true;
            reticle.matrix.fromArray(m);
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
  });
}

// Register on window so the main SDK bundle can find this entry-point after
// it loads us via <script src="...">.
// Idempotent: nullish-coalescing assignment keeps any prior `__rkChunks` (e.g.
// face-tryon registered before us) intact.
const w = window as unknown as { __rkChunks?: Record<string, unknown> };
w.__rkChunks ??= {};
(w.__rkChunks as Record<string, unknown>).placement = { startPlacementAR };
