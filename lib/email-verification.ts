import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create an email verification token for a user
 * @param userId The user's ID
 * @returns The verification token
 */
export async function createVerificationToken(userId: string): Promise<string> {
  // Delete any existing token for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  // Generate new token
  const token = generateVerificationToken();
  
  // Set expiration to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Create token in database
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify and consume an email verification token
 * @param token The verification token
 * @returns The user ID if token is valid, null otherwise
 */
export async function verifyToken(token: string): Promise<string | null> {
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken) {
    return null;
  }

  // Check if token has expired
  if (verificationToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });
    return null;
  }

  // Token is valid, delete it (one-time use)
  await prisma.emailVerificationToken.delete({
    where: { id: verificationToken.id },
  });

  return verificationToken.userId;
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

