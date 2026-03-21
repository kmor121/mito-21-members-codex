import { useEffect } from "react";

export function Modal({ isOpen, onClose, title, children, footer, width = "480px" }) {
  useEffect(() => {
    const handler = e => { if(e.key === "Escape") onClose(); };
    if(isOpen) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if(!isOpen) return null;

  const isMobile = window.innerWidth <= 768;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: isMobile ? "var(--color-bg)" : "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: isMobile ? "stretch" : "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: isMobile ? 0 : "var(--space-4)",
    }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: "var(--color-bg)",
          borderRadius: isMobile ? 0 : "var(--radius-xl)",
          width: isMobile ? "100%" : width,
          maxWidth: isMobile ? "100%" : "100%",
          height: isMobile ? "100dvh" : "auto",
          maxHeight: isMobile ? "100dvh" : "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.15)",
        }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "12px 16px" : "var(--space-5) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? "17px" : "16px", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", color: "var(--color-text-tertiary)", cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>&times;</button>
        </div>
        {/* Body */}
        <div style={{
          padding: isMobile ? "16px" : "var(--space-6)",
          paddingBottom: isMobile && !footer ? "max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))" : undefined,
          overflowY: "auto", flex: 1,
          WebkitOverflowScrolling: "touch",
        }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: isMobile ? "12px 16px" : "var(--space-4) var(--space-6)",
            borderTop: "1px solid var(--color-border)",
            display: "flex", justifyContent: "flex-end", gap: "var(--space-2)",
            flexShrink: 0,
            paddingBottom: isMobile ? "max(12px, env(safe-area-inset-bottom))" : "var(--space-4)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
