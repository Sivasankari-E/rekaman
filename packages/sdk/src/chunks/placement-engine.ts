import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up below at the bottom of this file).
// We DON'T use ESM `export` because the chunk is loaded via a regular <script> tag
// in the main bundle, which can't access ES module exports.

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
  // Placement-engine v3 had two bugs that v4 fixes:
  //
  //   (1) Bottom not on the floor. v3 set `model.position.y = -box.min.y` to
  //       ground-correct, but the placement step then OVERWROTE that position
  //       via `placed.position.setFromMatrixPosition(reticle.matrix)` —
  //       discarding the ground correction. The model sat with its geometric
  //       origin (often the centre or a bone joint) at the reticle, so the
  //       bottom of the mesh ended up below the floor.
  //
  //   The v4 fix: wrap the inner GLTF in a `THREE.Group()` and apply the
  //   centre+ground translation to the INNER node only. The wrapper's local
  //   origin = bottom-centre of the model. We clone + position the wrapper at
  //   the reticle, so the model's bottom always sits exactly on the hit point.
  let loadedModel: THREE.Group | null = null;
  new GLTFLoader().load(product.glbUrl, (gltf) => {
    const inner = gltf.scene;

    // Scale to real-world height if dimensions provided
    if (product.dimensions.heightCm) {
      const box = new THREE.Box3().setFromObject(inner);
      const size = box.getSize(new THREE.Vector3());
      const targetHeightM = product.dimensions.heightCm / 100;
      if (size.y > 0) {
        inner.scale.setScalar(targetHeightM / size.y);
      }
    }

    // Re-measure AFTER scaling so the offset uses post-scale dimensions.
    const box = new THREE.Box3().setFromObject(inner);
    const centre = box.getCenter(new THREE.Vector3());
    inner.position.set(-centre.x, -box.min.y, -centre.z);

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    loadedModel = wrapper;
  });

  if (!navigator.xr) {
    throw new Error('WebXR not available');
  }

  // No dom-overlay — pinning document.body as overlay would render the brand's
  // entire product page on top of the camera feed (looks broken). Without overlay,
  // the browser presents a clean camera-only AR view, and exits via the system
  // gesture / "End AR" button rendered by the UA.
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor', 'hit-test'],
  });

  // (2) Reference-space mismatch (v3 bug — fixed in v4). We requested
  //     `local-floor` from the session AND read hit-test poses in `local-floor`,
  //     but Three.js's WebGLXRManager defaults the renderer to `local`
  //     (eye-level origin). The two reference spaces differ by ~1.6 m vertically
  //     AND can drift independently when the device's tracker recalibrates —
  //     causing placed models to appear to follow the camera as the user walks
  //     around. Telling Three.js to use the same reference space we hit-test
  //     against keeps everything in one frame.
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

  let placedModel: THREE.Group | null = null;

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
