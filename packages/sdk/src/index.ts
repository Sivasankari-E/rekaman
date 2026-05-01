import { fetchProduct, type ProductData } from './api-client.js';
import { initAnalytics, track } from './analytics.js';
import { detectPlatform, type Platform } from './platform-detect.js';
import { launchIosQuickLook, launchArExperience } from './ar-launcher.js';
import { injectButton } from './ui.js';

// __SDK_VERSION__ is declared globally in src/globals.d.ts.

interface MountedInstance {
  container: HTMLElement;
  apiKey: string;
  productSlug: string;
  product: ProductData | null;
  platform: Platform | null;
  buttonHandle: ReturnType<typeof injectButton> | null;
}

const instances: MountedInstance[] = [];

async function mount(container: HTMLElement) {
  const apiKey = container.dataset.rkKey;
  const productSlug = container.dataset.rkProduct;

  if (!apiKey || !productSlug) {
    console.warn('[Rekaman] missing data-rk-key or data-rk-product on element', container);
    return;
  }

  // Avoid double-mount if scan() runs again (DOMContentLoaded + load + manual scan)
  if (container.hasAttribute('data-rk-mounted')) return;
  container.setAttribute('data-rk-mounted', 'true');

  const instance: MountedInstance = {
    container,
    apiKey,
    productSlug,
    product: null,
    platform: null,
    buttonHandle: null,
  };
  instances.push(instance);

  initAnalytics(apiKey);

  // Kick off both detection paths in parallel — but inject the button as soon
  // as platform detection resolves (~50ms) without waiting for the product
  // fetch (~200-500ms). Button starts disabled with a generic label and updates
  // to the mode-specific label when product data arrives.
  const platformPromise = detectPlatform();
  const productPromise = fetchProduct(apiKey, productSlug);

  try {
    const platform = await platformPromise;
    instance.platform = platform;

    if (platform === 'unsupported') {
      // Don't show button on devices that can't do AR. Wait for product anyway
      // so we can fire the ar_supported telemetry with arMode.
      const product = await productPromise;
      instance.product = product;
      track('ar_supported', { productSlug, arMode: product.arMode, payload: { platform } });
      return;
    }

    // Inject the button immediately, disabled, with a generic label.
    instance.buttonHandle = injectButton(container, {
      label: 'View in AR',
      onClick: () => handleButtonClick(instance),
    });
    instance.buttonHandle.setEnabled(false);

    // When the product fetch resolves, update label + enable. If it fails,
    // remove the button so we don't show a non-functional control.
    try {
      const product = await productPromise;
      instance.product = product;
      track('ar_supported', { productSlug, arMode: product.arMode, payload: { platform } });
      instance.buttonHandle.setLabel(getButtonLabel(product.arMode));
      instance.buttonHandle.setEnabled(true);
    } catch (err) {
      instance.buttonHandle.remove();
      instance.buttonHandle = null;
      throw err;
    }
  } catch (err) {
    track('ar_error', {
      productSlug,
      payload: { message: (err as Error).message, phase: 'init' },
    });
    console.warn('[Rekaman] failed to initialize', err);
  }
}

function getButtonLabel(arMode: string): string {
  switch (arMode) {
    case 'placement': return 'View in your room';
    case 'tryon-face': return 'Try on';
    case 'tryon-wrist': return 'Try on wrist';
    case 'tryon-hand': return 'Try on';
    case 'tryon-photo': return 'Try on yourself';
    default: return 'View in AR';
  }
}

async function handleButtonClick(instance: MountedInstance) {
  if (!instance.product || !instance.platform) return;

  track('ar_button_tapped', {
    productSlug: instance.productSlug,
    arMode: instance.product.arMode,
  });
  instance.buttonHandle?.setLoading(true);

  try {
    if (instance.platform === 'ios-quicklook') {
      launchIosQuickLook(instance.product);
      track('ar_session_started', {
        productSlug: instance.productSlug,
        arMode: instance.product.arMode,
        payload: { platform: 'ios-quicklook' },
      });
    } else if (instance.platform === 'webxr') {
      track('ar_session_started', {
        productSlug: instance.productSlug,
        arMode: instance.product.arMode,
        payload: { platform: 'webxr' },
      });
      await launchArExperience(instance.product);
    }
  } catch (err) {
    track('ar_error', {
      productSlug: instance.productSlug,
      payload: { message: (err as Error).message, phase: 'launch' },
    });
    console.warn('[Rekaman] launch failed', err);
  } finally {
    instance.buttonHandle?.setLoading(false);
  }
}

function scan() {
  const elements = document.querySelectorAll<HTMLElement>(
    '[data-rk-product][data-rk-key]:not([data-rk-mounted])',
  );
  elements.forEach((el) => mount(el));
}

const Rekaman = {
  version: __SDK_VERSION__,
  scan,
  __instances: instances,
} as const;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scan);
} else {
  scan();
}
window.addEventListener('load', scan);

// Public API — the SDK's IIFE format in build.config.ts has no `globalName`,
// so this manual assignment is the ONLY source of window.Rekaman.
(window as unknown as { Rekaman: typeof Rekaman }).Rekaman = Rekaman;
