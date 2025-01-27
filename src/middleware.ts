import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname.startsWith('/static/')) {
    // Serve Monaco workers correctly
    console.log('serving');
    return NextResponse.rewrite(new URL(`/public${url.pathname}`, request.url));
  }

  return NextResponse.next();
}
