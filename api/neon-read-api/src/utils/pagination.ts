export function paginateQuery(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  return { limit, offset };
}