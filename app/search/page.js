"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Flame, LayoutGrid, List, Search, SearchX, Star } from "lucide-react";

const SEARCH_QUERY = `
  query ($search: String) {
    Page(perPage: 24) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title { romaji english }
        coverImage { large }
        format
        seasonYear
        averageScore
        episodes
      }
    }
  }
`;

const TRENDING_QUERY = `
  query {
    Page(perPage: 12) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title { romaji english }
        coverImage { large }
        format
        seasonYear
        averageScore
        episodes
      }
    }
  }
`;

async function runQuery(query, variables) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList responded ${res.status}`);
  const data = await res.json();
  return data.data?.Page?.media ?? [];
}

function markSearchLeave() {
  try {
    sessionStorage.setItem("kamui-back-target", "/search");
    sessionStorage.setItem("kamui-search-scroll", String(window.scrollY));
  } catch {}
}

function ResultRow({ anime }) {
  const title = anime.title.english || anime.title.romaji;
  return (
    <Link
      href={`/anime/${anime.id}`}
      onClick={markSearchLeave}
      className="text-decoration-none anime-row"
      style={{ color: "var(--rl-text)" }}
      aria-label={title}
    >
      <img
        src={anime.coverImage?.large}
        alt=""
        loading="lazy"
        decoding="async"
        width="88"
        height="120"
      />
      <span className="flex-grow-1" style={{ minWidth: 0 }}>
        <span className="d-block font-heading" style={{ minHeight: 0 }}>{title}</span>
        <span className="d-block font-meta mt-1">
          {[anime.format?.replace(/_/g, " "), anime.seasonYear].filter(Boolean).join(" · ")}
          {anime.averageScore ? ` · ★ ${anime.averageScore}` : ""}
          {anime.episodes ? ` · ${anime.episodes} eps` : ""}
        </span>
      </span>
      <ChevronRight size={16} style={{ color: "var(--rl-muted)", flexShrink: 0 }} />
    </Link>
  );
}

function ResultCard({ anime, eager }) {
  const title = anime.title.english || anime.title.romaji;
  return (
    <Link
      href={`/anime/${anime.id}`}
      onClick={markSearchLeave}
      className="text-decoration-none"
      aria-label={title}
    >
      <div className="d-flex h-100 anime-list">
        <img
          src={anime.coverImage?.large}
          alt={title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
          width="460"
          height="613"
        />
        <div className="flex-grow-1 p-2 d-flex flex-column">
          <h6 className="mb-1 font-heading">{title}</h6>
          <p className="mb-1 font-score d-flex align-items-center gap-1">
            <Star size={13} style={{ color: "var(--rl-accent)" }} fill="currentColor" />
            {anime.averageScore ?? "N/A"}
            <span className="font-meta ms-1">{anime.episodes ?? "?"} eps</span>
          </p>
          <div className="mt-auto pt-1 d-flex flex-wrap gap-1">
            {anime.format && (
              <span className="badge font-badge badge-accent">
                {anime.format.replace(/_/g, " ")}
              </span>
            )}
            {anime.seasonYear && (
              <span className="badge font-badge badge-muted-dark">{anime.seasonYear}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  // NOTE: storage-free initial values so SSR HTML matches first client render.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [view, setView] = useState("grid");
  const [malMode, setMalMode] = useState(false);

  function changeView(next) {
    setView(next);
    try {
      sessionStorage.setItem("kamui-search-view", next);
    } catch {}
  }

  // Avoid a loading flash when remounting with cached results for the same query
  const lastFetched = useRef(null);

  // Restore persisted search state after the hydration-safe first paint.
  // Runs before the trending/search effects below (declaration order).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const v = sessionStorage.getItem("kamui-search-view");
      if (v === "grid" || v === "list") setView(v);
      const q = sessionStorage.getItem("kamui-search-query") ?? "";
      if (q) {
        setQuery(q);
        const cached = JSON.parse(
          sessionStorage.getItem("kamui-search-results")
        );
        if (
          cached &&
          cached.query === q.trim() &&
          Array.isArray(cached.results) &&
          cached.results.length
        ) {
          setResults(cached.results);
          lastFetched.current = q.trim();
        }
      }
    } catch {}
    fetch("/api/auth/mal/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.signedIn) setMalMode(true);
      })
      .catch(() => {});
  }, []);

  const loadedMode = useRef(null);
  useEffect(() => {
    const mode = malMode ? "mal" : "anilist";
    if (loadedMode.current === mode) return;
    loadedMode.current = mode;
    setLoadingTrending(true);
    const load = malMode
      ? fetch("/api/mal/search?limit=12").then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Search failed");
          return data;
        })
      : runQuery(TRENDING_QUERY, {});
    load
      .then(setTrending)
      .catch(() => setTrending([]))
      .finally(() => setLoadingTrending(false));
  }, [malMode]);

  useEffect(() => {
    const q = query.trim();
    try {
      sessionStorage.setItem("kamui-search-query", query);
    } catch {}
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      lastFetched.current = null;
      return;
    }
    // Cached results for this exact query render instantly; refresh quietly
    setSearching(lastFetched.current !== q);
    const malSearch = malMode;
    const t = setTimeout(async () => {
      try {
        // MAL mode must use MAL ids or the detail page 404s.
        const fresh = malSearch
          ? await fetch(
              `/api/mal/search?q=${encodeURIComponent(q)}&limit=24`
            ).then(async (r) => {
              const data = await r.json();
              if (!r.ok) throw new Error(data.error || "Search failed");
              return data;
            })
          : await runQuery(SEARCH_QUERY, { search: q });
        setResults(fresh);
        lastFetched.current = q;
        try {
          sessionStorage.setItem(
            "kamui-search-results",
            JSON.stringify({ query: q, results: fresh })
          );
        } catch {}
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, malMode]);

  const isSearching = query.trim().length >= 3;
  const shown = isSearching ? results : trending;

  // Persist + restore scroll so detail trips return to the exact position
  const scrollRestored = useRef(false);
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem("kamui-search-scroll", String(window.scrollY));
      } catch {}
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  useEffect(() => {
    if ((searching || loadingTrending) && shown.length === 0) return;
    if (scrollRestored.current) return;
    scrollRestored.current = true;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem("kamui-search-scroll")) || 0;
    } catch {}
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
      setTimeout(() => {
        if (window.scrollY < y - 200) window.scrollTo(0, y);
      }, 400);
    }
  }, [searching, loadingTrending, shown.length]);

  return (
    <div style={{ background: "var(--rl-bg)", color: "var(--rl-text)", minHeight: "100vh" }}>
      <div className="container py-4">
        <Link href="/" className="btn btn-sm theme-toggle text-decoration-none d-inline-flex align-items-center gap-2 mb-3">
          <ArrowLeft size={14} /> Back to list
        </Link>
        <p className="font-eyebrow mb-1 d-flex align-items-center gap-2" style={{ color: "var(--rl-accent)" }}>
          <Search size={13} /> Explore
        </p>
        <h1 className="fw-bold title mb-3" style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}>
          Search all anime
        </h1>
        <div className="d-flex align-items-center gap-2 px-3 mb-2" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
          <Search size={18} style={{ color: "var(--rl-muted)", flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Type at least 3 letters… e.g. Frieren"
            aria-label="Search all anime"
            className="form-control border-0 bg-transparent py-3"
            style={{ boxShadow: "none", color: "var(--rl-text)", fontSize: "1.05rem" }}
          />
          {searching && <span className="small" style={{ color: "var(--rl-muted)" }}>…</span>}
        </div>
        <p className="small mb-4" style={{ color: "var(--rl-muted)" }}>
          {isSearching
            ? searching
              ? "Searching AniList…"
              : `${results.length} result${results.length === 1 ? "" : "s"} — click any card for details`
            : malMode
              ? "Top airing on MyAnimeList — or type above to find anything."
              : "Trending now on AniList — or type above to find anything."}
        </p>

        {!isSearching && (
          <div className="d-flex justify-content-between align-items-center mb-2">
            <p className="font-eyebrow mb-0 d-flex align-items-center gap-2" style={{ color: "var(--rl-muted)" }}>
              <Flame size={13} /> Trending
            </p>
            <div className="view-switch" role="group" aria-label="Switch layout">
              <button
                onClick={() => changeView("grid")}
                className={view === "grid" ? "active" : ""}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => changeView("list")}
                className={view === "list" ? "active" : ""}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="d-flex justify-content-end mb-2">
            <div className="view-switch" role="group" aria-label="Switch layout">
              <button
                onClick={() => changeView("grid")}
                className={view === "grid" ? "active" : ""}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => changeView("list")}
                className={view === "list" ? "active" : ""}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        )}

        {(isSearching && searching) || (!isSearching && loadingTrending) ? (
          view === "grid" ? (
            <div className="anime-grid" aria-label="Searching">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-shimmer" style={{ aspectRatio: "3 / 4" }} />
                  <div className="p-2">
                    <div className="skeleton-shimmer rounded mb-2" style={{ height: 14, width: "80%" }} />
                    <div className="skeleton-shimmer rounded" style={{ height: 11, width: "50%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="anime-rows" aria-label="Searching">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="d-flex align-items-center gap-3 p-2" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 10 }}>
                  <div className="skeleton-shimmer rounded" style={{ width: 44, height: 60, flexShrink: 0 }} />
                  <div className="flex-grow-1">
                    <div className="skeleton-shimmer rounded mb-2" style={{ height: 14, width: "60%" }} />
                    <div className="skeleton-shimmer rounded" style={{ height: 11, width: "35%" }} />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : shown.length === 0 ? (
          <div className="text-center p-5 d-flex flex-column align-items-center" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
            <SearchX size={28} style={{ color: "var(--rl-muted)" }} className="mb-2" />
            <p className="fw-semibold mb-1">
              {isSearching ? `No results for “${query.trim()}”` : "Nothing trending right now"}
            </p>
            <p className="small mb-0" style={{ color: "var(--rl-muted)" }}>
              {isSearching ? "Check the spelling or try another title." : "Check your connection and reload."}
            </p>
          </div>
        ) : (
          view === "grid" ? (
            <div className="anime-grid">
              {shown.map((a, i) => (
                <ResultCard key={a.id} anime={a} eager={i < 6} />
              ))}
            </div>
          ) : (
            <div className="anime-rows">
              {shown.map((a) => (
                <ResultRow key={a.id} anime={a} />
              ))}
            </div>
          )
        )}
      </div>
      <div style={{ height: 48 }} />
    </div>
  );
}
