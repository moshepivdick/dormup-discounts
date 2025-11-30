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

