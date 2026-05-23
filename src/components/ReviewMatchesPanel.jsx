// ReviewMatchesPanel.jsx
// Shows pending matches for review, with side-by-side client vs list-entry
// comparison and clear / confirm / escalate actions.
// Every decision writes to screening_audit_log via screeningService.

import { useEffect, useState } from "react";
import {
  clearMatch, confirmMatch, escalateMatch, getScreeningDetail,
} from "../services/screeningService";
import { supabase } from "../supabaseClient";

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
  panel: {
    background: COLORS.white, border: `1px solid ${COLORS.border}`,
    borderRadius: 6, overflow: "hidden",
  },
  header: {
    padding: "16px 20px", background: COLORS.navy, color: COLORS.gold,
    borderBottom: `2px solid ${COLORS.gold}`,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: 0.5, margin: 0 },
  queue: {
    display: "grid", gridTemplateColumns: "320px 1fr",
    minHeight: 500,
  },
  list: {
    borderRight: `1px solid ${COLORS.border}`,
    background: COLORS.bg, overflow: "auto", maxHeight: 700,
  },
  listItem: (active) => ({
    padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`,
    cursor: "pointer",
    background: active ? COLORS.goldSoft : "transparent",
    borderLeft: active ? `4px solid ${COLORS.gold}` : "4px solid transparent",
  }),
  listName: { fontSize: 13, fontWeight: 600, color: COLORS.navy, marginBottom: 2 },
  listMeta: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3 },
  scoreTag: (score) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 10,
    fontSize: 11, fontWeight: 700, marginRight: 6,
    color: COLORS.white,
    background: score >= 0.9 ? COLORS.red : score >= 0.8 ? COLORS.amber : COLORS.navy,
  }),
  detail: { padding: 24, overflow: "auto", maxHeight: 700 },
  compareGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24,
  },
  card: {
    border: `1px solid ${COLORS.border}`, borderRadius: 4, overflow: "hidden",
  },
  cardHead: {
    padding: "8px 12px", background: COLORS.navy, color: COLORS.gold,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
  },
  cardBody: { padding: 12, fontSize: 13 },
  row: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  rowKey: { color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 },
  rowVal: { color: COLORS.text, fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" },
  scoreBox: {
    background: COLORS.goldSoft, padding: 12, borderRadius: 4,
    marginBottom: 16, fontSize: 13,
  },
  notes: {
    width: "100%", minHeight: 80, padding: 10,
    border: `1px solid ${COLORS.border}`, borderRadius: 4,
    fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
    resize: "vertical",
  },
  actions: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  btn: (variant) => ({
    padding: "10px 16px", borderRadius: 4,
    fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
    textTransform: "uppercase", cursor: "pointer",
    border: "1px solid",
    ...(variant === "clear" && {
      background: COLORS.green, color: COLORS.white, borderColor: COLORS.green,
    }),
    ...(variant === "confirm" && {
      background: COLORS.red, color: COLORS.white, borderColor: COLORS.red,
    }),
    ...(variant === "escalate" && {
      background: COLORS.amber, color: COLORS.white, borderColor: COLORS.amber,
    }),
  }),
  emptyState: {
    padding: 60, textAlign: "center", color: COLORS.textMuted,
  },
  error: {
    background: "#fdecec", color: COLORS.red,
    padding: 10, borderRadius: 4, marginBottom: 12,
    fontSize: 12, border: `1px solid ${COLORS.red}`,
  },
};

function fmtName(s) { return s || "—"; }
function fmtList(arr) { return arr?.length ? arr.join(", ") : "—"; }

export default function ReviewMatchesPanel() {
  const [pending, setPending] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    const { data, error } = await supabase
      .from("screening_matches")
      .select(`
        id, match_score, list_entry_name, list_source, list_entry_program,
        is_pep, created_at, screening_result_id,
        screening_results (id, screened_name, overall_risk)
      `)
      .eq("status", "pending_review")
      .order("match_score", { ascending: false })
      .limit(50);

    if (error) { setError(error.message); return; }
    setPending(data ?? []);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
  }

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    const match = pending.find((m) => m.id === selectedId);
    if (!match) return;
    (async () => {
      try {
        const det = await getScreeningDetail(match.screening_result_id);
        setDetail({ ...det, matchId: selectedId });
        setNotes("");
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [selectedId, pending]);

  const currentMatch = detail?.matches.find((m) => m.id === detail.matchId);

  async function handleAction(action) {
    if (!currentMatch) return;
    setError(null);
    if ((action === "clear" || action === "confirm") && notes.trim().length < 10) {
      setError("Please add a note (at least 10 characters) explaining your decision.");
      return;
    }
    setBusy(true);
    try {
      if (action === "clear") await clearMatch(currentMatch.id, notes);
      if (action === "confirm") await confirmMatch(currentMatch.id, notes);
      if (action === "escalate") await escalateMatch(currentMatch.id, null, notes);

      // remove from queue and move to next
      const remaining = pending.filter((m) => m.id !== currentMatch.id);
      setPending(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setNotes("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Review Matches ({pending.length} pending)</h3>
      </div>

      <div style={styles.queue}>
        <div style={styles.list}>
          {pending.length === 0 ? (
            <div style={styles.emptyState}>No matches pending review.</div>
          ) : (
            pending.map((m) => (
              <div
                key={m.id}
                style={styles.listItem(m.id === selectedId)}
                onClick={() => setSelectedId(m.id)}
              >
                <div style={styles.listName}>
                  <span style={styles.scoreTag(m.match_score)}>
                    {(m.match_score * 100).toFixed(0)}%
                  </span>
                  {m.screening_results?.screened_name}
                </div>
                <div style={styles.listMeta}>
                  → {m.list_entry_name} · {m.list_source?.replace(/_/g, " ")}
                  {m.is_pep ? " · PEP" : ""}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.detail}>
          {!currentMatch ? (
            <div style={styles.emptyState}>
              Select a match to review.
            </div>
          ) : (
            <>
              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.compareGrid}>
                <div style={styles.card}>
                  <div style={styles.cardHead}>Client (Screened)</div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Name</span>
                      <span style={styles.rowVal}>{fmtName(detail.screening.screened_name)}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>DOB</span>
                      <span style={styles.rowVal}>{fmtName(detail.screening.screened_dob)}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Nationality</span>
                      <span style={styles.rowVal}>{fmtName(detail.screening.screened_nationality)}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>ID</span>
                      <span style={styles.rowVal}>{fmtName(detail.screening.screened_id_number)}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.card}>
                  <div style={styles.cardHead}>
                    List Entry · {currentMatch.list_source?.replace(/_/g, " ")}
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Name</span>
                      <span style={styles.rowVal}>{fmtName(currentMatch.list_entry_name)}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>DOB</span>
                      <span style={styles.rowVal}>
                        {fmtName(
                          currentMatch.screening_list_entries?.date_of_birth ??
                          currentMatch.screening_list_entries?.dob_text
                        )}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Nationality</span>
                      <span style={styles.rowVal}>
                        {fmtList(currentMatch.screening_list_entries?.nationalities)}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Place of Birth</span>
                      <span style={styles.rowVal}>
                        {fmtName(currentMatch.screening_list_entries?.place_of_birth)}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.rowKey}>Program</span>
                      <span style={styles.rowVal}>{fmtName(currentMatch.list_entry_program)}</span>
                    </div>
                    {currentMatch.is_pep && (
                      <div style={styles.row}>
                        <span style={styles.rowKey}>PEP</span>
                        <span style={styles.rowVal}>
                          {fmtName(currentMatch.screening_list_entries?.pep_position)}
                          {currentMatch.screening_list_entries?.pep_country
                            ? ` (${currentMatch.screening_list_entries.pep_country})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.scoreBox}>
                <strong>Match score: {(currentMatch.match_score * 100).toFixed(1)}%</strong>
                {currentMatch.score_breakdown && (
                  <div style={{ fontSize: 12, marginTop: 6, color: COLORS.textMuted }}>
                    Name: {(currentMatch.score_breakdown.name_score * 100).toFixed(0)}%
                    {currentMatch.score_breakdown.dob_bonus !== 0 && ` · DOB: ${currentMatch.score_breakdown.dob_bonus > 0 ? "+" : ""}${(currentMatch.score_breakdown.dob_bonus * 100).toFixed(0)}%`}
                    {currentMatch.score_breakdown.nationality_bonus > 0 && ` · Nationality: +${(currentMatch.score_breakdown.nationality_bonus * 100).toFixed(0)}%`}
                    {currentMatch.score_breakdown.id_match_bonus > 0 && ` · ID: +${(currentMatch.score_breakdown.id_match_bonus * 100).toFixed(0)}%`}
                  </div>
                )}
              </div>

              <label style={{ ...styles.rowKey, marginBottom: 6, display: "block" }}>
                Reviewer notes (required for clear / confirm)
              </label>
              <textarea
                style={styles.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why is this a false positive, confirmed match, or escalation? This goes into the audit log."
              />

              <div style={styles.actions}>
                <button
                  style={{ ...styles.btn("clear"), opacity: busy ? 0.6 : 1 }}
                  onClick={() => handleAction("clear")}
                  disabled={busy}
                >
                  Clear as False Positive
                </button>
                <button
                  style={{ ...styles.btn("escalate"), opacity: busy ? 0.6 : 1 }}
                  onClick={() => handleAction("escalate")}
                  disabled={busy}
                >
                  Escalate to MLRO
                </button>
                <button
                  style={{ ...styles.btn("confirm"), opacity: busy ? 0.6 : 1 }}
                  onClick={() => handleAction("confirm")}
                  disabled={busy}
                >
                  Confirm Match
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
