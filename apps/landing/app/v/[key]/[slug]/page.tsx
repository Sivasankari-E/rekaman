import type { Metadata } from 'next';
import { HostedViewer } from '../../../_components/HostedViewer';
import { fetchArByKey, buildMetadata } from '../../../_lib/hostedViewer';

/*
 * Hosted viewer — rekaman.io/v/{apiKey}/{productSlug} (keyed).
 * Built by the SDK's desktop "View in your room" QR fallback (the SDK has the
 * public API key). See _components/HostedViewer for the shared body.
 */
export async function generateMetadata({
  params,
}: {
  params: { key: string; slug: string };
}): Promise<Metadata> {
  return buildMetadata(await fetchArByKey(params.key, params.slug));
}

export default async function ViewerPage({
  params,
}: {
  params: { key: string; slug: string };
}) {
  const product = await fetchArByKey(params.key, params.slug);
  return <HostedViewer product={product} slug={params.slug} embedKey={params.key} />;
}
