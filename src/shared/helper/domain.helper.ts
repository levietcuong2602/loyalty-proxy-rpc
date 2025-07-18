/**
 * Extract the raw domain (exclude subdomain)
 * @param rawUrl
 * @param countryCodes Supporting country codes.
 */
export function getDomainName(
  rawUrl?: string | null,
  countryCodes: string[] = ['th'],
): string {
  if (!rawUrl) {
    return null;
  }
  const url = new URL(rawUrl);
  const host = url.host.split('.');
  let domain: string;
  if (countryCodes.includes(host[host.length - 1])) {
    domain = host.slice(-3).join('.');
  } else {
    domain = host.slice(-2).join('.');
  }
  return domain;
}
