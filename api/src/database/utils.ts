export function sanitizeDbName(dbName: string): string {
  return dbName.replace(/[^\w_]/g, '');
}
