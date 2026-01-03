/**
 * Allowed university email domains for authentication
 */
export const ALLOWED_UNIVERSITY_DOMAINS = [
  'studio.unibo.it',
  'unibo.it',
  'unimi.it',
  'polimi.it',
  // Add more domains as needed
];

/**
 * Check if an email domain is allowed
 */
export function isUniversityEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return ALLOWED_UNIVERSITY_DOMAINS.some((allowedDomain) => {
    const normalizedAllowed = allowedDomain.toLowerCase();
    const normalizedEmail = domain.toLowerCase();
    
    // Exact match or subdomain match
    return (
      normalizedEmail === normalizedAllowed ||
      normalizedEmail.endsWith('.' + normalizedAllowed)
    );
  });
}

/**
 * Extract first name from email local part
 * Example: "michael.rossi@studio.unibo.it" -> "Michael"
 */
export function extractFirstName(email: string): string {
  const localPart = email.split('@')[0];
  const firstPart = localPart.split('.')[0];
  
  if (!firstPart) return '';
  
  // Capitalize first letter, lowercase the rest
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
}

