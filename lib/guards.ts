import type { GetServerSidePropsContext } from 'next';
import { auth } from '@/lib/auth';

export const requireAdmin = async (ctx: GetServerSidePropsContext) => {
  const admin = await auth.getAdminFromRequest(ctx.req);
  if (!admin) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    } as const;
  }
  return { admin } as const;
};

export const requirePartner = async (ctx: GetServerSidePropsContext) => {
  const partner = await auth.getPartnerFromRequest(ctx.req);
  if (!partner) {
    return {
      redirect: {
        destination: '/partner/login',
        permanent: false,
      },
    } as const;
  }
  return { partner } as const;
};

