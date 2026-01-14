import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { partnerVenueUpdateSchema } from '@/lib/validators';
import { mapLegacyCategory, isValidCategory } from '@/lib/constants/categories';

export default withMethods(['GET', 'PUT'], async (req: NextApiRequest, res: NextApiResponse) => {
  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  if (!partner.venueId) {
    return apiResponse.error(res, 400, 'Partner not associated with a venue');
  }

  try {
    // GET: Return current venue data
    if (req.method === 'GET') {
      try {
        // Try to get venue with all fields
        const venue = await prisma.venue.findUnique({
          where: { id: partner.venueId },
        }) as any;

        if (!venue) {
          return apiResponse.error(res, 404, 'Venue not found');
        }

        // Defensive: normalize category in case of legacy data
        const normalizedVenue = {
          ...venue,
          category: isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category),
        };
        return apiResponse.success(res, { venue: normalizedVenue });
      } catch (error: any) {
        // Fallback: if price fields don't exist, query without them
        if (error?.code === 'P2022' || error?.message?.includes('avgStudentBill') || error?.message?.includes('priceLevel')) {
          const venue = await prisma.venue.findUnique({
            where: { id: partner.venueId },
            select: {
              id: true,
              name: true,
              city: true,
              category: true,
              discountText: true,
              details: true,
              openingHours: true,
              openingHoursShort: true,
              phone: true,
              latitude: true,
              longitude: true,
              imageUrl: true,
              thumbnailUrl: true,
              mapUrl: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          if (!venue) {
            return apiResponse.error(res, 404, 'Venue not found');
          }

          // Defensive: normalize category in case of legacy data
          const category = isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category);
          
          // Add null values for missing fields
          return apiResponse.success(res, { 
            venue: {
              ...venue,
              category,
              priceLevel: null,
              typicalStudentSpendMin: null,
              typicalStudentSpendMax: null,
              avgStudentBill: null,
            }
          });
        }
        throw error;
      }
    }

    // PUT: Update venue data
    if (req.method === 'PUT') {
      const parsed = partnerVenueUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
      }

      // Build update data object, only including fields that were provided
      const updateData: any = {};
      
      // Always safe fields
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.discountText !== undefined) updateData.discountText = parsed.data.discountText;
      if (parsed.data.details !== undefined) updateData.details = parsed.data.details;
      if (parsed.data.openingHours !== undefined) updateData.openingHours = parsed.data.openingHours;
      if (parsed.data.openingHoursShort !== undefined) updateData.openingHoursShort = parsed.data.openingHoursShort;
      if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
      if (parsed.data.latitude !== undefined) updateData.latitude = parsed.data.latitude;
      if (parsed.data.longitude !== undefined) updateData.longitude = parsed.data.longitude;
      if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
      if (parsed.data.thumbnailUrl !== undefined) updateData.thumbnailUrl = parsed.data.thumbnailUrl;
      if (parsed.data.mapUrl !== undefined) updateData.mapUrl = parsed.data.mapUrl;

      // Price fields (may not exist in DB yet)
      // Only include if they were provided, and handle gracefully if DB doesn't support them
      const priceFields: any = {};
      if (parsed.data.priceLevel !== undefined) priceFields.priceLevel = parsed.data.priceLevel;
      if (parsed.data.typicalStudentSpendMin !== undefined) priceFields.typicalStudentSpendMin = parsed.data.typicalStudentSpendMin;
      if (parsed.data.typicalStudentSpendMax !== undefined) priceFields.typicalStudentSpendMax = parsed.data.typicalStudentSpendMax;
      if (parsed.data.avgStudentBill !== undefined) priceFields.avgStudentBill = parsed.data.avgStudentBill;

      // Try to update with price fields, fallback to without them if they don't exist
      let venue;
      try {
        venue = await prisma.venue.update({
          where: { id: partner.venueId },
          data: { ...updateData, ...priceFields } as any,
        });
      } catch (error: any) {
        // If price fields don't exist, update without them
        if (error?.code === 'P2022' || error?.message?.includes('avgStudentBill') || error?.message?.includes('priceLevel')) {
          console.warn('Price fields not available in database, updating without them');
          venue = await prisma.venue.update({
            where: { id: partner.venueId },
            data: updateData,
          });
        } else {
          throw error;
        }
      }

      // Safely get price fields (may not exist)
      // Defensive: normalize category in case of legacy data
      const category = isValidCategory(venue.category) ? venue.category : mapLegacyCategory(venue.category);
      const venueResponse: any = {
        id: venue.id,
        name: venue.name,
        category,
        discountText: venue.discountText,
        details: venue.details,
        openingHours: venue.openingHours,
        openingHoursShort: venue.openingHoursShort,
        phone: venue.phone,
        latitude: venue.latitude,
        longitude: venue.longitude,
        imageUrl: venue.imageUrl,
        thumbnailUrl: venue.thumbnailUrl,
        mapUrl: venue.mapUrl,
        updatedAt: venue.updatedAt,
      };

      // Add price fields if they exist
      if ('priceLevel' in venue) venueResponse.priceLevel = (venue as any).priceLevel;
      else venueResponse.priceLevel = null;
      
      if ('typicalStudentSpendMin' in venue) venueResponse.typicalStudentSpendMin = (venue as any).typicalStudentSpendMin;
      else venueResponse.typicalStudentSpendMin = null;
      
      if ('typicalStudentSpendMax' in venue) venueResponse.typicalStudentSpendMax = (venue as any).typicalStudentSpendMax;
      else venueResponse.typicalStudentSpendMax = null;
      
      if ('avgStudentBill' in venue) venueResponse.avgStudentBill = (venue as any).avgStudentBill;
      else venueResponse.avgStudentBill = null;

      return apiResponse.success(res, { 
        venue: venueResponse,
        message: 'Venue updated successfully',
      });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return apiResponse.error(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('Error in venue settings:', error);
    return apiResponse.error(res, 500, 'Failed to process request');
  }
});
