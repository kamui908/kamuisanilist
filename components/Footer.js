import Link from "next/link";
import { Clapperboard, ExternalLink, Search } from "lucide-react";
import { TypingText } from "./animate-ui/text/typing";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--rl-elev-1)",
        borderTop: "1px solid var(--rl-border)",
        color: "var(--rl-text)",
      }}
    >
      <div className="container py-4 d-flex flex-column flex-md-row justify-content-between gap-3">
        <div style={{ maxWidth: 480 }}>
          <p className="fw-bold title mb-1 d-flex align-items-center gap-2">
            <Clapperboard size={16} style={{ color: "var(--rl-accent)" }} />
            <TypingText text="Kamui" cursor={true} loop={true} />
          </p>
          <p className="small mb-0" style={{ color: "var(--rl-muted)" }}>
            A personal anime shelf powered by AniList — browse the collection
            by genre and format, or look up any anime.
          </p>
        </div>
        <div className="d-flex align-items-start gap-2">
          <Link
            href="/search"
            className="theme-toggle text-decoration-none d-inline-flex align-items-center gap-2"
          >
            <Search size={14} /> Search anime
          </Link>
          <a
            href="https://anilist.co/user/RyouGura"
            target="_blank"
            rel="noreferrer"
            className="theme-toggle text-decoration-none d-inline-flex align-items-center gap-2"
          >
            <ExternalLink size={14} /> AniList profile
          </a>
        </div>
      </div>
    </footer>
  );
}
