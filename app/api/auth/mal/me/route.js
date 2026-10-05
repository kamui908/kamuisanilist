import { NextResponse } from "next/server";
import { getSession } from "@/lib/mal";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.mal?.accessToken) {
      return NextResponse.json({ signedIn: false });
    }
    return NextResponse.json({
      signedIn: true,
      user: session.mal.user ?? null,
    });
  } catch {
    return NextResponse.json({ signedIn: false });
  }
}
