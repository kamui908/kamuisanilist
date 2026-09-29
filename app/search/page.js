"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Search, SearchX, Star } from "lucide-react";

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

function ResultCard({ anime, eager }) {
  const title = anime.title.english || anime.title.romaji;
  return (
    <Link
      href={`/anime/${anime.id}`}
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    runQuery(TRENDING_QUERY, {})
      .then(setTrending)
      .catch(() => setTrending([]))
      .finally(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await runQuery(SEARCH_QUERY, { search: q }));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = query.trim().length >= 3;
  const shown = isSearching ? results : trending;

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
            : "Trending now on AniList — or type above to find anything."}
        </p>

        {!isSearching && (
          <p className="font-eyebrow mb-2 d-flex align-items-center gap-2" style={{ color: "var(--rl-muted)" }}>
            <Flame size={13} /> Trending
          </p>
        )}

        {isSearching && searching ? (
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
          <div className="anime-grid">
            {shown.map((a, i) => (
              <ResultCard key={a.id} anime={a} eager={i < 6} />
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 48 }} />
    </div>
  );
}
