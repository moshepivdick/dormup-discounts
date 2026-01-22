export type VenueSummary = {
  id: number;
  name: string;
  city: string;
  category: string;
  discountText: string;
  isActive: boolean;
  subscriptionTier?: 'BASIC' | 'PRO' | 'MAX';
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  openingHoursShort?: string | null;
  latitude: number;
  longitude: number;
  distance?: number | null;
  priceLevel?: 'budget' | 'mid' | 'premium' | null;
  typicalStudentSpendMin?: number | null;
  typicalStudentSpendMax?: number | null;
};

export type VenueDetails = VenueSummary & {
  details?: string | null;
  openingHours?: string | null;
  mapUrl?: string | null;
  phone?: string | null;
  // Price fields are inherited from VenueSummary
};

// Discount codes are now generated client-side, no backend types needed

export type PartnerSession = {
  email: string;
  venueName: string;
  venueId: number;
};

export type AdminSession = {
  email: string;
  role: string;
};

export type OverviewStats = {
  totalDiscounts: number;
  confirmedDiscounts: number;
  activeVenues: number;
  views: number;
  conversionRate: number;
};

export type VenueStats = {
  venueName: string;
  total: number;
  confirmed: number;
};

export type DailyStats = {
  date: string;
  total: number;
};

