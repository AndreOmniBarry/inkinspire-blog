"use client";

/** Last-resort error page when the root layout itself fails. Inline styles only (no CSS guaranteed). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF6EF", color: "#1B1A17", fontFamily: "Georgia, serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontWeight: 400, fontSize: 36 }}>Inkinspire is having a moment.</h1>
          <p style={{ fontSize: 19, color: "#4A463F" }}>Please try again shortly.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#7A1F2B", color: "#FFFDF9", fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
