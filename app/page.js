"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Star,
  Clapperboard,
  ChevronDown,
  Sparkles,
  ListFilter,
  Search,
  SearchX,
  RotateCcw,
  ArrowDownWideNarrow,
} from "lucide-react";
import { AuroraText } from "@/components/magicui/aurora-text";
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon";

const PAGE_SIZE = 30;
const STATE_KEY = "kamui-list-state";
const LIST_KEY = "kamui-anime-list";
const SCROLL_KEY = "kamui-scroll";

function readStoredState() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function getCachedList() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(sessionStorage.getItem(LIST_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  } catch {}
}

export default function Home() {
  const [animeList, setAnimeList] = useState(getCachedList);
  const [selectedFilters, setSelectedFilters] = useState(
    () => readStoredState().selectedFilters ?? []
  );
  const [type, setType] = useState(() => readStoredState().type ?? "All");
  const [visibleCount, setVisibleCount] = useState(
    () => readStoredState().visibleCount ?? PAGE_SIZE
  );
  const [loading, setLoading] = useState(() => getCachedList().length === 0);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState("light");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const onTheme = (e) => setTheme(e.detail || "light");
    window.addEventListener("rl-theme", onTheme);
    return () => window.removeEventListener("rl-theme", onTheme);
  }, []);

  // Global AniList search — independent of my list, debounced type-ahead
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query ($search: String) {
                Page(perPage: 8) {
                  media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                    id
                    title { romaji english }
                    coverImage { large }
                    format
                    seasonYear
                    averageScore
                  }
                }
              }
            `,
            variables: { search: q },
          }),
        });
        const data = await res.json();
        setResults(data.data?.Page?.media ?? []);
        setSearchOpen(true);
      } catch {
        setResults([]);
        setSearchOpen(true);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    async function fetchData() {
      const query = `
        query ($username: String) {
          MediaListCollection(userName: $username, type: ANIME) {
            lists {
              entries {
                media {
                  id
                  title { romaji english }
                  coverImage { large }
                  genres
                  tags { name }
                  averageScore
                  episodes
                  status
                  format
                  siteUrl
                }
              }
            }
          }
        }
      `;

      try {
        if (getCachedList().length === 0) setLoading(true);
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { username: "RyouGura" } }),
        });
        if (!res.ok) throw new Error(`AniList responded ${res.status}`);
        const data = await res.json();
        const entries =
          data.data?.MediaListCollection?.lists?.flatMap((l) => l.entries) ?? [];
        const list = entries.map((e) => e.media).filter(Boolean);
        setAnimeList(list);
        try {
          sessionStorage.setItem(LIST_KEY, JSON.stringify(list));
        } catch {}
      } catch (e) {
        if (getCachedList().length === 0) {
          setError(e.message || "Failed to load list");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Persist filters + position so detail pages restore the exact screen
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({ selectedFilters, type, visibleCount })
      );
    } catch {}
  }, [selectedFilters, type, visibleCount]);

  useEffect(() => {
    window.addEventListener("pagehide", saveScroll);
    return () => window.removeEventListener("pagehide", saveScroll);
  }, []);

  const scrollRestored = useRef(false);
  useEffect(() => {
    if (loading || scrollRestored.current) return;
    scrollRestored.current = true;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem(SCROLL_KEY)) || 0;
    } catch {}
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
      setTimeout(() => {
        if (window.scrollY < y - 200) window.scrollTo(0, y);
      }, 400);
    }
  }, [loading]);

  const { allFilters, filterCounts, formats } = useMemo(() => {
    const genres = [...new Set(animeList.flatMap((a) => a.genres ?? []))].sort();
    const counts = {};
    animeList.forEach((a) => {
      (a.genres ?? []).forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
      (a.tags ?? []).forEach((t) => {
        if (t.name?.toLowerCase() === "isekai") {
          counts["isekai"] = (counts["isekai"] || 0) + 1;
        }
      });
    });
    const filters = [...new Set([...genres, "isekai"])].sort();
    const fmt = ["All", ...new Set(animeList.map((a) => a.format).filter(Boolean))];
    return { allFilters: filters, filterCounts: counts, formats: fmt };
  }, [animeList]);

  const filtered = useMemo(() => {
    return animeList.filter((anime) => {
      const matchesFilters =
        selectedFilters.length === 0 ||
        selectedFilters.every(
          (f) =>
            (anime.genres ?? []).includes(f) ||
            (anime.tags ?? []).some(
              (t) => t.name?.toLowerCase() === f.toLowerCase()
            )
        );
      const matchesType = type === "All" || anime.format === type;
      return matchesFilters && matchesType;
    });
  }, [animeList, selectedFilters, type]);

  function toggleFilter(filter) {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
    setVisibleCount(PAGE_SIZE);
  }

  function resetAll() {
    setSelectedFilters([]);
    setType("All");
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const auroraColors =
    theme === "dark"
      ? ["#e06a5a", "#f5f5f0", "#8a9a86", "#e06a5a"]
      : ["#D44A3A", "#121212", "#8F8F8F", "#D44A3A"];

  return (
    <>
      {/* Intro — full first screen over hexagon grid (hover to light cells) */}
      <section
        className="d-flex flex-column justify-content-center align-items-center text-center position-relative overflow-hidden"
        style={{ minHeight: "calc(100svh - 53px)", background: "var(--rl-bg)" }}
      >
        <HexagonBackground
          hexagonSize={88}
          hexagonMargin={4}
          className="absolute inset-0 bg-transparent dark:bg-transparent [mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        />
        <div className="px-3 d-flex flex-column align-items-center pe-none" style={{ maxWidth: 760, zIndex: 1, pointerEvents: "none" }}>
          <span
            className="font-eyebrow d-inline-flex align-items-center gap-2 px-3 py-1 mb-3"
            style={{
              background: "var(--rl-accent-soft)",
              color: "var(--rl-accent)",
              border: "1px solid var(--rl-border)",
              borderRadius: 999,
            }}
          >
            <Sparkles size={13} />
            Kamui&apos;s collection
          </span>
          <h1 className="display-2 fw-bold mb-3 title" style={{ fontSize: "clamp(3rem, 9vw, 5.5rem)" }}>
            <AuroraText colors={auroraColors} speed={0.5}>
              Kamui
            </AuroraText>
          </h1>
          <p className="lead mb-2 font-alt" style={{ color: "var(--rl-text)" }}>
            <b>Welcome to My Anime List!</b>
          </p>
          <p className="mb-4 mx-auto" style={{ color: "var(--rl-muted)", maxWidth: 560 }}>
            A collection of anime I&apos;ve explored — filter by genre, tag
            and format to find your next watch, from action to heartfelt drama
            to classic isekai.
          </p>
          <a href="#list" className="btn btn-lg btn-hero d-inline-flex align-items-center gap-2" style={{ pointerEvents: "auto" }}>
            <ArrowDownWideNarrow size={18} />
            Browse the list
          </a>
          {!loading && animeList.length > 0 && (
            <p className="mt-3 mb-0 small font-alt" style={{ color: "var(--rl-muted)" }}>
              {animeList.length} titles · {allFilters.length} genres & tags
            </p>
          )}
          <a href="#list" className="scroll-cue mt-5 small text-decoration-none" aria-label="Scroll to list" style={{ pointerEvents: "auto" }}>
            <ChevronDown size={18} />
          </a>
        </div>
      </section>

      {/* Anime Section */}
      <div
        className="container py-5"
        id="list"
        style={{ background: "var(--rl-bg)", color: "var(--rl-text)" }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
          <div>
            <p className="font-eyebrow mb-1 d-flex align-items-center gap-2" style={{ color: "var(--rl-accent)" }}>
              <ListFilter size={13} />
              The shelf
            </p>
            <h2 className="fw-bold mb-1 title" style={{ fontSize: "1.75rem" }}>
              Kamui&apos;s AnimeList
            </h2>
            <p className="mb-0 small" style={{ color: "var(--rl-muted)" }}>
              {loading
                ? "Loading collection…"
                : `${filtered.length} of ${animeList.length} showing`}
              {selectedFilters.length > 0 &&
                ` · ${selectedFilters.length} filter${selectedFilters.length > 1 ? "s" : ""} active`}
            </p>
          </div>
          <span
            className="badge font-badge"
            style={{
              background: "var(--rl-accent-soft)",
              color: "var(--rl-accent)",
              border: "1px solid rgba(212,74,58,.3)",
            }}
          >
            {loading ? "…" : `${filtered.length} anime`}
          </span>
        </div>

        {/* Global search — any anime on AniList */}
        <div className="position-relative mb-4">
          <div className="d-flex align-items-center gap-2 px-3" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
            <Search size={16} style={{ color: "var(--rl-muted)", flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Search any anime… (min 3 letters)"
              aria-label="Search any anime"
              className="form-control border-0 bg-transparent py-2"
              style={{ boxShadow: "none", color: "var(--rl-text)" }}
            />
            {searching && (
              <span className="small" style={{ color: "var(--rl-muted)" }}>…</span>
            )}
          </div>
          {searchOpen && query.trim().length >= 3 && !searching && (
            <div
              className="position-absolute w-100 mt-1"
              style={{
                zIndex: 60,
                background: "var(--rl-elev-1)",
                border: "1px solid var(--rl-border)",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "var(--rl-shadow)",
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {results.length === 0 ? (
                <p className="small mb-0 px-3 py-3" style={{ color: "var(--rl-muted)" }}>
                  No results for “{query.trim()}”.
                </p>
              ) : (
                results.map((r) => (
                  <Link
                    key={r.id}
                    href={`/anime/${r.id}`}
                    onClick={() => {
                      saveScroll();
                      setSearchOpen(false);
                    }}
                    className="d-flex align-items-center gap-2 px-2 py-2 text-decoration-none"
                    style={{ color: "var(--rl-text)" }}
                  >
                    <img
                      src={r.coverImage?.large}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="40"
                      height="53"
                      style={{ width: 40, height: 53, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                    />
                    <span className="flex-grow-1" style={{ minWidth: 0 }}>
                      <span className="d-block font-heading" style={{ fontSize: "0.8rem", minHeight: 0 }}>
                        {r.title.english || r.title.romaji}
                      </span>
                      <span className="d-block font-meta">
                        {[r.format?.replace(/_/g, " "), r.seasonYear].filter(Boolean).join(" · ")}
                        {r.averageScore ? ` · ★ ${r.averageScore}` : ""}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="row mb-4 g-3">
          <div className="col-md-3">
            <label className="form-label fw-semibold small d-flex align-items-center gap-1" style={{ color: "var(--rl-muted)" }}>
              <Clapperboard size={13} />
              Format
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="form-select dark-select"
            >
              {formats.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-9">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-semibold small mb-0 d-flex align-items-center gap-1" style={{ color: "var(--rl-muted)" }}>
                <ListFilter size={13} />
                Genres & Tags
              </label>
              {selectedFilters.length > 0 && (
                <button
                  onClick={resetAll}
                  className="btn btn-sm filter-clear d-inline-flex align-items-center gap-1"
                  style={{
                    background: "transparent",
                    color: "var(--rl-muted)",
                    border: "1px solid var(--rl-border)",
                  }}
                >
                  <RotateCcw size={13} />
                  Clear all ({selectedFilters.length})
                </button>
              )}
            </div>
            <div className="d-flex flex-wrap gap-2">
              {allFilters.map((f) => {
                const isActive = selectedFilters.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleFilter(f)}
                    aria-pressed={isActive}
                    className={`btn btn-sm filter-pill ${isActive ? "active" : ""}`}
                  >
                    {f}
                    <span className="ms-1 opacity-75">
                      {filterCounts[f] ?? 0}
                    </span>
                  </button>
                );
              })}
              {allFilters.length === 0 && !loading && (
                <span className="small" style={{ color: "var(--rl-muted)" }}>
                  No filters yet.
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            className="p-4 mb-4"
            style={{
              background: "var(--rl-elev-1)",
              border: "1px solid rgba(212,74,58,.35)",
              borderRadius: 12,
            }}
          >
            <p className="mb-1 fw-semibold">Couldn&apos;t load AniList.</p>
            <p className="mb-0 small" style={{ color: "var(--rl-muted)" }}>
              {error} — check your connection and reload.
            </p>
          </div>
        )}

        {/* Grid — loading / results / empty */}
        {loading ? (
          <div className="anime-grid" aria-label="Loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-shimmer" style={{ aspectRatio: "3 / 4" }} />
                <div className="p-3">
                  <div className="skeleton-shimmer rounded mb-2" style={{ height: 16, width: "80%" }} />
                  <div className="skeleton-shimmer rounded" style={{ height: 12, width: "50%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="anime-grid">
              {visible.map((anime, i) => (
                <div key={anime.id} className="h-100">
                  <Link
                    href={`/anime/${anime.id}`}
                    onClick={saveScroll}
                    className="text-decoration-none"
                    aria-label={anime.title.english || anime.title.romaji}
                  >
                    <div className="d-flex h-100 anime-list">
                      <img
                        src={anime.coverImage.large}
                        alt={anime.title.romaji}
                        loading={i < 6 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={i < 6 ? "high" : "low"}
                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                        width="460"
                        height="613"
                      />
                      <div className="flex-grow-1 p-2 d-flex flex-column">
                        <h6 className="mb-1 font-heading">
                          {anime.title.english || anime.title.romaji}
                        </h6>
                        <p className="mb-1 font-score d-flex align-items-center gap-1">
                          <Star size={13} style={{ color: "var(--rl-accent)" }} fill="currentColor" />
                          {anime.averageScore ?? "N/A"}
                          <span className="font-meta ms-1">
                            {anime.episodes ?? "?"} eps
                          </span>
                        </p>
                        <div className="mt-auto pt-1 d-flex flex-wrap gap-1">
                          {anime.format && (
                            <span className="badge font-badge badge-accent">
                              {anime.format}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="text-center mt-4">
                <p className="small mb-2" style={{ color: "var(--rl-muted)" }}>
                  Showing {visible.length} of {filtered.length}
                </p>
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="btn btn-hero"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div
            className="text-center p-5 mt-4 d-flex flex-column align-items-center"
            style={{
              background: "var(--rl-elev-1)",
              border: "1px solid var(--rl-border)",
              borderRadius: 12,
            }}
          >
            <SearchX size={28} style={{ color: "var(--rl-muted)" }} className="mb-2" />
            <p className="fw-semibold mb-1" style={{ color: "var(--rl-text)" }}>
              No anime match those filters
            </p>
            <p className="small mb-3" style={{ color: "var(--rl-muted)" }}>
              Try removing a genre or resetting the format.
            </p>
            <button
              onClick={resetAll}
              className="btn btn-sm btn-hero d-inline-flex align-items-center gap-2"
            >
              <RotateCcw size={14} />
              Reset filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
