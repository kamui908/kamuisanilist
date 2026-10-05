import { NextResponse } from "next/server";
import { getSession, getAnimeDetail, mapAnimeDetail } from "@/lib/mal";

export async function GET(_request, { params }) {
  const { id } = await params;
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
    const detail = await getAnimeDetail(session, id);
    return NextResponse.json(mapAnimeDetail(detail));
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
      { error: e.message || "Failed to load anime" },
      { status: 502 }
    );
  }
}
