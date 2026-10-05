"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Tv,
  Clock,
  CalendarDays,
  Layers,
  Signal,
  BookOpen,
  Heart,
  Users,
  Flame,
  Trophy,
  Building2,
  Play,
  ExternalLink,
  Link2,
  GitBranch,
  Timer,
  ChevronDown,
  ChevronUp,
  Tag,
  AlignLeft,
} from "lucide-react";

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <span
        className="d-inline-flex align-items-center justify-content-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--rl-accent-soft)",
          color: "var(--rl-accent)",
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </span>
      <span>
        <span className="d-block small" style={{ color: "var(--rl-muted)" }}>{label}</span>
        <span className="d-block fw-semibold small">{value}</span>
      </span>
    </div>
  );
}

function fmtDate(d) {
  if (!d || !d.year) return "—";
  const m = d.month ? String(d.month).padStart(2, "0") : null;
  const day = d.day ? String(d.day).padStart(2, "0") : null;
  return [d.year, m, day].filter(Boolean).join("-");
}

function countdown(secs) {
  if (secs == null) return "";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  if (d > 0) return `in ${d}d ${h}h`;
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export default function AnimeDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  function goBack() {
    let target = null;
    try {
      target = sessionStorage.getItem("kamui-back-target");
    } catch {}
    const here = `/anime/${id}`;
    try {
      // Never pop back onto a stale scroll position of this same page:
      // push list/parent fresh (list restores its own scroll), and only
      // use history for search so its query state is preserved.
      if (target && target !== here) {
        if (target === "/" || target.startsWith("/anime/")) {
          router.push(target);
          return;
        }
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(target);
        return;
      }
      if (window.history.length > 1) router.back();
      else router.push("/");
    } catch {
      router.push("/");
    }
  }

  function markParent() {
    try {
      sessionStorage.setItem("kamui-back-target", `/anime/${id}`);
    } catch {}
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchDetail() {
      // MAL when signed in, public AniList otherwise.
      let useMal = false;
      try {
        const me = await fetch("/api/auth/mal/me").then((r) => r.json());
        useMal = !!me.signedIn;
      } catch {
        useMal = false;
      }
      if (cancelled) return;
      if (useMal) {
        try {
          setLoading(true);
          const res = await fetch(`/api/mal/anime/${encodeURIComponent(id)}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Anime not found");
          if (data.reauth) throw new Error("MAL session expired. Please sign in again.");
          if (cancelled) return;
          setAnime(data);
        } catch (e) {
          if (!cancelled) setError(e.message || "Failed to load anime");
          if (!cancelled) setLoading(false);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
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
            hashtag
            siteUrl
            startDate { year month day }
            endDate { year month day }
            trailer { id site thumbnail }
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt timeUntilAiring episode }
            rankings { rank type allTime }
            externalLinks { url site }
            relations {
              edges {
                relationType
                node {
                  id
                  title { romaji english }
                  coverImage { large }
                  format
                  status
                  averageScore
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
    return () => {
      cancelled = true;
    };
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
        <button onClick={goBack} className="btn btn-sm theme-toggle mb-4 d-inline-flex align-items-center gap-2">
          <ArrowLeft size={14} /> Back to list
        </button>
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
  const relations = (anime.relations?.edges ?? []).filter(
    (e) =>
      e.node &&
      e.relationType !== "ADAPTATION" &&
      !["MANGA", "NOVEL", "ONE_SHOT"].includes(e.node.format)
  );
  const grouped = relations.reduce((acc, e) => {
    const k = e.relationType?.replace(/_/g, " ") ?? "RELATED";
    (acc[k] = acc[k] || []).push(e.node);
    return acc;
  }, {});
  const airing = anime.nextAiringEpisode;
  const links = (anime.externalLinks ?? []).slice(0, 8);

  return (
    <div style={{ background: "var(--rl-bg)", color: "var(--rl-text)", minHeight: "100vh" }}>
      {/* Backdrop hero — banner fades into page */}
      <div className="position-relative" style={{ minHeight: "44svh", display: "flex", flexDirection: "column" }}>
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt=""
            loading="eager"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "var(--rl-elev-1)" }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, var(--rl-bg) 94%), linear-gradient(to top, var(--rl-bg) 0%, transparent 40%)",
          }}
        />
        <div className="container position-relative" style={{ paddingTop: 16, zIndex: 3 }}>
          <button onClick={goBack} className="btn btn-sm theme-toggle d-inline-flex align-items-center gap-2">
            <ArrowLeft size={14} /> Back to list
          </button>
        </div>
      </div>

      {/* Details begin along the fade — title starts near the poster top */}
      <div className="container" style={{ marginTop: "-7rem", position: "relative", zIndex: 2 }}>
        <div className="row g-3 g-md-4 align-items-start">
          <div className="col-5 col-md-3 col-lg-2">
            <img
              src={anime.coverImage.extraLarge || anime.coverImage.large}
              alt={title}
              loading="eager"
              decoding="async"
              width="460"
              height="613"
              style={{
                width: "100%",
                aspectRatio: "3 / 4",
                objectFit: "cover",
                borderRadius: 14,
                border: "1px solid var(--rl-border)",
                boxShadow: "var(--rl-shadow)",
              }}
            />
          </div>
          <div className="col-7 col-md-9 col-lg-10" style={{ paddingTop: "0.5rem" }}>
            <p className="font-eyebrow mb-1 d-flex align-items-center gap-2" style={{ color: "var(--rl-accent)" }}>
              <Tv size={13} />
              {anime.format?.replace(/_/g, " ") ?? "Anime"}
              {anime.seasonYear ? ` · ${anime.seasonYear}` : ""}
            </p>
            <h1 className="fw-bold title mb-1" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>
              {title}
            </h1>
            {anime.title.romaji && anime.title.english && (
              <p className="mb-2 font-alt" style={{ color: "var(--rl-muted)" }}>{anime.title.romaji}</p>
            )}
            <div className="d-flex flex-wrap gap-1 mb-3">
              {(anime.genres ?? []).map((g) => (
                <span key={g} className="badge font-badge badge-accent">{g}</span>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <a href={anime.siteUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-hero text-decoration-none d-inline-flex align-items-center gap-2">
                <ExternalLink size={14} /> {anime._source === "mal" ? "MAL" : "AniList"}
              </a>
              {anime.trailer?.site === "youtube" && (
                <a
                  href={`https://www.youtube.com/watch?v=${anime.trailer.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm theme-toggle text-decoration-none d-inline-flex align-items-center gap-2"
                >
                  <Play size={14} /> Trailer
                </a>
              )}
            </div>
          </div>
        </div>

        {airing && (
          <div
            className="mt-3 p-3 d-flex align-items-center gap-3"
            style={{ background: "var(--rl-accent-soft)", border: "1px solid var(--rl-border)", borderRadius: 12 }}
          >
            <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 36, borderRadius: 10, background: "var(--rl-accent)", color: "#fff", flexShrink: 0 }}>
              <Timer size={18} />
            </span>
            <div>
              <div className="fw-semibold small">Episode {airing.episode} airs {countdown(airing.timeUntilAiring)}</div>
              <div className="small" style={{ color: "var(--rl-muted)" }}>
                {new Date(airing.airingAt * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div
          className="mt-3 p-3 p-md-4"
          style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}
        >
          <h5 className="fw-bold title mb-2 d-flex align-items-center gap-2">
            <AlignLeft size={16} style={{ color: "var(--rl-accent)" }} /> Synopsis
          </h5>
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
            <button onClick={() => setExpanded((v) => !v)} className="btn btn-sm theme-toggle d-inline-flex align-items-center gap-1">
              {expanded ? <>Show less <ChevronUp size={14} /></> : <>Read more <ChevronDown size={14} /></>}
            </button>
          )}
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <div className="p-3 p-md-4 h-100" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
              <h5 className="fw-bold title mb-3 d-flex align-items-center gap-2">
                <Layers size={16} style={{ color: "var(--rl-accent)" }} /> Details
              </h5>
              <div className="d-flex flex-column gap-2">
                <Stat icon={Star} label="Average score" value={anime.averageScore ? `${anime.averageScore} / 100` : "N/A"} />
                <Stat icon={Tv} label="Episodes" value={anime.episodes ?? "?"} />
                <Stat icon={Clock} label="Duration" value={anime.duration ? `${anime.duration} min / ep` : "—"} />
                <Stat icon={CalendarDays} label="Season" value={anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : "—"} />
                <Stat icon={Signal} label="Status" value={anime.status?.replace(/_/g, " ") ?? "—"} />
                <Stat icon={BookOpen} label="Source" value={anime.source?.replace(/_/g, " ") ?? "—"} />
                <Stat icon={Building2} label="Studios" value={studios.length ? studios.join(", ") : "—"} />
                <Stat icon={Flame} label="Popularity" value={anime.popularity?.toLocaleString() ?? "—"} />
                <Stat icon={Users} label="Aired" value={`${fmtDate(anime.startDate)} → ${fmtDate(anime.endDate)}`} />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-3 p-md-4 h-100" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
              <h5 className="fw-bold title mb-3 d-flex align-items-center gap-2">
                <Tag size={16} style={{ color: "var(--rl-accent)" }} /> Tags
              </h5>
              <div className="d-flex flex-wrap gap-1">
                {topTags.length === 0 && (
                  <span className="small" style={{ color: "var(--rl-muted)" }}>No tags.</span>
                )}
                {topTags.map((t) => (
                  <span key={t.name} title={t.description ?? ""} className="badge font-badge badge-muted-dark">
                    {t.name}
                  </span>
                ))}
              </div>
              {links.length > 0 && (
                <>
                  <h5 className="fw-bold title mt-4 mb-2 d-flex align-items-center gap-2">
                    <Link2 size={16} style={{ color: "var(--rl-accent)" }} /> Watch / Info
                  </h5>
                  <div className="d-flex flex-wrap gap-1">
                    {links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="badge font-badge badge-muted-dark text-decoration-none">
                        {l.site}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {Object.keys(grouped).length > 0 && (
          <div className="mt-3 p-3 p-md-4" style={{ background: "var(--rl-elev-1)", border: "1px solid var(--rl-border)", borderRadius: 12 }}>
            <h5 className="fw-bold title mb-3 d-flex align-items-center gap-2">
              <GitBranch size={16} style={{ color: "var(--rl-accent)" }} /> Related — prequels, sequels & more
            </h5>
            {Object.entries(grouped).map(([rel, nodes]) => (
              <div key={rel} className="mb-3">
                <p className="font-eyebrow mb-2" style={{ color: "var(--rl-muted)" }}>{rel}</p>
                <div className="d-flex gap-2 overflow-auto pb-1">
                  {nodes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/anime/${n.id}`}
                      onClick={markParent}
                      className="text-decoration-none flex-shrink-0"
                      style={{ width: 120 }}
                    >
                      <img
                        src={n.coverImage?.large}
                        alt={n.title.english || n.title.romaji}
                        loading="lazy"
                        decoding="async"
                        width="240"
                        height="320"
                        style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, border: "1px solid var(--rl-border)" }}
                      />
                      <div className="font-heading mt-1" style={{ fontSize: "0.72rem", minHeight: "2em" }}>
                        {n.title.english || n.title.romaji}
                      </div>
                      <div className="font-meta" style={{ fontSize: "0.68rem" }}>
                        {n.averageScore ? `★ ${n.averageScore}` : n.format?.replace(/_/g, " ") ?? ""}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 72 }} />
    </div>
  );
}
