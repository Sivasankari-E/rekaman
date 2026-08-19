/**
 * Shared GLB post-processing — the single implementation used by both the
 * generation worker (bakes a matte default on every new model) and the product
 * "finish" endpoint (re-processes an existing GLB to matte/satin/glossy).
 *
 * Two independent concerns:
 *
 *  1. MATERIAL NORMALIZATION. Meshy bakes `metallicFactor: 1` (fully metallic)
 *     into nearly every model — verified directly on production GLBs. Any
 *     metalness turns the surface into mirror-chrome under a viewer's
 *     environment lighting (the "wrinkled foil" symptom: the warped reflections
 *     read as crumpled geometry even when the mesh is fine). Real products we
 *     target (furniture, décor, homeware, footwear) are non-metallic, so we
 *     force `metallicFactor = 0` on every material. Roughness is then either
 *     floored to a matte minimum (the generation default) or set to an absolute
 *     value (the finish control). `texture_prompt` cannot do this — the metallic
 *     factor is a material property, not a colour.
 *
 *  2. TEXTURE COMPRESSION (optional). Resize maps to <=2048 + WebP; typically
 *     80–90% smaller with no visible quality loss. Needs the native `sharp`
 *     binary, so it's nested best-effort — if `sharp` can't load we still return
 *     the material-normalized, geometry-identical GLB.
 *
 * Resilience: material normalization + dedup/prune need only gltf-transform (no
 * native deps). The whole thing is wrapped so a malformed GLB (or any failure)
 * returns the ORIGINAL buffer — post-processing must NEVER fail its caller.
 */

type Logger = { warn: (obj: object, msg: string) => void };

/** Surface finishes a brand can pick. Metalness is always 0; finish = roughness. */
export type Finish = 'matte' | 'satin' | 'glossy';

/**
 * Absolute `roughnessFactor` per finish. Lower = shinier (more specular).
 * Metalness stays 0 for all — we never want chrome, only dielectric sheen.
 */
export const FINISH_ROUGHNESS: Record<Finish, number> = {
  matte: 0.85,
  satin: 0.5,
  glossy: 0.15,
};

export interface ProcessGlbOptions {
  /** Set every material's roughnessFactor to this absolute value (finish control). */
  setRoughness?: number;
  /** Raise roughnessFactor to at least this, only if below (generation default). */
  roughnessFloor?: number;
  /** Also resize + WebP-recompress textures (needs `sharp`). Default false. */
  compress?: boolean;
}

export async function processGlb(
  buf: Buffer,
  opts: ProcessGlbOptions,
  log: Logger,
): Promise<Buffer> {
  try {
    const [core, ext, fns] = await Promise.all([
      import('@gltf-transform/core'),
      import('@gltf-transform/extensions'),
      import('@gltf-transform/functions'),
    ]);
    const io = new core.NodeIO().registerExtensions(ext.ALL_EXTENSIONS);
    const doc = await io.readBinary(new Uint8Array(buf));

    // ── Material normalization (no native deps) ──
    for (const mat of doc.getRoot().listMaterials()) {
      // Force non-metallic. metallicFactor multiplies the metallic (blue)
      // channel of any metallicRoughness texture, so 0 defeats a baked metallic
      // map too — no need to delete the texture (its roughness detail is kept).
      mat.setMetallicFactor(0);
      if (opts.setRoughness !== undefined) {
        mat.setRoughnessFactor(opts.setRoughness);
      } else if (
        opts.roughnessFloor !== undefined &&
        mat.getRoughnessFactor() < opts.roughnessFloor
      ) {
        // Clamp up, never down — a legitimately rougher value is left alone.
        mat.setRoughnessFactor(opts.roughnessFloor);
      }
    }
    await doc.transform(fns.dedup(), fns.prune());

    // ── Texture compression (needs sharp; nested best-effort) ──
    if (opts.compress) {
      try {
        const sharpMod = await import('sharp');
        await doc.transform(
          fns.textureCompress({
            encoder: sharpMod.default,
            targetFormat: 'webp',
            resize: [2048, 2048],
          }),
        );
      } catch (err) {
        log.warn(
          { err: (err as Error).message },
          'glb texture compression skipped (sharp unavailable) — shipping material-normalized GLB',
        );
      }
    }

    const out = await io.writeBinary(doc);
    return Buffer.from(out);
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'glb post-processing failed — returning original');
    return buf;
  }
}
