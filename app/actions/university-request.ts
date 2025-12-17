'use server';

import { prisma } from '@/lib/prisma';
import { universityRequestSchema } from '@/lib/validators';

export async function submitUniversityRequest(formData: FormData) {
  const rawData = {
    requestedName: formData.get('requestedName') as string,
    requestedCity: formData.get('requestedCity') as string,
    suggestedDomains: formData.get('suggestedDomains') as string,
    requesterEmail: formData.get('requesterEmail') as string,
    notes: formData.get('notes') as string,
  };

  // Parse domains
  const parseDomains = (input: string): string[] => {
    if (!input.trim()) return [];
    return input
      .split(/[,\s\n]+/)
      .map((s) => {
        let cleaned = s.trim().toLowerCase();
        // Remove leading @
        if (cleaned.startsWith('@')) {
          cleaned = cleaned.slice(1);
        }
        // Remove protocol
        cleaned = cleaned.replace(/^https?:\/\//, '').replace(/^mailto:/, '');
        // Remove path and query
        cleaned = cleaned.split('/')[0].split('?')[0];
        return cleaned;
      })
      .filter((d) => d.includes('.') && d.length > 3);
  };

  const domains = parseDomains(rawData.suggestedDomains || '');

  const parsed = universityRequestSchema.safeParse({
    requestedName: rawData.requestedName,
    requestedCity: rawData.requestedCity || undefined,
    requestedDomains: domains.length > 0 ? domains : undefined,
    requesterEmail: rawData.requesterEmail,
    notes: rawData.notes || undefined,
  });

  if (!parsed.success) {
    return {
      error: 'Invalid form data',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { requestedName, requestedCity, requestedDomains, requesterEmail, notes } =
    parsed.data;

  try {
    // Check for existing pending request
    const existing = await prisma.universityRequest.findFirst({
      where: {
        requesterEmail: requesterEmail.toLowerCase(),
        status: 'pending',
        requestedName: {
          equals: requestedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return {
        error: 'You already have a pending request for this university',
      };
    }

    await prisma.universityRequest.create({
      data: {
        requestedName,
        requestedCity: requestedCity || null,
        requestedDomains: requestedDomains || [],
        requesterEmail: requesterEmail.toLowerCase(),
        notes: notes || null,
        status: 'pending',
      },
    });

    return {
      success: true,
      message: 'Request submitted successfully',
    };
  } catch (error: any) {
    console.error('University request error:', error);
    return {
      error: error.message || 'Failed to submit request',
    };
  }
}

