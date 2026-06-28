export async function register() {
  const { registerCronJobs } = await import('./server/cron');
  registerCronJobs();
}
