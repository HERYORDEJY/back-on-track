import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const path = request.nextUrl.pathname;
  const id = path.startsWith("/learner/") ? path.split("/")[2] : null;
  headers.set("x-backontrack-learner-id", id ?? "");
  headers.set("x-backontrack-advisor", path === "/advisor" || path.startsWith("/advisor/") ? "true" : "");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/learner/:path*", "/advisor/:path*"] };
