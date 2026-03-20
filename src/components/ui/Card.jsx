export function Card({ children, style = {}, onClick, padding = "var(--space-6)" }) {
  const isClickable = !!onClick;
  return (
    <div onClick={onClick}
      style={{ background:"var(--color-bg)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding, boxShadow:"var(--shadow-sm)", cursor:isClickable?"pointer":"default", transition:isClickable?"box-shadow var(--transition-fast), transform var(--transition-fast)":"none", ...style }}
      onMouseEnter={e => { if(!isClickable) return; e.currentTarget.style.boxShadow="var(--shadow-hover)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { if(!isClickable) return; e.currentTarget.style.boxShadow="var(--shadow-sm)"; e.currentTarget.style.transform="none"; }}>
      {children}
    </div>
  );
}
