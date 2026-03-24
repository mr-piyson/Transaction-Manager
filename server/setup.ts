import db from '@/lib/database';

export async function checkOrganization() {
  return (await db.organization.count({})) > 0;
}
