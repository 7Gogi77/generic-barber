import { NextResponse } from 'next/server';

const ADMIN_ROUTES = ['/admin-panel.html', '/poslovni-panel.3f8a1c.html', '/admin-panel', '/poslovni-panel'];

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.endsWith(route));
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return new NextResponse('Admin entry disabled (missing env)', {
      status: 403,
      statusText: 'Admin credentials missing'
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ADMIN_ROUTES
};
