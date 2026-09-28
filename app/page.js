"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Star,
  Clapperboard,
  ChevronDown,
  Sparkles,
  ListFilter,
  SearchX,
  RotateCcw,
  ArrowDownWideNarrow,
} from "lucide-react";
import { AuroraText } from "@/components/magicui/aurora-text";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

export default function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("rl-theme", next);
    } catch {}
  }

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
        setLoading(true);
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { username: "RyouGura" } }),
        });
        if (!res.ok) throw new Error(`AniList responded ${res.status}`);
        const data = await res.json();
        const entries =
          data.data?.MediaListCollection?.lists?.flatMap((l) => l.entries) ?? [];
        setAnimeList(entries.map((e) => e.media).filter(Boolean));
      } catch (e) {
        setError(e.message || "Failed to load list");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
      {/* Sticky topbar with theme switch */}
      <header className="topbar">
        <div className="container d-flex justify-content-between align-items-center py-2">
          <Link href="/" className="text-decoration-none fw-bold title d-flex align-items-center gap-2" style={{ color: "var(--rl-text)" }}>
            <Clapperboard size={18} style={{ color: "var(--rl-accent)" }} />
            Kamui
          </Link>
          <button
            onClick={toggleTheme}
            className="theme-toggle d-flex align-items-center gap-2"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>
      {/* Intro — full first screen */}
      <section
        className="d-flex flex-column justify-content-center align-items-center text-center position-relative overflow-hidden"
        style={{ minHeight: "calc(100svh - 53px)", background: "var(--rl-bg)" }}
      >
        <DotPattern
          glow={false}
          width={28}
          height={28}
          className={cn(
            theme === "dark"
              ? "text-white/[0.08] [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
              : "text-black/[0.07] [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          )}
        />
        <div className="position-relative px-3 d-flex flex-column align-items-center" style={{ maxWidth: 760 }}>
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
          <a href="#list" className="btn btn-lg btn-hero d-inline-flex align-items-center gap-2">
            <ArrowDownWideNarrow size={18} />
            Browse the list
          </a>
          {!loading && animeList.length > 0 && (
            <p className="mt-3 mb-0 small font-alt" style={{ color: "var(--rl-muted)" }}>
              {animeList.length} titles · {allFilters.length} genres & tags
            </p>
          )}
          <a href="#list" className="scroll-cue mt-5 small text-decoration-none" aria-label="Scroll to list">
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
