import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionType = 'partner' | 'admin';

const sessionConfig: Record<
  SessionType,
  { cookie: string; secret: () => string; key: string }
> = {
  partner: {
    cookie: 'partner_session',
    secret: env.partnerSecret,
    key: 'partnerId',
  },
  admin: {
    cookie: 'admin_session',
    secret: env.adminSecret,
    key: 'adminId',
  },
};

const verifyToken = (type: SessionType, token: string) => {
  try {
    return jwt.verify(token, sessionConfig[type].secret()) as Record<string, string>;
  } catch {
    return null;
  }
};

export const getPartnerFromCookies = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionConfig.partner.cookie)?.value;
  
  if (!token) return null;
  const payload = verifyToken('partner', token);
  if (!payload) return null;
  
  return prisma.partner.findUnique({
    where: { id: payload.partnerId },
    include: { venue: true },
  });
};

export const getAdminFromCookies = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionConfig.admin.cookie)?.value;
  
  if (!token) return null;
  const payload = verifyToken('admin', token);
  if (!payload) return null;
  
  return prisma.admin.findUnique({
    where: { id: payload.adminId },
  });
};

