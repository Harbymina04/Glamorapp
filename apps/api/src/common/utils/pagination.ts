export function getPaginationParams(page: number | string, limit: number | string) {
  const p = typeof page === 'string' ? parseInt(page, 10) || 1 : (page || 1);
  const l = typeof limit === 'string' ? parseInt(limit, 10) || 10 : (limit || 10);
  return {
    skip: (p - 1) * l,
    take: l,
  };
}
