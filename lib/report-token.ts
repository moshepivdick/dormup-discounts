import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import crypto from 'crypto';

const TOKEN_SECRET = process.env.REPORT_TOKEN_SECRET || env.adminSecret();
const TOKEN_TTL_SECONDS = 300; // 5 minutes - short-lived for security

export interface ReportTokenPayload {
  scope: 'admin' | 'partner';
  month: string;
  partnerId?: string;
  venueId?: number;
  userId: string; // Admin or Partner ID
  type: 'admin' | 'partner';
}

/**
 * Generate a one-time signed token for accessing the print route
 */
export function generateReportToken(payload: ReportTokenPayload): string {
  return jwt.sign(payload, TOKEN_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

/**
 * Verify and decode a report token
 */
export function verifyReportToken(token: string): ReportTokenPayload | null {
  try {
    return jwt.verify(token, TOKEN_SECRET) as ReportTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a deterministic hash for file naming
 */
export function generateReportHash(scope: string, month: string, venueId?: number): string {
  const input = `${scope}-${month}-${venueId || 'global'}-${Date.now()}`;
  return crypto.createHash('md5').update(input).digest('hex').substring(0, 8);
}
