import type { NextApiResponse } from 'next';
import { SubscriptionTier } from '@prisma/client';

export const tierRank: Record<SubscriptionTier, number> = {
  BASIC: 0,
  PRO: 1,
  MAX: 2,
};

const normalizeTier = (tier?: SubscriptionTier | null) =>
  (tier ?? SubscriptionTier.BASIC) as SubscriptionTier;

export const hasTier = (current: SubscriptionTier | null | undefined, required: SubscriptionTier) => {
  const currentTier = normalizeTier(current);
  return tierRank[currentTier] >= tierRank[required];
};

export const assertTier = (
  current: SubscriptionTier | null | undefined,
  required: SubscriptionTier,
  res?: NextApiResponse,
) => {
  if (hasTier(current, required)) {
    return true;
  }
  if (res) {
    res.status(403).json({ error: 'TIER_REQUIRED', required });
    return false;
  }
  const error = new Error('TIER_REQUIRED');
  (error as any).status = 403;
  (error as any).required = required;
  throw error;
};

export const featureGate = (tier: SubscriptionTier | null | undefined) => {
  const canUsePro = hasTier(tier, SubscriptionTier.PRO);
  const canUseMax = hasTier(tier, SubscriptionTier.MAX);
  return {
    canUsePro,
    canUseMax,
    canExports: canUseMax,
    canPdfReports: canUsePro,
    canAdvancedAnalytics: canUsePro,
    canMultipleOffers: canUsePro,
    canWhiteLabelReports: canUseMax,
    canTopPlacement: canUseMax,
    canPrioritySupport: canUseMax,
  };
};
