/**
 * Sanitizes input strings to prevent Stored XSS by stripping HTML tags and script elements.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }
  // Strip script tags and any other HTML tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script>...</script>
    .replace(/<[^>]*>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Recursively sanitizes all string values in an object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = (obj as any)[key];
      if (typeof val === 'string') {
        (result as any)[key] = sanitizeInput(val);
      } else if (typeof val === 'object' && val !== null) {
        (result as any)[key] = sanitizeObject(val);
      } else {
        (result as any)[key] = val;
      }
    }
  }
  
  return result as T;
}
