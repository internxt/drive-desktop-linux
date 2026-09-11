export function parseSignedUrlExpiry({ url }: { url: string }) {
  try {
    const expires = new URL(url).searchParams.get('Expires');
    if (!expires) return undefined;

    const seconds = Number(expires);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  } catch {
    return undefined;
  }
}
