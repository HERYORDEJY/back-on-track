import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const id = request.nextUrl.pathname.split("/")[2];
  headers.set("x-backontrack-learner-id", id ?? "");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/learner/:path*" };
