import { NextResponse } from "next/server";
import {
  getSession,
  searchAnime,
  getAiringRanking,
  mapSearchNode,
} from "@/lib/mal";

// Authenticated anime search for MAL mode (AniList ids would 404 in MAL
// detail, so signed-in search must return MAL ids). Empty q => airing ranking.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 12, 1),
    50
  );

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
    const items = q
      ? await searchAnime(session, q, limit)
      : await getAiringRanking(session, limit);
    return NextResponse.json(items.map((e) => mapSearchNode(e.node ?? e)));
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
      { error: e.message || "MAL search failed" },
      { status: 502 }
    );
  }
}
