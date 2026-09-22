// Revision dates of the legal pages, read by their "Last updated" line and the sitemap
// Bump the date whenever the page text changes

export const PRIVACY_UPDATED = '2026-09-21';
export const TOS_UPDATED = '2026-06-01';

/** "September 2026" for a YYYY-MM-DD date */
export function formatMonthYear(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
