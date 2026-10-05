import { NextResponse } from "next/server";
import { getSession } from "@/lib/mal";

export async function GET() {
  try {
    const session = await getSession();
    session.destroy();
  } catch {
    // Missing env or no session — still send the user home.
  }
  const base =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : "/";
  return NextResponse.redirect(new URL("/", base).toString());
}

export async function POST() {
  return GET();
}
