import QRCode from 'qrcode';

/*
 * GET /qr?data=<text> → a QR code as SVG (image/svg+xml).
 *
 * Used by the SDK's desktop "View in your room" flow: a laptop shopper can't do
 * in-browser AR, so the SDK shows a QR of the product's hosted-viewer URL. They
 * scan it, the viewer opens on their phone, and AR works there. Generating the
 * QR here (the site already ships `qrcode`) keeps the SDK bundle tiny — the SDK
 * just renders <img src="…/qr?data=…">.
 *
 * SVG (not PNG) so it scales crisply at any size and stays cacheable + light.
 */
export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const data = new URL(req.url).searchParams.get('data');
  if (!data || data.length > 1024) {
    return new Response('Missing or oversized `data` param', { status: 400 });
  }
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    });
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        // Deterministic for a given URL → cache hard at the edge + browser.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    });
  } catch {
    return new Response('Could not generate QR', { status: 500 });
  }
}
