import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith('/static/')) {
    // Serve Monaco workers correctly
    console.log('serving');
    return NextResponse.rewrite(new URL(`/public${url.pathname}`, req.url));
  }

  return NextResponse.next();
}
