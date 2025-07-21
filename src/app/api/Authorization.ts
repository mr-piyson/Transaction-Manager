import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "../Auth/auth.actions";

export function Authorization(
  handler: (req: NextRequest) => Promise<NextResponse>,
  role: string[]
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const account = await getAccount();

      if (!account) {
        return new NextResponse("Unauthorized: No account found", {
          status: 401,
        });
      }

      if (!role.includes(account.role)) {
        return new NextResponse("Unauthorized: Insufficient role", {
          status: 403,
        });
      }

      return await handler(req);
    } catch (error) {
      console.error("Error in Authorization middleware:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  };
}
