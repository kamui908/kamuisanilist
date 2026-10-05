import { NextResponse } from "next/server";
import { getMalConfig, PKCE_METHOD, randomString } from "@/lib/mal";

// Step 1-2: mint PKCE verifier (MAL requires `plain`) + state, stash in a
// short-lived httpOnly cookie, then send the user to MAL's authorize page.
export async function GET() {
  let config;
  try {
    config = getMalConfig();
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const verifier = randomString(96);
  const state = randomString(32);

  const authorize = new URL("https://myanimelist.net/v1/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("redirect_uri", config.redirectUri);
  authorize.searchParams.set("code_challenge", verifier);
  authorize.searchParams.set("code_challenge_method", PKCE_METHOD);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set("kamui_mal_oauth", JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
