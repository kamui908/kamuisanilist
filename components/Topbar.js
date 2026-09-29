"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Clapperboard, Moon, Search, Sun } from "lucide-react";

export function setThemeGlobal(next) {
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("rl-theme", next);
  } catch {}
  window.dispatchEvent(new CustomEvent("rl-theme", { detail: next }));
}

export default function Topbar() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  return (
    <header className="topbar">
      <div className="container d-flex justify-content-between align-items-center py-2">
        <Link
          href="/"
          className="text-decoration-none fw-bold title d-flex align-items-center gap-2"
          style={{ color: "var(--rl-text)" }}
        >
          <Clapperboard size={18} style={{ color: "var(--rl-accent)" }} />
          Kamui
        </Link>
        <div className="d-flex align-items-center gap-2">
          <Link
            href="/search"
            className="theme-toggle text-decoration-none d-inline-flex align-items-center gap-2"
            aria-label="Search all anime"
          >
            <Search size={15} />
            <span className="d-none d-sm-inline">Search</span>
          </Link>
          <button
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              setThemeGlobal(next);
            }}
            className="theme-toggle d-inline-flex align-items-center gap-2"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}
