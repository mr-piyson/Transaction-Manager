import db from '@/lib/database';

export async function checkOrganization() {
  return (await db.organization.count({})) > 0;
}

export async function getOrganization(slug: string) {
  return await db.organization.findUnique({
    where: {
      slug: slug,
    },
  });
}
