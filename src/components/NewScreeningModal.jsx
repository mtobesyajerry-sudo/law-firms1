// NewScreeningModal.jsx
// Modal form for running a screening. Calls screeningService.runScreening
// and displays matches inline. Styled to match the existing gold/navy theme.

import { useState } from "react";
import { runScreening } from "../../services/screeningService";

const COLORS = {
  gold: "#d4af37",
  goldSoft: "#f4e8b8",
  navy: "#0a1929",
  navyLight: "#1a2a3a",
  bg: "#fafaf7",
  white: "#ffffff",
  red: "#c0392b",
  amber: "#e67e22",
  green: "#27ae60",
  border: "#e2e2dc",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
};

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(10, 25, 41, 0.55)",
    backdropFilter: "blur(2px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: COLORS.white,
    border: `2px solid ${COLORS.gold}`,
    borderRadius: 8,
    width: "100%", maxWidth: 720,
    maxHeight: "90vh", overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  header: {
    background: COLORS.navy,
    color: COLORS.gold,
    padding: "20px 24px",
    borderBottom: `2px solid ${COLORS.gold}`,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: 700, letterSpacing: 0.5, margin: 0 },
  closeBtn: {
    background: "transparent", border: "none", color: COLORS.gold,
    fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1,
  },
  body: { padding: 24 },
  field: { marginBottom: 16 },
  label: {
    display: "block", fontSize: 12, fontWeight: 600, color: COLORS.navy,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6,
  },
  input: {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${COLORS.border}`, borderRadius: 4,
    fontSize: 14, fontFamily: "inherit", background: COLORS.white,
    boxSizing: "border-box",
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  toggleRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: 12, background: COLORS.goldSoft,
    borderRadius: 4, marginBottom: 16,
  },
  toggle: {
    width: 18, height: 18, cursor: "pointer", accentColor: COLORS.gold,
  },
  toggleLabel: { fontSize: 13, color: COLORS.navy, flex: 1 },
  premiumBadge: {
    background: COLORS.navy, color: COLORS.gold,
    padding: "2px 8px", borderRadius: 12,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
  },
  actions: {
    display: "flex", justifyContent: "flex-end", gap: 12,
    padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`,
    background: COLORS.bg,
  },
  btnPrimary: {
    background: COLORS.navy, color: COLORS.gold,
    border: `1px solid ${COLORS.gold}`,
    padding: "10px 20px", borderRadius: 4,
    fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
    cursor: "pointer", textTransform: "uppercase",
  },
  btnSecondary: {
    background: "transparent", color: COLORS.navy,
    border: `1px solid ${COLORS.border}`,
    padding: "10px 20px", borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  results: { padding: 24, borderTop: `1px solid ${COLORS.border}` },
  resultHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16,
  },
  riskBadge: (level) => ({
    padding: "4px 12px", borderRadius: 12,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    textTransform: "uppercase",
    background: level === "critical" ? COLORS.red
      : level === "high" ? "#e74c3c"
      : level === "medium" ? COLORS.amber
      : COLORS.green,
    color: COLORS.white,
  }),
  matchCard: {
    border: `1px solid ${COLORS.border}`,
    borderLeft: `4px solid ${COLORS.gold}`,
    borderRadius: 4, padding: 14, marginBottom: 10,
    background: COLORS.white,
  },
  matchHead: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 8,
  },
  matchName: { fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 2 },
  matchMeta: { fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  scorePill: {
    background: COLORS.navy, color: COLORS.gold,
    padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
  },
  error: {
    background: "#fdecec", color: COLORS.red,
    padding: 12, borderRadius: 4, marginBottom: 16,
    fontSize: 13, border: `1px solid ${COLORS.red}`,
  },
  empty: {
    padding: 24, textAlign: "center", color: COLORS.green,
    background: "#eafaf1", borderRadius: 4,
    border: `1px solid ${COLORS.green}`,
  },
};

export default function NewScreeningModal({ onClose, onSaved, clientId, prefill }) {
  const [form, setForm] = useState({
    fullName: prefill?.fullName ?? "",
    dateOfBirth: prefill?.dateOfBirth ?? "",
    nationality: prefill?.nationality ?? "",
    idNumber: prefill?.idNumber ?? "",
    entityType: prefill?.entityType ?? "individual",
    usePremium: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleChange = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function handleSubmit() {
    setError(null); setResult(null); setSubmitting(true);
    try {
      const res = await runScreening({
        clientId,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        idNumber: form.idNumber || null,
        entityType: form.entityType,
        usePremium: form.usePremium,
      });
      setResult(res);
      if (onSaved) onSaved(res);
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>New Compliance Screening</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Full Name *</label>
            <input
              style={styles.input}
              value={form.fullName}
              onChange={handleChange("fullName")}
              placeholder="e.g. Juma Hassan Mwakyusa"
              autoFocus
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Entity Type</label>
              <select
                style={styles.input}
                value={form.entityType}
                onChange={handleChange("entityType")}
              >
                <option value="individual">Individual</option>
                <option value="entity">Company / Entity</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Date of Birth</label>
              <input
                style={styles.input} type="date"
                value={form.dateOfBirth} onChange={handleChange("dateOfBirth")}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Nationality</label>
              <input
                style={styles.input}
                value={form.nationality}
                onChange={handleChange("nationality")}
                placeholder="e.g. Tanzanian"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>ID / Passport Number</label>
              <input
                style={styles.input}
                value={form.idNumber}
                onChange={handleChange("idNumber")}
                placeholder="NIDA / Passport"
              />
            </div>
          </div>

          <div style={styles.toggleRow}>
            <input
              type="checkbox" style={styles.toggle}
              checked={form.usePremium} onChange={handleChange("usePremium")}
              id="premium-toggle"
            />
            <label htmlFor="premium-toggle" style={styles.toggleLabel}>
              <strong>Premium screening</strong> — also check global PEPs &amp; adverse media via OpenSanctions
            </label>
            <span style={styles.premiumBadge}>PRO</span>
          </div>

          {result && (
            <div style={styles.results}>
              <div style={styles.resultHeader}>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: 0.5 }}>
                    SCREENING RESULT · {result.match_count} match{result.match_count === 1 ? "" : "es"}
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.navy, marginTop: 4 }}>
                    Highest score: <strong>{(result.highest_score * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <span style={styles.riskBadge(result.overall_risk)}>
                  {result.overall_risk}
                </span>
              </div>

              {result.match_count === 0 ? (
                <div style={styles.empty}>
                  ✓ No matches found against any sanctions or watchlist.
                  Screening recorded for audit.
                </div>
              ) : (
                result.matches.map((m, i) => (
                  <div key={i} style={styles.matchCard}>
                    <div style={styles.matchHead}>
                      <div>
                        <div style={styles.matchName}>{m.list_entry_name}</div>
                        <div style={styles.matchMeta}>
                          {m.list_source.replace(/_/g, " ")}
                          {m.program ? ` · ${m.program}` : ""}
                          {m.is_pep ? " · PEP" : ""}
                        </div>
                      </div>
                      <div style={styles.scorePill}>
                        {(m.match_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    {m.matched_value !== m.list_entry_name && (
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                        Matched on alias: <em>{m.matched_value}</em>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button style={styles.btnSecondary} onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={submitting || !form.fullName.trim()}
            >
              {submitting ? "Screening..." : "Run Screening"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
