import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/prof/login") || pathname.startsWith("/student/login")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("quazian_session")?.value;
  const role = cookie?.split(".")[1];

  if (pathname.startsWith("/prof") && role !== "PROF") {
    return NextResponse.redirect(new URL("/prof/login", request.url));
  }

  if (pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/student/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/prof/:path*", "/student/:path*"],
};
