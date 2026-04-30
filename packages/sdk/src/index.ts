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

  try {
    const [platform, product] = await Promise.all([
      detectPlatform(),
      fetchProduct(apiKey, productSlug),
    ]);

    instance.platform = platform;
    instance.product = product;

    track('ar_supported', {
      productSlug,
      arMode: product.arMode,
      payload: { platform },
    });

    if (platform === 'unsupported') {
      // Don't show button on devices that can't do AR
      return;
    }

    instance.buttonHandle = injectButton(container, {
      label: getButtonLabel(product.arMode),
      onClick: () => handleButtonClick(instance),
    });
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

(window as unknown as { Rekaman: typeof Rekaman }).Rekaman = Rekaman;

export default Rekaman;
