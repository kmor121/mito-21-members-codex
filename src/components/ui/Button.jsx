const variants = {
  primary:   { background: "var(--color-accent)",  color: "#fff",                          border: "none" },
  secondary: { background: "var(--color-bg)",       color: "var(--color-text-primary)",     border: "1px solid var(--color-border)" },
  danger:    { background: "var(--color-bg)",       color: "var(--color-danger)",           border: "1px solid var(--color-danger)" },
  ghost:     { background: "transparent",           color: "var(--color-text-secondary)",   border: "none" },
};

const sizes = {
  sm: { padding: "4px 10px",  fontSize: "12px" },
  md: { padding: "7px 16px",  fontSize: "13px" },
  lg: { padding: "9px 20px",  fontSize: "14px" },
};

export function Button({ children, variant = "primary", size = "md", onClick, disabled = false, type = "button", style = {} }) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...v, ...s, borderRadius: "var(--radius-md)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-family)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all var(--transition-fast)", display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", ...style }}
      onMouseEnter={e => { if(disabled) return; if(variant==="primary") e.currentTarget.style.background="var(--color-accent-dark)"; if(variant==="secondary") e.currentTarget.style.background="var(--color-bg-sub)"; }}
      onMouseLeave={e => { if(disabled) return; e.currentTarget.style.background=v.background; }}>
      {children}
    </button>
  );
}
