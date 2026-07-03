export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'bun') {
    const { registerCronJobs } = await import('./server/shared/cron');
    registerCronJobs();
  }
}
