"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AnimeDetail() {
  const params = useParams();
  const id = params?.id;
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchDetail() {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            coverImage { large extraLarge }
            bannerImage
            description(asHtml: false)
            genres
            tags { name rank description }
            averageScore
            meanScore
            popularity
            favourites
            episodes
            duration
            season
            seasonYear
            format
            status
            source
            siteUrl
            trailer { id site thumbnail }
            studios(isMain: true) { nodes { name } }
          }
        }
      `;
      try {
        setLoading(true);
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { id: Number(id) } }),
        });
        if (!res.ok) throw new Error(`AniList responded ${res.status}`);
        const data = await res.json();
        if (!data.data?.Media) throw new Error("Anime not found");
        setAnime(data.data.Media);
      } catch (e) {
        setError(e.message || "Failed to load anime");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-5" style={{ color: "var(--rl-text)" }}>
        <div className="skeleton-card mb-4">
          <div className="skeleton-shimmer" style={{ aspectRatio: "21 / 9" }} />
        </div>
        <div className="skeleton-shimmer rounded mb-2" style={{ height: 28, width: "60%" }} />
        <div className="skeleton-shimmer rounded" style={{ height: 14, width: "40%" }} />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="container py-5" style={{ color: "var(--rl-text)" }}>
        <Link href="/" className="btn btn-sm theme-toggle text-decoration-none mb-4 d-inline-block">
          ← Back to list
        </Link>
        <div className="p-4" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
          <p className="fw-semibold mb-1">Couldn&apos;t load this anime.</p>
          <p className="small mb-0" style={{ color: "var(--rl-muted)" }}>{error}</p>
        </div>
      </div>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const studios = anime.studios?.nodes?.map((s) => s.name).filter(Boolean) ?? [];
  const topTags = [...(anime.tags ?? [])].sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)).slice(0, 12);
  const desc = (anime.description ?? "No description available.").replace(/<br\s*\/?>/gi, "\n");
  const stats = [
    ["Score", anime.averageScore ? `★ ${anime.averageScore}` : "N/A"],
    ["Episodes", anime.episodes ?? "?"],
    ["Duration", anime.duration ? `${anime.duration} min` : "—"],
    ["Season", anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : "—"],
    ["Format", anime.format?.replace(/_/g, " ") ?? "—"],
    ["Status", anime.status?.replace(/_/g, " ") ?? "—"],
    ["Source", anime.source?.replace(/_/g, " ") ?? "—"],
    ["Popularity", anime.popularity?.toLocaleString() ?? "—"],
  ];

  return (
    <div style={{ background: "var(--rl-bg)", color: "var(--rl-text)", minHeight: "100vh" }}>
      {anime.bannerImage && (
        <div style={{ overflow: "hidden" }}>
          <img
            src={anime.bannerImage}
            alt=""
            loading="eager"
            decoding="async"
            style={{ width: "100%", aspectRatio: "21 / 9", objectFit: "cover", display: "block" }}
          />
        </div>
      )}
      <div className="container py-4">
        <Link href="/" className="btn btn-sm theme-toggle text-decoration-none mb-3 d-inline-block">
          ← Back to list
        </Link>
        <div className="row g-4">
          <div className="col-5 col-md-3 col-lg-2">
            <img
              src={anime.coverImage.extraLarge || anime.coverImage.large}
              alt={title}
              loading="eager"
              decoding="async"
              width="460"
              height="613"
              style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 12, border: "1px solid var(--rl-border)" }}
            />
          </div>
          <div className="col-7 col-md-9 col-lg-10">
            <h1 className="fw-bold title mb-1" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
              {title}
            </h1>
            {anime.title.romaji && anime.title.english && (
              <p className="mb-2" style={{ color: "var(--rl-muted)" }}>{anime.title.romaji}</p>
            )}
            <div className="d-flex flex-wrap gap-1 mb-3">
              {(anime.genres ?? []).map((g) => (
                <span key={g} className="badge font-badge badge-accent">{g}</span>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-3 mb-3">
              {stats.slice(0, 4).map(([k, v]) => (
                <div key={k}>
                  <div className="small" style={{ color: "var(--rl-muted)" }}>{k}</div>
                  <div className="fw-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <a href={anime.siteUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-hero text-decoration-none">
                View on AniList
              </a>
              {anime.trailer?.site === "youtube" && (
                <a
                  href={`https://www.youtube.com/watch?v=${anime.trailer.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm theme-toggle text-decoration-none"
                >
                  ▶ Trailer
                </a>
              )}
            </div>
          </div>
        </div>

        <div
          className="mt-4 p-3 p-md-4"
          style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}
        >
          <h5 className="fw-bold title mb-2">Synopsis</h5>
          <p
            className="mb-2"
            style={{
              color: "var(--rl-muted)",
              whiteSpace: "pre-line",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? "none" : 6,
              WebkitBoxOrient: "vertical",
              overflow: expanded ? "visible" : "hidden",
            }}
          >
            {desc}
          </p>
          {desc.length > 400 && (
            <button onClick={() => setExpanded((v) => !v)} className="btn btn-sm theme-toggle">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <div className="p-3 p-md-4 h-100" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
              <h5 className="fw-bold title mb-3">Details</h5>
              <dl className="row mb-0 small">
                {stats.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="col-5" style={{ color: "var(--rl-muted)" }}>{k}</dt>
                    <dd className="col-7 fw-medium">{v}</dd>
                  </React.Fragment>
                ))}
                {studios.length > 0 && (
                  <>
                    <dt className="col-5" style={{ color: "var(--rl-muted)" }}>Studios</dt>
                    <dd className="col-7 fw-medium">{studios.join(", ")}</dd>
                  </>
                )}
                {anime.meanScore && (
                  <>
                    <dt className="col-5" style={{ color: "var(--rl-muted)" }}>Mean score</dt>
                    <dd className="col-7 fw-medium">{anime.meanScore}</dd>
                  </>
                )}
                {anime.favourites != null && (
                  <>
                    <dt className="col-5" style={{ color: "var(--rl-muted)" }}>Favourites</dt>
                    <dd className="col-7 fw-medium">{anime.favourites.toLocaleString()}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-3 p-md-4 h-100" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
              <h5 className="fw-bold title mb-3">Tags</h5>
              <div className="d-flex flex-wrap gap-1">
                {topTags.length === 0 && (
                  <span className="small" style={{ color: "var(--rl-muted)" }}>No tags.</span>
                )}
                {topTags.map((t) => (
                  <span
                    key={t.name}
                    title={t.description ?? ""}
                    className="badge font-badge badge-muted-dark"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
