import { useIsMobile } from '../../hooks/useIsMobile';

export function PageHeader({ title, subtitle, actions }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems: isMobile ? "center" : "flex-start", minHeight: isMobile ? 36 : undefined, marginBottom: isMobile ? 0 : "var(--space-6)" }}>
      <div>
        <h1 style={{ margin:0, fontSize: isMobile ? "18px" : "20px", fontWeight:"var(--font-weight-bold)", color:"var(--color-text-primary)", letterSpacing:"-0.02em", lineHeight:1.2 }}>{title}</h1>
        {!isMobile && subtitle && <p style={{ margin:"4px 0 0", fontSize:"12px", color:"var(--color-text-tertiary)" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display:"flex", gap:"var(--space-2)", alignItems:"center" }}>{actions}</div>}
    </div>
  );
}
