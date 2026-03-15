import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Redirect to root WITH the code preserved in the URL.
  // The client-side Supabase JS will detect the code param
  // and exchange it for a session using the stored PKCE code_verifier.
  // We do NOT exchange it here because the server doesn't have the code_verifier.
  const redirectUrl = new URL("/", request.url);
  if (code) {
    redirectUrl.searchParams.set("code", code);
  }

  return NextResponse.redirect(redirectUrl);
}
