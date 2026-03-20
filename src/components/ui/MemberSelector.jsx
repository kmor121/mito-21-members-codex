import { useState, useRef, useEffect, useMemo } from 'react';
import { fullName, fullNameKana, nameInitial } from '../../utils/formatName';

/**
 * Member selector dropdown.
 * Props:
 *   value       – member_id (string)
 *   onChange     – callback(member_id)
 *   members     – array of Member objects (must include id, last_name, first_name, profile_image_url, etc.)
 *   disabled    – boolean
 *   placeholder – string
 */
export default function MemberSelector({ value, onChange, members = [], disabled, placeholder = "会員を検索...", roleMap }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedMember = useMemo(() => {
    if (!value) return null;
    return members.find((m) => (m.id || m._id) === value) || null;
  }, [value, members]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => {
      const mid = m.id || m._id;
      const name = fullName(m).toLowerCase();
      const kana = fullNameKana(m).toLowerCase();
      const role = roleMap ? (roleMap[mid] || "").toLowerCase() : (m.company_position || "").toLowerCase();
      return name.includes(q) || kana.includes(q) || role.includes(q);
    });
  }, [members, search, roleMap]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Position dropdown above if near bottom
  useEffect(() => {
    if (!open || !dropdownRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ddH = dropdownRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < ddH + 8 && rect.top > ddH + 8) {
      dropdownRef.current.style.top = 'auto';
      dropdownRef.current.style.bottom = '100%';
      dropdownRef.current.style.marginBottom = '4px';
      dropdownRef.current.style.marginTop = '0';
    } else {
      dropdownRef.current.style.top = '100%';
      dropdownRef.current.style.bottom = 'auto';
      dropdownRef.current.style.marginTop = '4px';
      dropdownRef.current.style.marginBottom = '0';
    }
  }, [open, filtered.length]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function handleSelect(memberId) {
    onChange(memberId);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange("");
    setSearch("");
  }

  if (disabled && selectedMember) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "#f9fafb", borderRadius: 6, border: "1px solid var(--color-border, var(--color-border))", fontSize: 13, color: "var(--color-text-primary, #1f2937)" }}>
        <MemberAvatar member={selectedMember} size={22} />
        <span style={{ fontWeight: 500 }}>{fullName(selectedMember)}</span>
      </div>
    );
  }
  if (disabled) {
    return (
      <div style={{ padding: "5px 10px", background: "#f9fafb", borderRadius: 6, border: "1px solid var(--color-border, var(--color-border))", fontSize: 13, color: "var(--color-text-secondary, var(--color-text-secondary))" }}>
        {placeholder}
      </div>
    );
  }

  return (
    <div className="dp-container" ref={containerRef} style={{ flex: 1 }}>
      {/* Trigger */}
      <button
        type="button"
        className={`dp-trigger${open ? ' dp-trigger--open' : ''}${!selectedMember ? ' dp-trigger--placeholder' : ''}`}
        onClick={() => setOpen(!open)}
        style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}
      >
        {selectedMember ? (
          <>
            <MemberAvatar member={selectedMember} size={22} />
            <span className="dp-trigger-text" style={{ flex: 1, textAlign: "left" }}>{fullName(selectedMember)}</span>
            <button type="button" onClick={handleClear}
              style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", color: "var(--color-text-secondary, var(--color-text-secondary))", display: "flex", alignItems: "center" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="dp-trigger-text" style={{ flex: 1, textAlign: "left" }}>{placeholder}</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div ref={dropdownRef} className="dp-dropdown" style={{ width: "100%", minWidth: 240, maxHeight: 320, display: "flex", flexDirection: "column", padding: 0 }}>
          {/* Search input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border, var(--color-border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", borderRadius: 6, padding: "4px 8px", border: "1px solid var(--color-border, var(--color-border))" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="会員を検索..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, flex: 1, padding: "2px 0" }}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", padding: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Member list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary, var(--color-text-secondary))", margin: 0 }}>
                {search ? "該当する会員が見つかりません" : "会員データがありません"}
              </p>
            ) : (
              filtered.map((m) => {
                const mid = m.id || m._id;
                const isSelected = mid === value;
                return (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => handleSelect(mid)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px",
                      border: "none", borderBottom: "1px solid var(--line-light, var(--color-bg-sub))",
                      background: isSelected ? "#eff6ff" : "transparent",
                      cursor: "pointer", textAlign: "left", fontSize: 13, transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <MemberAvatar member={m} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fullName(m)}
                      </div>
                      {(() => {
                        const role = roleMap ? roleMap[mid] : m.company_position;
                        return role ? (
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary, var(--color-text-secondary))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {role}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberAvatar({ member, size = 28 }) {
  const imgUrl = member?.profile_image_url;
  const initial = nameInitial(member);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "var(--color-bg-sub)", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, fontWeight: 600, color: "var(--color-text-secondary)",
    }}>
      {initial}
    </div>
  );
}
