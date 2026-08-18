import type { Metadata } from 'next';
import { HostedViewer } from '../../../_components/HostedViewer';
import { fetchArByBrand, buildMetadata } from '../../../_lib/hostedViewer';

/*
 * Hosted viewer — rekaman.io/s/{brandSlug}/{productSlug} (keyless share link).
 * Built by the dashboard Share kit: the dashboard knows the brand slug + product
 * slug (but never the full API key), so this route resolves by brand slug. The
 * data is identical to the keyed route — it's all public AR data.
 */
export async function generateMetadata({
  params,
}: {
  params: { brand: string; slug: string };
}): Promise<Metadata> {
  return buildMetadata(await fetchArByBrand(params.brand, params.slug));
}

export default async function ShareViewerPage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const product = await fetchArByBrand(params.brand, params.slug);
  return <HostedViewer product={product} slug={params.slug} embedBrand={params.brand} />;
}
