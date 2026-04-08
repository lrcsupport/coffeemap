/**
 * Takes any string (URL, @handle, plain handle) and returns a clean
 * lowercase handle with no @ symbol and no URL prefix.
 */
export function cleanHandle(input: string): string {
  let handle = input.trim();

  // Strip URL prefixes
  const urlPatterns = [
    /^https?:\/\/(www\.)?instagram\.com\//i,
    /^https?:\/\/instagr\.am\//i,
  ];
  for (const pattern of urlPatterns) {
    handle = handle.replace(pattern, '');
  }

  // Remove trailing slash and query params
  handle = handle.split('?')[0].split('#')[0].replace(/\/+$/, '');

  // Strip @ prefix
  handle = handle.replace(/^@/, '');

  return handle.toLowerCase();
}
