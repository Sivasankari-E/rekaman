import { brandsRepository } from './brands.repository.js';
import { NotFoundError } from '../../shared/errors.js';

/**
 * Theme patch input. Every field is optional (PATCH semantics — only
 * provided fields change) and nullable (explicit `null` clears the field
 * back to "use Rekaman default").
 */
export interface UpdateBrandThemeInput {
  primaryColor?: string | null;
  textColor?: string | null;
  buttonStyle?: 'pill' | 'rounded' | 'square' | null;
  buttonLabel?: string | null;
}

export interface BrandThemeView {
  id: string;
  slug: string;
  name: string;
  theme: {
    primaryColor: string | null;
    textColor: string | null;
    buttonStyle: string | null;
    buttonLabel: string | null;
  };
}

function toView(brand: {
  id: string;
  slug: string;
  companyName: string;
  primaryColor: string | null;
  textColor: string | null;
  buttonStyle: string | null;
  buttonLabel: string | null;
}): BrandThemeView {
  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.companyName,
    theme: {
      primaryColor: brand.primaryColor,
      textColor: brand.textColor,
      buttonStyle: brand.buttonStyle,
      buttonLabel: brand.buttonLabel,
    },
  };
}

export const brandsService = {
  /** Read the caller's brand profile + AR-button theme. */
  getBrand: async (brandId: string): Promise<BrandThemeView> => {
    const brand = await brandsRepository.findById(brandId);
    if (!brand) throw new NotFoundError('Brand');
    return toView(brand);
  },

  /**
   * Update the AR-button theme for a brand. Only the fields present in
   * `input` are written; absent fields are left untouched.
   */
  updateTheme: async (
    brandId: string,
    input: UpdateBrandThemeInput,
  ): Promise<BrandThemeView> => {
    // Build the Prisma data object explicitly so an absent field stays
    // `undefined` (Prisma skips it) while an explicit `null` clears it.
    const data: {
      primaryColor?: string | null;
      textColor?: string | null;
      buttonStyle?: string | null;
      buttonLabel?: string | null;
    } = {};
    if ('primaryColor' in input) data.primaryColor = input.primaryColor;
    if ('textColor' in input) data.textColor = input.textColor;
    if ('buttonStyle' in input) data.buttonStyle = input.buttonStyle;
    if ('buttonLabel' in input) data.buttonLabel = input.buttonLabel;

    const brand = await brandsRepository.updateTheme(brandId, data);
    return toView(brand);
  },
};
