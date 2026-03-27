import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Dynamically forces the backend to adapt to ANY domain, IP, or tunnel hitting it
function adaptUrl(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') || 'http';

  if (host) {
    process.env.BETTER_AUTH_URL = `${protocol}://${host}`;
  }
}

export async function GET(req: NextRequest) {
  adaptUrl(req);
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  adaptUrl(req);
  return auth.handler(req);
}
