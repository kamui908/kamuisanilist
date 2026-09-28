import "@/styles/bootstrap.min.css"; // local bootstrap
import "@/styles/globals.css";

export const metadata = {
  title: "Ryou's AniList",
  description: "Static AniList Viewer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Design-it: 2 families max — Sora for display, Inter for body */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("rl-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`,
          }}
        />
      </head>
      <body style={{ background: "var(--rl-bg)" }}>{children}</body>
    </html>
  );
}
