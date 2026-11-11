import { NextRequest } from "next/server";
import { endpoint, requireUser } from "@/lib/server";
export async function GET(r: NextRequest) {
  return endpoint(() => ({ success: true, user: requireUser(r) }));
}
