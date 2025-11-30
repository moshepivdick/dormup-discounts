import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { authSchema } from '@/lib/validators';
import { apiResponse, withMethods } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';

export default withMethods(['POST'], async (req: NextApiRequest, res: NextApiResponse) => {
  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'admin_login',
    limit: 5,
    windowMs: 60_000,
  });
  if (!allowed) return;

  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.error(res, 400, 'Email and password are required');
  }

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      return apiResponse.error(res, 401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return apiResponse.error(res, 401, 'Invalid credentials');
    }

    const token = auth.signAdmin(admin.id);
    auth.setAdminCookie(res, token);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return apiResponse.success(res, { message: 'Admin signed in' });
  } catch (error) {
    return apiResponse.error(res, 500, 'Unable to sign in', error);
  }
});

