export function getRequestKey({ method, url }: { method?: string; url?: string }) {
  return `${method?.toUpperCase() ?? 'GET'}:${url ?? ''}`;
}
