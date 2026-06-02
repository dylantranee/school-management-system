/**
 * Helper to convert HH:MM:SS string to minutes from midnight.
 */
export const timeStringToMinutes = (timeStr: string): number => {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Timezone-safe helper to convert Prisma Date object to minutes from midnight.
 */
export const dateToMinutes = (d: Date): number => {
  const iso = d.toISOString(); // e.g. "1970-01-01T09:00:00.000Z"
  const match = iso.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return d.getHours() * 60 + d.getMinutes();
};
