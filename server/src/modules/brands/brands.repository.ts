import { prisma } from '../../shared/db.js';

/**
 * Brand repository — the ONLY file in the brands module that touches Prisma.
 */
const BRAND_VIEW_SELECT = {
  id: true,
  slug: true,
  companyName: true,
  primaryColor: true,
  textColor: true,
  buttonStyle: true,
  buttonLabel: true,
} as const;

export const brandsRepository = {
  /** Read a brand's profile + theme (for the dashboard Settings page). */
  findById: (brandId: string) =>
    prisma.brand.findUnique({ where: { id: brandId }, select: BRAND_VIEW_SELECT }),

  /**
   * Patch the AR-button theme on a brand. `data` keys that are `undefined`
   * are left unchanged by Prisma; keys that are `null` clear the column;
   * keys with a value set it. The caller (service) is responsible for only
   * passing keys the request actually included.
   *
   * `where: { id }` — brandId always comes from the verified JWT
   * (`req.brandId`), so a caller can only ever patch their own brand.
   */
  updateTheme: (
    brandId: string,
    data: {
      primaryColor?: string | null;
      textColor?: string | null;
      buttonStyle?: string | null;
      buttonLabel?: string | null;
    },
  ) =>
    prisma.brand.update({
      where: { id: brandId },
      data,
      select: {
        id: true,
        slug: true,
        companyName: true,
        primaryColor: true,
        textColor: true,
        buttonStyle: true,
        buttonLabel: true,
      },
    }),
};
