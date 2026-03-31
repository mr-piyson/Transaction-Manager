import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/contracts'>) {
  try {
    // GET logic here
    const contracts = await db.contract.findMany({});
    return NextResponse.json(contracts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/contracts'>) {
  try {
    // POST logic here
    const data = await req.json();
    const contract = await db.contract.create({
      data,
    });
    console.log(contract);
    return NextResponse.json(contract);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
