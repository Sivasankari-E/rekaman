import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { track } from '../analytics.js';
import type { ProductData } from '../api-client.js';

// Chunks self-register on window.__rkChunks (set up at the bottom of this file).
// IIFE format; loaded via <script> tag injection from the main SDK bundle.

// ─────────────────────────────────────────────────────────────────────────────
// v3 — X button removed (May 20 2026 late evening)
//
// v1 shipped with an X close button; v2 rewrote the close handler (the v1
// implementation had a broken history.back() chain). Founder testing of v2
// showed the X still didn't fire reliably on real Android Chrome. Rather
// than spend a third iteration on a button that's strictly optional, v3
// removes the X entirely. Close is now via Android system back gesture or
// hardware back-button (both fire popstate, which triggers the existing
// `onPopState` close handler).
//
// Trade-off: desktop users without a back-gesture need to press the browser
// back button or Esc (browser Esc → popstate via the pushed history entry).
// Coimbatore demos are 100% Android anyway, so this is fine for Phase 1.
//
// ─────────────────────────────────────────────────────────────────────────────
// viewer-3d-engine v1 (May 19 2026)
//
// Interactive 3D viewer — Android-side equivalent of Apple AR Quick Look's
// "Object" mode. Renders the product GLB in a fullscreen overlay (black
// gradient background, like Apple's), with touch-friendly orbit controls
// the shopper / brand owner can use to:
//   • drag to rotate the model in 3D space
//   • pinch to zoom in/out (range: closer view of details ↔ pulled back)
//   • two-finger drag to pan (subtle, useful for off-centre framing)
//
// Why this complements "View in your room":
//   • AR (WebXR) requires a phone with AR support + permission to camera
//     and motion sensors. Desktop users, laptops, iPads without AR mode,
//     and low-end Android devices can't enter AR. They can ALL run this.
//   • Shoppers who want to inspect detail (cushion stitching, wood grain
//     pattern, carved legs) get a better look in 3D than in AR — no
//     real-world surface to navigate around.
//   • For brand owner demos: shows the model exists and looks great even
//     when the owner can't / won't grant camera permission instantly.
//
// Why not Google's <model-viewer> web component:
//   It's 50+ KB of new dependency for features we already have via Three.js
//   (which the AR chunk has loaded anyway). The OrbitControls module is
//   ~5 KB. Keeping it native to our stack saves the dependency surface and
//   the cross-version compatibility headache.
// ─────────────────────────────────────────────────────────────────────────────

