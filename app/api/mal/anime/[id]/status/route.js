import { NextResponse } from "next/server";
import {
  getSession,
  updateMyListStatus,
  deleteMyListEntry,
} from "@/lib/mal";

async function withSession() {
  const session = await getSession();
  if (!session.mal?.accessToken) {
    return { error: NextResponse.json({ error: "Not signed in with MAL" }, { status: 401 }) };
  }
  return { session };
}

function expired(session) {
  try {
    session.destroy();
  } catch {}
  return NextResponse.json(
    { error: "MAL session expired", reauth: true },
    { status: 401 }
  );
}

// Update (or add) my list entry. Only whitelisted fields are forwarded.
export async function PUT(request, { params }) {
  const { id } = await params;
  let session;
  try {
    ({ session } = await withSession());
    if (!session) {
      return NextResponse.json({ error: "Not signed in with MAL" }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  let patch = {};
  try {
    patch = await request.json();
  } catch {
    patch = {};
  }
  // Client-side clamp backup: never send episodes above the known total.
  if (typeof patch.num_watched_episodes === "number" && typeof patch.total === "number") {
    patch.num_watched_episodes = Math.max(
      0,
      Math.min(patch.num_watched_episodes, patch.total)
    );
  }
  delete patch.total;

  try {
    const updated = await updateMyListStatus(session, id, patch);
    return NextResponse.json(updated);
  } catch (e) {
    if (e.code === "MAL_UNAUTHORIZED") return expired(session);
    return NextResponse.json(
      { error: e.message || "Failed to update list entry" },
      { status: 502 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  let session;
  try {
    ({ session } = await withSession());
    if (!session) {
      return NextResponse.json({ error: "Not signed in with MAL" }, { status: 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  try {
    return NextResponse.json(await deleteMyListEntry(session, id));
  } catch (e) {
    if (e.code === "MAL_UNAUTHORIZED") return expired(session);
    return NextResponse.json(
      { error: e.message || "Failed to remove list entry" },
      { status: 502 }
    );
  }
}
