import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { partnerVenueUpdateSchema } from '@/lib/validators';

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
      const venue = await prisma.venue.findUnique({
        where: { id: partner.venueId },
      }) as any; // Type assertion needed until Prisma client is regenerated with price fields

      if (!venue) {
        return apiResponse.error(res, 404, 'Venue not found');
      }

      return apiResponse.success(res, { venue });
    }

    // PUT: Update venue data
    if (req.method === 'PUT') {
      const parsed = partnerVenueUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 400, 'Invalid payload', parsed.error.flatten());
      }

      // Build update data object, only including fields that were provided
      const updateData: any = {};
      
      if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
      if (parsed.data.discountText !== undefined) updateData.discountText = parsed.data.discountText;
      if (parsed.data.details !== undefined) updateData.details = parsed.data.details;
      if (parsed.data.openingHours !== undefined) updateData.openingHours = parsed.data.openingHours;
      if (parsed.data.openingHoursShort !== undefined) updateData.openingHoursShort = parsed.data.openingHoursShort;
      if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
      if (parsed.data.latitude !== undefined) updateData.latitude = parsed.data.latitude;
      if (parsed.data.longitude !== undefined) updateData.longitude = parsed.data.longitude;
      if (parsed.data.priceLevel !== undefined) updateData.priceLevel = parsed.data.priceLevel;
      if (parsed.data.typicalStudentSpendMin !== undefined) updateData.typicalStudentSpendMin = parsed.data.typicalStudentSpendMin;
      if (parsed.data.typicalStudentSpendMax !== undefined) updateData.typicalStudentSpendMax = parsed.data.typicalStudentSpendMax;
      if (parsed.data.avgStudentBill !== undefined) updateData.avgStudentBill = parsed.data.avgStudentBill;
      if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
      if (parsed.data.thumbnailUrl !== undefined) updateData.thumbnailUrl = parsed.data.thumbnailUrl;
      if (parsed.data.mapUrl !== undefined) updateData.mapUrl = parsed.data.mapUrl;

      const venue = await prisma.venue.update({
        where: { id: partner.venueId },
        data: updateData as any, // Type assertion needed until Prisma client is regenerated
      });

      return apiResponse.success(res, { 
        venue: {
          id: venue.id,
          name: venue.name,
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
          priceLevel: (venue as any).priceLevel,
          typicalStudentSpendMin: (venue as any).typicalStudentSpendMin,
          typicalStudentSpendMax: (venue as any).typicalStudentSpendMax,
          avgStudentBill: (venue as any).avgStudentBill,
          updatedAt: venue.updatedAt,
        },
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
