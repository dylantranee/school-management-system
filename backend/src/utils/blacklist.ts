import jwt from 'jsonwebtoken';

const blacklist = new Map<string, number>();

/**
 * Add a token to the blacklist with its expiration timestamp.
 */
export const addToBlacklist = (token: string): void => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded && decoded.exp) {
      // decoded.exp is in seconds
      blacklist.set(token, decoded.exp * 1000);
    } else {
      // Default fallback: 1 day
      blacklist.set(token, Date.now() + 24 * 60 * 60 * 1000);
    }
  } catch (err) {
    blacklist.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
};

/**
 * Check if a token is blacklisted and not yet expired.
 */
export const isBlacklisted = (token: string): boolean => {
  const exp = blacklist.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    blacklist.delete(token);
    return false;
  }
  return true;
};

// Periodic cleanup of expired tokens (Scenario 10)
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of blacklist.entries()) {
    if (now > exp) {
      blacklist.delete(token);
    }
  }
}, 10 * 60 * 1000); // run every 10 minutes

