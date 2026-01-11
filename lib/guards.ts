import type { GetServerSidePropsContext } from 'next';
import { auth } from '@/lib/auth';

export const requireAdmin = async (ctx: GetServerSidePropsContext) => {
  const admin = await auth.getAdminFromRequest(ctx.req);
  if (!admin) {
    // Return 404 instead of redirecting to non-existent /admin/login
    return {
      notFound: true,
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

