import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiResponse, withMethods } from '@/lib/api';
import { discountConfirmSchema } from '@/lib/validators';
import { enforceRateLimit } from '@/lib/rate-limit';

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'confirm',
    limit: 10,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const partner = await auth.getPartnerFromRequest(req);
  if (!partner) {
    return apiResponse.error(res, 401, 'Unauthorized');
  }

  const parsed = discountConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Code is required');
  }

  const formattedCode = parsed.data.code.trim().toUpperCase();

  const discountUse = await prisma.discountUse.findUnique({
    where: { generatedCode: formattedCode },
  });

  // Check if code exists
  if (!discountUse) {
    return apiResponse.error(res, 404, 'Code not found ❌');
  }

  // Check if code is already used (status is not 'generated')
  if (discountUse.status !== 'generated') {
    return apiResponse.error(res, 400, 'Code already used ❌');
  }

  // Check if code is expired
  if (discountUse.expiresAt < new Date()) {
    // Mark as expired in database
    await prisma.discountUse.update({
      where: { id: discountUse.id },
      data: { status: 'expired' },
    });
    return apiResponse.error(res, 400, 'Code has expired ❌');
  }

  // Check if code belongs to the partner's venue
  if (discountUse.venueId !== partner.venueId) {
    return apiResponse.error(res, 403, 'Code does not belong to your venue ❌');
  }

  // Ensure confirmed events always have a user_id (from generation)
  // If user_id is missing, this is a data integrity issue - don't allow confirmation
  if (!discountUse.user_id) {
    return apiResponse.error(res, 400, 'Code cannot be confirmed: missing user information ❌');
  }

  await prisma.discountUse.update({
    where: { id: discountUse.id },
    data: {
      status: 'confirmed',
      confirmedAt: new Date(),
    },
  });

  return apiResponse.success(res, { message: 'Discount confirmed ✅' });
});

