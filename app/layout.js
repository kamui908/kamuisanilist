import "@/styles/bootstrap.min.css"; // local bootstrap
import "@/styles/globals.css";
import Topbar from "@/components/Topbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Kamui's AniList",
  description: "Kamui's AniList Viewer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font mix: Sora = display, Space Grotesk = eyebrows/labels, Inter = body */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("rl-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t);if(t==="dark")document.documentElement.classList.add("dark")}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`,
          }}
        />
      </head>
      <body style={{ background: "var(--rl-bg)" }}>
        <Topbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
