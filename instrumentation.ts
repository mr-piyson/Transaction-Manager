export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "bun"
  ) {
    const { registerCronJobs } = await import("./server/shared/cron");
    registerCronJobs();

    // Zero-touch permission sync: create missing Permission rows and top up
    // OWNER role copies with codes no role holds yet. Additive + idempotent.
    if (process.env.DISABLE_PERMISSION_SYNC !== "true") {
      try {
        const { syncPermissionsAndGrants } = await import(
          "./server/shared/permission-sync"
        );
        const summary = await syncPermissionsAndGrants();
        if (summary.permissionsCreated > 0 || summary.ownerGrantsCreated > 0) {
          console.log(
            `[permissions] Synced on boot: ${summary.permissionsCreated} new permission(s), ${summary.ownerGrantsCreated} new OWNER grant(s)`,
          );
        }
      } catch (error) {
        // Never block app startup because of a sync failure.
        console.error("[permissions] Boot sync failed:", error);
      }
    }
  }
}