async function startProductViewer3D(product: ProductData): Promise<void> {
  if (!product.glbUrl) {
    throw new Error('Product has no GLB URL for 3D viewer');
  }

  const sessionStartTime = Date.now();

  // Track session start so the dashboard can compare AR vs 3D viewer
  // engagement per product per brand. Useful signal: brands whose
  // shoppers consistently choose 3D over AR may have an AR usability
  // problem (camera permission denial, slow phones, etc.).
  track('viewer_3d_started', {
    productSlug: product.slug,
    arMode: product.arMode,
    payload: { modelId: product.id },
  });

  // ───────────────────────────────────────────────────────────────────────
  // Build the overlay host (Shadow-DOM-isolated so brand CSS can't reach in).
  // Fullscreen black-gradient background mirrors Apple's "Object" view aesthetic.
  // ───────────────────────────────────────────────────────────────────────
  const overlayHost = document.createElement('div');
  overlayHost.id = 'rk-3d-viewer';
  overlayHost.style.cssText = [
    'position:fixed', 'inset:0',
    'z-index:2147483647',
    'background:#0a0a0a',
    'background-image:radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
  ].join(';');
  const overlayShadow = overlayHost.attachShadow({ mode: 'closed' });

  overlayShadow.innerHTML = `
    <style>
      :host { display: block; width: 100%; height: 100%; }
      .stage {
        position: absolute; inset: 0;
        touch-action: none; /* OrbitControls needs full control of touch events */
      }
      /* v3 — X button removed (v1/v2 implementations had buggy close
         handlers). Close is now exclusively via Android swipe-back gesture
         or system back-button (both trigger popstate). Title pill stays
         centered at top as a product-name reference. */
      .top-bar {
        position: absolute; top: 0; left: 0; right: 0;
        display: flex; justify-content: center; align-items: center;
        padding: 14px 16px;
        padding-top: max(14px, env(safe-area-inset-top));
        pointer-events: none;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        color: #fff;
        z-index: 2;
      }
      .top-bar > * { pointer-events: auto; }
      .title {
        font-size: 14px; font-weight: 500;
        background: rgba(15,15,15,0.7);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        padding: 8px 14px; border-radius: 999px;
        border: 0.5px solid rgba(255,255,255,0.08);
        max-width: 60vw;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .hint {
        position: absolute; bottom: 0; left: 0; right: 0;
        text-align: center;
        padding: 14px 20px;
        padding-bottom: max(14px, env(safe-area-inset-bottom));
        color: rgba(255,255,255,0.55);
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 12.5px;
        letter-spacing: 0.01em;
        pointer-events: none;
        z-index: 2;
        animation: rkFadeOut 6s 2s forwards;
      }
      @keyframes rkFadeOut { to { opacity: 0; } }
      .loading {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.6);
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 14px; font-weight: 500;
        gap: 10px;
      }
      .spinner {
        width: 18px; height: 18px;
        border: 2px solid rgba(255,255,255,0.2);
        border-top-color: rgba(255,255,255,0.9);
        border-radius: 50%;
        animation: rkSpin 0.8s linear infinite;
      }
      @keyframes rkSpin { to { transform: rotate(360deg); } }
    </style>
    <div class="top-bar">
      <div class="title" id="title">3D model</div>
    </div>
    <div class="stage" id="stage"></div>
    <div class="loading" id="loading"><span class="spinner"></span>Loading 3D model…</div>
    <div class="hint" id="hint">Drag to rotate · Pinch to zoom · Swipe back to close</div>
  `;
  document.body.appendChild(overlayHost);
  // Prevent the page below the overlay from scrolling while open.
  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const stage = overlayShadow.getElementById('stage') as HTMLDivElement;
  const loading = overlayShadow.getElementById('loading') as HTMLDivElement;
  const titleEl = overlayShadow.getElementById('title') as HTMLDivElement;
  titleEl.textContent = product.name;

  // ───────────────────────────────────────────────────────────────────────
  // Three.js scene setup. Plain non-XR renderer — much simpler than the
  // WebXR-enabled renderer in placement-engine, since we're rendering to
  // a regular WebGL canvas inside the overlay, not handing off to an XR
  // session.
  // ───────────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  // Subtle dark background scene colour to harmonise with the overlay
  // gradient; the actual page background bleeds through transparent regions
  // of the model (e.g. between table legs).
  scene.background = null;

  // Soft three-point studio lighting — flatters most furniture textures.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, 1.5, -1);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  stage.appendChild(renderer.domElement);

  // Image-based lighting (IBL). CRITICAL for mobile: the laptop dashboard uses
  // Google <model-viewer>, which applies a default neutral environment, so PBR
  // materials look bright + natural. Our three.js viewer had only direct lights
  // and NO environment map — which left matte materials dim and, worse, made
  // any still-metallic GLB render near-black (metals reflect the environment;
  // no environment = black). A procedural RoomEnvironment (no external HDR asset
  // — keeps the SDK self-contained) fixes both, matching the laptop look.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(
    50,
    stage.clientWidth / stage.clientHeight,
    0.01,
    100,
  );

  // OrbitControls — mature, touch-aware, all the heavy lifting. Configured for
  // a product-viewer feel (no panning beyond the model, no upside-down
  // rotation, smooth damping).
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false; // Pan is rarely useful for a single product; rotate+zoom covers 99% of intent.
  controls.minPolarAngle = 0.1;        // don't let user flip upside-down (looks weird for furniture)
  controls.maxPolarAngle = Math.PI - 0.1;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;

  // ───────────────────────────────────────────────────────────────────────
  // Load the GLB. Same model as the AR view — the brand only generates one
  // GLB per product, used for both modes.
  // ───────────────────────────────────────────────────────────────────────
  const loader = new GLTFLoader();
  loader.load(
    product.glbUrl,
    (gltf) => {
      const inner = gltf.scene;

      // Centre the model at origin + frame the camera to fit.
      const box = new THREE.Box3().setFromObject(inner);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      inner.position.sub(centre); // model now centred at (0, 0, 0)

      scene.add(inner);

      // Frame the camera so the model fills ~70% of the viewport at default
      // zoom. Distance derived from the model's diagonal — works regardless
      // of whether the model is 10 cm or 10 m in native units (Meshy
      // normalisation varies).
      const diag = Math.max(size.x, size.y, size.z);
      const distance = diag * 2.2;
      camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // Tell OrbitControls to orbit around the centre.
      controls.target.set(0, 0, 0);
      // Limit zoom-out so the user can't get lost in the void; allow zoom-in
      // for detail inspection.
      controls.minDistance = diag * 0.4;
      controls.maxDistance = diag * 5;
      controls.update();

      loading.style.display = 'none';
    },
    undefined,
    (err) => {
      console.warn('[Rekaman] 3D viewer failed to load model', err);
      loading.textContent = 'Could not load 3D model';
      track('viewer_3d_error', {
        productSlug: product.slug,
        arMode: product.arMode,
        payload: { message: (err as Error).message ?? 'load failed' },
      });
    },
  );

  // ───────────────────────────────────────────────────────────────────────
  // Render loop + resize handling. Uses rAF (not setAnimationLoop, which is
  // WebXR-specific). Damping requires a render on every frame even when the
  // user isn't actively interacting — cheap on modern phones.
  // ───────────────────────────────────────────────────────────────────────
  let stopped = false;
  function loop() {
    if (stopped) return;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  function onResize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  // Phones rotating between portrait/landscape need this too.
  window.addEventListener('orientationchange', onResize);

  // ───────────────────────────────────────────────────────────────────────
  // Close handling. v2 rewrite — v1 had a broken close chain: the X button
  // handler called `history.back()` AFTER removing the popstate listener, so
  // the back-navigation never triggered cleanup. v2 makes close() idempotent
  // and routes the X button THROUGH the popstate path (one source of truth
  // for cleanup, no duplicate dispose).
  //
  // Flow:
  //   • Mount-time:    pushState({rkViewer3D:true}) + popstate listener that
  //                    calls close()
  //   • X tap:         call history.back() → browser fires popstate → close()
  //                    cleans up. No "double close" because close() is guarded.
  //   • Android back:  same as X tap (back-button fires popstate natively)
  //   • Already-popped state (rare): X tap calls close() directly
  // ───────────────────────────────────────────────────────────────────────
  let closed = false;
  function close() {
    if (closed) return; // idempotent — safe to call from X tap AND popstate
    closed = true;
    stopped = true;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('popstate', onPopState);
    document.body.style.overflow = prevBodyOverflow;
    controls.dispose();
    renderer.dispose();
    overlayHost.remove();

    track('viewer_3d_ended', {
      productSlug: product.slug,
      arMode: product.arMode,
      payload: {
        durationMs: Date.now() - sessionStartTime,
        modelId: product.id,
      },
    });
  }

  // v3 — close is exclusively via Android swipe-back gesture or system
  // back-button. The pushed history entry catches both: when the user
  // navigates back, the popstate listener calls close(). No X button = no
  // close-handler bugs (v1 and v2 both had different broken implementations).
  // For desktop testing (where there's no swipe-back), pressing the browser
  // back button or pressing Escape also navigates back via history.
  history.pushState({ rkViewer3D: true }, '');
  function onPopState() {
    close();
  }
  window.addEventListener('popstate', onPopState);
}

// Register on window so the main SDK bundle can find this entry-point after
// it loads us via <script src="...">.
const w = window as unknown as { __rkChunks?: Record<string, unknown> };
w.__rkChunks ??= {};
(w.__rkChunks as Record<string, unknown>).viewer3d = { startProductViewer3D };
