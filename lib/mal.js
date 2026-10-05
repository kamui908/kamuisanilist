import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

const MAL_AUTH_BASE = "https://myanimelist.net/v1/oauth2";
const MAL_API_BASE = "https://api.myanimelist.net/v2";

// MAL only supports the `plain` PKCE method (no S256).
export const PKCE_METHOD = "plain";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export function getMalConfig() {
  return {
    clientId: required("MAL_CLIENT_ID"),
    clientSecret: required("MAL_CLIENT_SECRET"),
    redirectUri:
      process.env.MAL_REDIRECT_URI ??
      "https://kamuusanilist.vercel.app/api/auth/mal/callback",
  };
}

export async function getSession() {
  return getIronSession(await cookies(), {
    password: required("IRON_SESSION_PASSWORD"),
    cookieName: "kamui_mal_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  });
}

const PKCE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function randomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PKCE_CHARS[b % PKCE_CHARS.length]).join("");
}

export async function exchangeCodeForTokens({ code, verifier, redirectUri }) {
  const { clientId, clientSecret } = getMalConfig();
  const res = await fetch(`${MAL_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`MAL token exchange failed (${res.status})`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getMalConfig();
  const res = await fetch(`${MAL_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`MAL token refresh failed (${res.status})`);
  }
  return res.json();
}

function isExpired(session) {
  return !session.mal?.expiresAt || Date.now() >= session.mal.expiresAt - 60_000;
}

async function malFetch(session, path, init) {
  const doFetch = (token) =>
    fetch(`${MAL_API_BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    });

  let res = await doFetch(session.mal.accessToken);
  if (res.status === 401 && session.mal.refreshToken) {
    const tokens = await refreshAccessToken(session.mal.refreshToken);
    session.mal.accessToken = tokens.access_token;
    session.mal.refreshToken = tokens.refresh_token ?? session.mal.refreshToken;
    session.mal.expiresAt = Date.now() + tokens.expires_in * 1000;
    await session.save();
    res = await doFetch(session.mal.accessToken);
  }
  if (res.status === 401) {
    const err = new Error("MAL session expired");
    err.code = "MAL_UNAUTHORIZED";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`MAL API error (${res.status})`);
  }
  return res.json();
}

export async function getMyUser(session) {
  return malFetch(session, "/users/@me");
}

const LIST_FIELDS = [
  "id",
  "title",
  "main_picture",
  "genres",
  "mean",
  "num_episodes",
  "media_type",
  "status",
  "list_status",
].join(",");

export async function getMyAnimeList(session) {
  let url = `/users/@me/animelist?fields=${encodeURIComponent(LIST_FIELDS)}&limit=1000`;
  const items = [];
  for (let page = 0; page < 10; page++) {
    const data = await malFetch(session, url);
    items.push(...(data.data ?? []));
    if (data.paging?.next) {
      url = data.paging.next.replace(MAL_API_BASE, "");
    } else {
      break;
    }
  }
  return items;
}

const DETAIL_FIELDS = [
  "id",
  "title",
  "main_picture",
  "synopsis",
  "genres",
  "mean",
  "rank",
  "popularity",
  "num_list_users",
  "num_episodes",
  "average_episode_duration",
  "start_date",
  "end_date",
  "start_season",
  "broadcast",
  "media_type",
  "status",
  "source",
  "studios",
  "related_anime{node{id,title,main_picture,media_type,mean}}",
].join(",");

export async function getAnimeDetail(session, id) {
  return malFetch(
    session,
    `/anime/${encodeURIComponent(id)}?fields=${encodeURIComponent(DETAIL_FIELDS)}`
  );
}

// ---- Normalizers: MAL shape -> the app's AniList-like model ----

// "2024-01-05" -> { year: 2024, month: 1, day: 5 } (or partial/ null-safe)
function parseFuzzyDate(s) {
  if (!s || typeof s !== "string") return { year: null, month: null, day: null };
  const [y, m, d] = s.split("-").map((n) => Number(n));
  return {
    year: Number.isFinite(y) ? y : null,
    month: Number.isFinite(m) ? m : null,
    day: Number.isFinite(d) ? d : null,
  };
}

export function mapListEntry(entry) {
  const node = entry.node ?? {};
  const ls = entry.list_status ?? {};
  const updatedAt = ls.updated_at ? Date.parse(ls.updated_at) : 0;
  return {
    id: node.id,
    title: { romaji: node.title, english: node.title },
    coverImage: {
      large:
        node.main_picture?.large || node.main_picture?.medium || null,
    },
    genres: node.genres?.map((g) => g.name) ?? [],
    tags: [],
    averageScore:
      typeof node.mean === "number" ? Math.round(node.mean * 10) : null,
    episodes: node.num_episodes ?? null,
    status: (node.status ?? "").replace(/_/g, " ") || null,
    format: (node.media_type ?? "").replace(/_/g, " ").toUpperCase() || null,
    siteUrl: `https://myanimelist.net/anime/${node.id}`,
    _updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
    _source: "mal",
    _malStatus: ls.status ?? null,
    _malScore: ls.score ?? 0,
    _malProgress: ls.num_episodes_watched ?? 0,
  };
}

export function mapAnimeDetail(m) {
  const season = m.start_season
    ? `${m.start_season.season} ${m.start_season.year}`
    : null;
  return {
    id: m.id,
    title: {
      romaji: m.title,
      english: m.title,
      native: null,
    },
    coverImage: {
      large: m.main_picture?.large || m.main_picture?.medium || null,
      extraLarge: m.main_picture?.large || m.main_picture?.medium || null,
    },
    bannerImage: null,
    description: m.synopsis ?? "No description available.",
    genres: m.genres?.map((g) => g.name) ?? [],
    tags: [],
    averageScore:
      typeof m.mean === "number" ? Math.round(m.mean * 10) : null,
    meanScore: m.mean ?? null,
    popularity: m.num_list_users ?? m.popularity ?? null,
    favourites: null,
    episodes: m.num_episodes ?? null,
    duration: m.average_episode_duration
      ? Math.round(m.average_episode_duration / 60)
      : null,
    season,
    seasonYear: m.start_season?.year ?? null,
    format: (m.media_type ?? "").replace(/_/g, " ").toUpperCase() || null,
    status: (m.status ?? "").replace(/_/g, " ") || null,
    source: (m.source ?? "").replace(/_/g, " ") || null,
    siteUrl: `https://myanimelist.net/anime/${m.id}`,
    trailer: null,
    studios: (m.studios ?? []).map((s) => s.name).filter(Boolean),
    startDate: parseFuzzyDate(m.start_date),
    endDate: parseFuzzyDate(m.end_date),
    broadcast: m.broadcast
      ? `${m.broadcast.day_of_the_week ?? ""} ${m.broadcast.start_time ?? ""}`.trim()
      : null,
    rank: m.rank ?? null,
    hashtag: null,
    nextAiringEpisode: null,
    externalLinks: [],
    relations: {
      edges: (m.related_anime ?? []).map((r) => ({
        relationType: (r.relation_type ?? "RELATED").toUpperCase(),
        node: {
          id: r.node.id,
          title: {
            romaji: r.node.title,
            english: r.node.title,
          },
          coverImage: {
            large:
              r.node.main_picture?.large ||
              r.node.main_picture?.medium ||
              null,
          },
          format: (r.node.media_type ?? "").replace(/_/g, " ").toUpperCase() || null,
          averageScore:
            typeof r.node.mean === "number"
              ? Math.round(r.node.mean * 10)
              : null,
        },
      })),
    },
    _source: "mal",
  };
}
