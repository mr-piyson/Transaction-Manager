import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/contracts/[id]'>) {
  try {
    // GET logic here
    const contractId = (await ctx.params).id;
    const contract = db.contract.findUnique({
      where: {
        id: contractId,
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
