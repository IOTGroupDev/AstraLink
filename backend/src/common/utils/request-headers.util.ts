type HeadersLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined;

export const getHeaderValue = (
  req: { headers?: HeadersLike },
  name: string,
): string | undefined => {
  const headers = req.headers;
  if (!headers) return undefined;

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined;
  }

  const raw = (headers as Record<string, string | string[] | undefined>)[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
};
