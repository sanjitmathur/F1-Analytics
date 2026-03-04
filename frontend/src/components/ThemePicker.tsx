import { useState, useEffect, useRef } from "react";

const THEMES: Record<string, { label: string; primary: string; glow: string; subtle: string }> = {
  default: { label: "F1 Red", primary: "#e10600", glow: "rgba(225,6,0,0.4)", subtle: "rgba(225,6,0,0.12)" },
  redbull: { label: "Red Bull", primary: "#3671C6", glow: "rgba(54,113,198,0.4)", subtle: "rgba(54,113,198,0.12)" },
  ferrari: { label: "Ferrari", primary: "#E8002D", glow: "rgba(232,0,45,0.4)", subtle: "rgba(232,0,45,0.12)" },
  mercedes: { label: "Mercedes", primary: "#27F4D2", glow: "rgba(39,244,210,0.4)", subtle: "rgba(39,244,210,0.12)" },
  mclaren: { label: "McLaren", primary: "#FF8000", glow: "rgba(255,128,0,0.4)", subtle: "rgba(255,128,0,0.12)" },
  aston: { label: "Aston Martin", primary: "#229971", glow: "rgba(34,153,113,0.4)", subtle: "rgba(34,153,113,0.12)" },
  alpine: { label: "Alpine", primary: "#FF87BC", glow: "rgba(255,135,188,0.4)", subtle: "rgba(255,135,188,0.12)" },
  williams: { label: "Williams", primary: "#64C4FF", glow: "rgba(100,196,255,0.4)", subtle: "rgba(100,196,255,0.12)" },
};

function applyTheme(key: string) {
  const theme = THEMES[key] || THEMES.default;
  const root = document.documentElement;
  root.style.setProperty("--f1-red", theme.primary);
  root.style.setProperty("--f1-red-glow", theme.glow);
  root.style.setProperty("--f1-red-subtle", theme.subtle);
  root.style.setProperty("--border-glow", theme.glow.replace("0.4", "0.15"));
  localStorage.setItem("f1-theme", key);
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("default");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("f1-theme");
    if (saved && THEMES[saved]) {
      setCurrent(saved);
      applyTheme(saved);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (key: string) => {
    setCurrent(key);
    applyTheme(key);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        title="Change team theme"
      >
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          background: THEMES[current].primary,
          boxShadow: `0 0 8px ${THEMES[current].glow}`,
        }} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4L5 7L8 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "rgba(10,10,15,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 8,
          minWidth: 180,
          zIndex: 200,
          backdropFilter: "blur(20px)",
          animation: "fadeInUp 0.2s ease",
        }}>
          {Object.entries(THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => select(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 12px",
                border: "none",
                borderRadius: 8,
                background: current === key ? "rgba(255,255,255,0.08)" : "transparent",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { if (current !== key) (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (current !== key) (e.target as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: theme.primary,
                boxShadow: current === key ? `0 0 10px ${theme.glow}` : "none",
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: current === key ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                letterSpacing: 1,
              }}>
                {theme.label}
              </span>
              {current === key && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M2 6L5 9L10 3" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
