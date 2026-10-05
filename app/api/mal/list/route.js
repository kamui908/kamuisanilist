import { NextResponse } from "next/server";
import { getSession, getMyAnimeList, mapListEntry } from "@/lib/mal";

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!session.mal?.accessToken) {
    return NextResponse.json({ error: "Not signed in with MAL" }, { status: 401 });
  }
  try {
    const items = await getMyAnimeList(session);
    return NextResponse.json(items.map(mapListEntry));
  } catch (e) {
    if (e.code === "MAL_UNAUTHORIZED") {
      try {
        session.destroy();
      } catch {}
      return NextResponse.json(
        { error: "MAL session expired", reauth: true },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: e.message || "Failed to load MAL list" },
      { status: 502 }
    );
  }
}
