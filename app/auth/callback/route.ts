import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  const validatedNext: string = isValidInternalPath(next) ? (next as string) : '/oauth/consent';

  return NextResponse.redirect(new URL(validatedNext, request.url));
}

function isValidInternalPath(path: string | null): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  return path.startsWith('/');
}
