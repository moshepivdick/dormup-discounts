import type { IncomingMessage } from 'http';
import type { NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
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

const signToken = (type: SessionType, id: string) =>
  jwt.sign({ [sessionConfig[type].key]: id }, sessionConfig[type].secret(), {
    expiresIn: MAX_AGE_SECONDS,
  });

const verifyToken = (type: SessionType, token: string) => {
  try {
    return jwt.verify(token, sessionConfig[type].secret()) as Record<string, string>;
  } catch {
    return null;
  }
};

const createSessionCookie = (type: SessionType, token: string) =>
  serialize(sessionConfig[type].cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

const clearSessionCookie = (type: SessionType) =>
  serialize(sessionConfig[type].cookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

const getSessionToken = (req: IncomingMessage | undefined, type: SessionType) => {
  if (!req) return null;
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = parse(cookieHeader);
  return cookies[sessionConfig[type].cookie] ?? null;
};

const getPartnerFromRequest = async (req?: IncomingMessage) => {
  const token = getSessionToken(req, 'partner');
  if (!token) return null;
  const payload = verifyToken('partner', token);
  if (!payload) return null;
  
  const partner = await prisma.partner.findUnique({
    where: { id: payload.partnerId },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          category: true,
          discountText: true,
          details: true,
          openingHours: true,
          openingHoursShort: true,
          mapUrl: true,
          latitude: true,
          longitude: true,
          imageUrl: true,
          thumbnailUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          phone: true,
          // Explicitly exclude avgStudentBill/subscriptionTier to avoid P2022 errors
        },
      },
    },
  });

  if (!partner) return null;

  if (!partner.venue) {
    return partner as any;
  }

  let subscriptionTier = 'BASIC';
  try {
    const venueTier = await prisma.venue.findUnique({
      where: { id: partner.venueId },
      select: { subscriptionTier: true },
    });
    if (venueTier?.subscriptionTier) {
      subscriptionTier = venueTier.subscriptionTier;
    }
  } catch (error: any) {
    const isMissingColumn = error?.code === 'P2022' || error?.message?.includes('subscriptionTier');
    if (!isMissingColumn) {
      throw error;
    }
    console.warn('Venue subscriptionTier column missing, defaulting to BASIC');
  }

  return {
    ...partner,
    venue: {
      ...partner.venue,
      subscriptionTier,
    } as any,
  } as any;
};

const getAdminFromRequest = async (req?: IncomingMessage) => {
  const token = getSessionToken(req, 'admin');
  if (!token) return null;
  const payload = verifyToken('admin', token);
  if (!payload) return null;
  return prisma.admin.findUnique({
    where: { id: payload.adminId },
  });
};

const setSessionCookie = (res: NextApiResponse, type: SessionType, token: string) => {
  res.setHeader('Set-Cookie', createSessionCookie(type, token));
};

const unsetSessionCookie = (res: NextApiResponse, type: SessionType) => {
  res.setHeader('Set-Cookie', clearSessionCookie(type));
};

export const auth = {
  signPartner: (partnerId: string) => signToken('partner', partnerId),
  signAdmin: (adminId: string) => signToken('admin', adminId),
  getPartnerFromRequest,
  getAdminFromRequest,
  setPartnerCookie: (res: NextApiResponse, token: string) =>
    setSessionCookie(res, 'partner', token),
  setAdminCookie: (res: NextApiResponse, token: string) =>
    setSessionCookie(res, 'admin', token),
  clearPartnerCookie: (res: NextApiResponse) =>
    unsetSessionCookie(res, 'partner'),
  clearAdminCookie: (res: NextApiResponse) => unsetSessionCookie(res, 'admin'),
};

