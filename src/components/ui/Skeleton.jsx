export function SkeletonText({ width, height = 14 }) {
  const w = width || `${60 + Math.random() * 40}%`;
  return <div className="skeleton skeleton-text" style={{ width: w, height }} />;
}

export function SkeletonAvatar({ size = 40 }) {
  return <div className="skeleton skeleton-avatar" style={{ width: size, height: size }} />;
}

export function SkeletonCard({ height = 120 }) {
  return <div className="skeleton skeleton-card" style={{ height }} />;
}

export function MemberCardSkeleton() {
  return (
    <div className="directory-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SkeletonAvatar size={44} />
        <div style={{ flex: 1, display: "grid", gap: 8 }}>
          <SkeletonText width="60%" height={16} />
          <SkeletonText width="40%" height={12} />
          <SkeletonText width="70%" height={12} />
        </div>
      </div>
    </div>
  );
}

export function MemberListSkeleton({ count = 5, mobile = false }) {
  if (mobile) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="directory-grid">
      {Array.from({ length: count }, (_, i) => (
        <MemberCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MemberDetailSkeleton() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <SkeletonAvatar size={80} />
          <SkeletonText width="40%" height={20} />
          <SkeletonText width="30%" height={14} />
        </div>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <SkeletonText width="25%" height={16} />
          <SkeletonText width="90%" />
          <SkeletonText width="75%" />
          <SkeletonText width="80%" />
        </div>
      </div>
    </div>
  );
}

export function MyPageSkeleton() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <SkeletonText width="50%" height={24} />
        <SkeletonText width="20%" height={14} />
      </div>
      <div className="settings-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} height={140} />
        ))}
      </div>
    </div>
  );
}
