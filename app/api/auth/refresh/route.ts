import { NextRequest } from "next/server";
import { endpoint, fail } from "@/lib/server";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  isSecureCookie,
} from "@/lib/auth/utils";
export async function POST(r: NextRequest) {
  const user = verifyRefreshToken(r.cookies.get("refresh_token")?.value || "");
  const response = await endpoint(() => {
    if (!user) fail(401, "Session expirée. Reconnectez-vous.");
    return { success: true, user };
  });
  if (user) {
    const options = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isSecureCookie(r),
      path: "/",
    };
    response.cookies.set("access_token", generateAccessToken(user), {
      ...options,
      maxAge: 43200,
    });
    response.cookies.set("refresh_token", generateRefreshToken(user), {
      ...options,
      maxAge: 30 * 86400,
    });
  }
  return response;
}
