/**
 * Canonical venue categories - single source of truth
 * 
 * These are the ONLY valid categories across the entire application:
 * - Prisma schema validation
 * - API validation (Zod)
 * - UI filters
 * - Admin panel
 */
export const VENUE_CATEGORIES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  PIZZERIA: 'pizzeria',
  FAST_FOOD: 'fast_food',
  BAR: 'bar',
} as const;

export type VenueCategory = typeof VENUE_CATEGORIES[keyof typeof VENUE_CATEGORIES];

export const VENUE_CATEGORY_VALUES: readonly VenueCategory[] = [
  VENUE_CATEGORIES.RESTAURANT,
  VENUE_CATEGORIES.CAFE,
  VENUE_CATEGORIES.PIZZERIA,
  VENUE_CATEGORIES.FAST_FOOD,
  VENUE_CATEGORIES.BAR,
] as const;

/**
 * Human-readable labels for UI display
 */
export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  [VENUE_CATEGORIES.RESTAURANT]: 'Restaurant',
  [VENUE_CATEGORIES.CAFE]: 'Cafe',
  [VENUE_CATEGORIES.PIZZERIA]: 'Pizzeria',
  [VENUE_CATEGORIES.FAST_FOOD]: 'Fast food',
  [VENUE_CATEGORIES.BAR]: 'Bar',
} as const;

/**
 * Maps legacy category values to canonical categories
 * Used during migration and when loading old data
 */
export function mapLegacyCategory(legacyCategory: string): VenueCategory {
  const normalized = legacyCategory.toLowerCase().trim();
  
  // Direct matches
  if (normalized === 'restaurant' || normalized === 'restaurant / pizzeria') {
    return VENUE_CATEGORIES.RESTAURANT;
  }
  if (normalized === 'cafe' || normalized === 'caffè' || normalized === 'caffè letterario') {
    return VENUE_CATEGORIES.CAFE;
  }
  if (normalized === 'pizzeria') {
    return VENUE_CATEGORIES.PIZZERIA;
  }
  if (normalized === 'fast food' || normalized === 'fast_food' || normalized === 'street food') {
    return VENUE_CATEGORIES.FAST_FOOD;
  }
  if (normalized === 'bar' || normalized === 'cocktail bar') {
    return VENUE_CATEGORIES.BAR;
  }
  
  // Pattern matches
  if (normalized.includes('cafe') || normalized.includes('café') || normalized.includes('bakery')) {
    return VENUE_CATEGORIES.CAFE;
  }
  if (normalized.includes('pizza')) {
    return VENUE_CATEGORIES.PIZZERIA;
  }
  if (normalized.includes('restaurant')) {
    return VENUE_CATEGORIES.RESTAURANT;
  }
  if (normalized.includes('bar')) {
    return VENUE_CATEGORIES.BAR;
  }
  
  // Default fallback - prefer restaurant for unknown values
  console.warn(`Unknown category "${legacyCategory}", mapping to restaurant`);
  return VENUE_CATEGORIES.RESTAURANT;
}

/**
 * Validates if a category is canonical
 */
export function isValidCategory(category: string): category is VenueCategory {
  return VENUE_CATEGORY_VALUES.includes(category as VenueCategory);
}
