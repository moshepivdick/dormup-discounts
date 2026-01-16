import { z } from 'zod';
import { VENUE_CATEGORY_VALUES } from '@/lib/constants/categories';

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Valid discount code format: uppercase alphanumeric, 5-8 characters
// Supports both old 8-char codes and new 7-char codes for backward compatibility
const DISCOUNT_CODE_REGEX = /^[A-Z0-9]{5,8}$/;

export const discountConfirmSchema = z.object({
  code: z
    .string()
    .min(5, 'Code must be at least 5 characters')
    .max(8, 'Code must be at most 8 characters')
    .regex(DISCOUNT_CODE_REGEX, 'Code must contain only uppercase letters and numbers'),
});

export const venueViewSchema = z.object({
  venueId: z.number().int(),
  city: z.string(),
  userAgent: z.string().optional(),
});

export const venueMutationSchema = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  category: z.enum([...VENUE_CATEGORY_VALUES] as [string, ...string[]], {
    message: 'Category must be one of: restaurant, cafe, pizzeria, fast_food, bar',
  }),
  discountText: z.string().min(5),
  details: z.string().optional().nullable(),
  openingHours: z.string().optional().nullable(),
  mapUrl: z.string().url().optional().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  isActive: z.boolean().optional(),
  priceLevel: z.enum(['budget', 'mid', 'premium']).optional().nullable(),
  typicalStudentSpendMin: z.number().int().positive().optional().nullable(),
  typicalStudentSpendMax: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => {
    // If both min and max are provided, min must be <= max
    if (data.typicalStudentSpendMin != null && data.typicalStudentSpendMax != null) {
      return data.typicalStudentSpendMin <= data.typicalStudentSpendMax;
    }
    return true;
  },
  {
    message: 'Typical student spend min must be less than or equal to max',
    path: ['typicalStudentSpendMin'],
  }
);

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

const numberFromString = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return Number(value);
  }
  return value;
};

export const adminPlaceCreateSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100, 'Name is too long'),
  category: z.enum([...VENUE_CATEGORY_VALUES] as [string, ...string[]], {
    message: 'Category must be one of: restaurant, cafe, pizzeria, fast_food, bar',
  }),
  address: z.string().min(3, 'Address is required').max(500, 'Address is too long'),
  city: z.string().min(2, 'City is required').max(100, 'City is too long'),
  about: z.string().min(5, 'About is required').max(200, 'About is too long'),
  status: z.enum(['draft', 'published']),
  phone: z.preprocess(emptyToUndefined, z.string().max(30, 'Phone is too long')).optional(),
  mapUrl: z.preprocess(emptyToUndefined, z.string().url('Enter a valid URL')).optional(),
  imageUrl: z.preprocess(
    emptyToUndefined,
    z.string().url('Enter a valid URL').max(5000, 'Image URL is too long'),
  ).optional(),
  latitude: z.preprocess(
    numberFromString,
    z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  ),
  longitude: z.preprocess(
    numberFromString,
    z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  ),
});

export const partnerMutationSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  venueId: z.number().int(),
});

// Schema for partner updating their venue (limited fields)
export const partnerVenueUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  discountText: z.string().min(5).max(500).optional(),
  details: z.string().max(2000).optional().nullable(),
  openingHours: z.string().max(200).optional().nullable(),
  openingHoursShort: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  priceLevel: z.enum(['budget', 'mid', 'premium']).optional().nullable(),
  typicalStudentSpendMin: z.number().int().positive().max(1000).optional().nullable(),
  typicalStudentSpendMax: z.number().int().positive().max(1000).optional().nullable(),
  avgStudentBill: z.number().min(0).max(1000).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  mapUrl: z.string().url().max(500).optional().nullable(),
}).refine(
  (data) => {
    // If both min and max are provided, min must be <= max
    if (data.typicalStudentSpendMin != null && data.typicalStudentSpendMax != null) {
      return data.typicalStudentSpendMin <= data.typicalStudentSpendMax;
    }
    return true;
  },
  {
    message: 'Typical student spend min must be less than or equal to max',
    path: ['typicalStudentSpendMin'],
  }
);

// Student auth schemas
export const studentSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  universityId: z.string().uuid('Please select a valid university'),
});

export const studentLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const universityRequestSchema = z.object({
  requestedName: z.string().min(3, 'University name must be at least 3 characters'),
  requestedCity: z.string().optional(),
  requestedDomains: z.array(z.string()).optional(),
  requesterEmail: z.string().email('Please enter a valid email address'),
  notes: z.string().optional(),
});
