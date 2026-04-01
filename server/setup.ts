import db from '@/lib/db';

export async function checkOrganization() {
  return (await db.organization.count({})) > 0;
}

export async function getOrganization(id: string) {
  return await db.organization.findUnique({
    where: {
      id: Number(id),
    },
  });
}
