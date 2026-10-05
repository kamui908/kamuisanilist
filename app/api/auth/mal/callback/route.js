import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getMalConfig,
  getSession,
  exchangeCodeForTokens,
  getMyUser,
} from "@/lib/mal";

// Step 5-6: MAL redirects back here with ?code=&state=. Verify state, exchange
// the code (client secret stays server-side), then seal tokens in the session.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = `${url.protocol}//${url.host}`;

  const fail = (message) =>
    NextResponse.redirect(
      `${appUrl}/?mal_error=${encodeURIComponent(message)}`
    );

  if (!code || !state) return fail("Authorization was cancelled or failed.");

  const jar = await cookies();
  let saved = null;
  try {
    saved = JSON.parse(jar.get("kamui_mal_oauth")?.value ?? "null");
  } catch {
    saved = null;
  }
  if (!saved || saved.state !== state) {
    return fail("Session mismatch. Please try signing in again.");
  }

  let config;
  try {
    config = getMalConfig();
  } catch (e) {
    return fail(e.message);
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      verifier: saved.verifier,
      redirectUri: config.redirectUri,
    });
  } catch {
    return fail("Token exchange with MyAnimeList failed.");
  }

  const session = await getSession();
  session.mal = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    user: null,
  };
  try {
    const me = await getMyUser(session);
    session.mal.user = { name: me.name, picture: me.picture ?? null };
  } catch {
    // Non-fatal: list/detail calls will surface real auth problems.
  }
  await session.save();

  const res = NextResponse.redirect(`${appUrl}/?mal=connected`);
  res.cookies.delete("kamui_mal_oauth");
  return res;
}
