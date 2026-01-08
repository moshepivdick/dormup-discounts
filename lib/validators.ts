import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const discountConfirmSchema = z.object({
  code: z.string().min(4).max(12),
});

export const venueViewSchema = z.object({
  venueId: z.number().int(),
  city: z.string(),
  userAgent: z.string().optional(),
});

export const venueMutationSchema = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  category: z.string().min(2),
  discountText: z.string().min(5),
  details: z.string().optional().nullable(),
  openingHours: z.string().optional().nullable(),
  mapUrl: z.string().url().optional().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  isActive: z.boolean().optional(),
});

export const partnerMutationSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  venueId: z.number().int(),
});

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
