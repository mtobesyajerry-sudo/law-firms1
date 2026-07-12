// ReviewMatchesPanel.jsx
// Shows pending matches for review with side-by-side client vs list-entry
// comparison and Clear / Escalate / Confirm actions.
// FIX 2: Actions route through review-matches edge function (role-enforced server-side).
// FIX 3: Escalate requires a separate escalation_justification field.
// FIX 4: Confirmed matches show STR filing deadline countdown + filing form.
// Every decision writes to screening_audit_log via the edge function.

import { useEffect, useState } from "react";
import {
  clearMatch, confirmMatch, escalateMatch, getScreeningDetail, fileSTR,
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
  label: {
    display: "block", fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
    textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6,
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
    ...(variant === "str" && {
      background: COLORS.navy, color: COLORS.gold, borderColor: COLORS.gold,
    }),
    ...(variant === "ghost" && {
      background: "transparent", color: COLORS.textMuted, borderColor: COLORS.border,
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

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setRemaining(new Date(deadline).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

// FIX 4 — STR deadline banner + filing form
function STRDeadlineBanner({ screening, onFiled }) {
  const remaining = useCountdown(screening?.str_deadline);
  const [strRef, setStrRef] = useState("");
  const [filing, setFiling] = useState(false);
  const [err, setErr] = useState(null);

  if (!screening?.str_deadline) return null;

  if (screening.str_reference_number) {
    return (
      <div style={{
        background: "#d1fae5", border: `1px solid ${COLORS.green}`,
        borderRadius: 4, padding: "10px 14px", marginBottom: 16, fontSize: 13,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ color: COLORS.green, fontWeight: 700 }}>STR Filed with FIU</span>
        <span style={{ color: COLORS.text }}>
          Reference: <strong>{screening.str_reference_number}</strong>
          {screening.time_to_file_minutes != null
            ? ` — Filed in ${screening.time_to_file_minutes} min`
            : ""}
        </span>
      </div>
    );
  }

  const overdue = remaining !== null && remaining <= 0;
  const hrs = remaining !== null ? Math.max(0, Math.floor(remaining / 3600000)) : null;
  const mins = remaining !== null ? Math.floor((Math.max(0, remaining) % 3600000) / 60000) : null;

  async function handleFile() {
    if (!strRef.trim() || strRef.trim().length < 3) {
      setErr("Enter a valid FIU STR reference number (min 3 characters).");
      return;
    }
    setFiling(true);
    setErr(null);
    try {
      await fileSTR(screening.id, strRef.trim());
      onFiled();
    } catch (e) {
      setErr(e.message);
    } finally {
      setFiling(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: overdue ? "#fee2e2" : "#fff7ed",
        border: `1px solid ${overdue ? COLORS.red : COLORS.amber}`,
        borderRadius: 4, padding: "10px 14px", marginBottom: 8,
        fontSize: 13, display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{overdue ? "🚨" : "⏰"}</span>
        <div>
          <div style={{ fontWeight: 700, color: overdue ? COLORS.red : COLORS.amber }}>
            {overdue
              ? "STR FILING OVERDUE — Report to FIU immediately"
              : `STR must be filed with the FIU — ${hrs}h ${mins}m remaining`}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
            Deadline: {new Date(screening.str_deadline).toLocaleString()}
          </div>
        </div>
      </div>

      {err && <div style={{ ...styles.error, marginBottom: 8 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={strRef}
          onChange={(e) => setStrRef(e.target.value)}
          placeholder="FIU STR reference number"
          style={{
            flex: 1, padding: "8px 12px", border: `1px solid ${COLORS.border}`,
            borderRadius: 4, fontSize: 13, fontFamily: "inherit",
          }}
        />
        <button
          style={{ ...styles.btn("str"), opacity: filing ? 0.6 : 1 }}
          onClick={handleFile}
          disabled={filing}
        >
          {filing ? "Filing..." : "File STR with FIU"}
        </button>
      </div>
    </div>
  );
}

export default function ReviewMatchesPanel() {
  const [pending, setPending] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState("");
  const [escalationJustification, setEscalationJustification] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    const { data, error } = await supabase
      .from("screening_matches")
      .select(`
        id, match_score, list_entry_name, list_source, list_entry_program,
        is_pep, created_at, screening_result_id, status, escalation_justification,
        screening_results (
          id, screened_name, overall_risk, status,
          str_deadline, str_reference_number, time_to_file_minutes
        )
      `)
      .in("status", ["pending_review", "pending_second_review"])
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
        setEscalationJustification("");
        setShowEscalate(false);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [selectedId, pending]);

  const currentMatch = detail?.matches.find((m) => m.id === detail.matchId);
  const pendingMatch = pending.find((m) => m.id === selectedId);
  const isSecondReview = pendingMatch?.status === "pending_second_review";

  async function handleAction(action) {
    if (!currentMatch) return;
    setError(null);

    if ((action === "clear" || action === "confirm") && notes.trim().length < 10) {
      setError("Add a note (at least 10 characters) explaining your decision.");
      return;
    }
    if (action === "escalate") {
      if (notes.trim().length < 10) {
        setError("Add reviewer notes (at least 10 characters).");
        return;
      }
      if (escalationJustification.trim().length < 10) {
        setError("Add an escalation justification (at least 10 characters) separate from your notes.");
        return;
      }
    }

    setBusy(true);
    try {
      if (action === "clear") await clearMatch(currentMatch.id, notes);
      if (action === "confirm") await confirmMatch(currentMatch.id, notes);
      if (action === "escalate") await escalateMatch(currentMatch.id, null, notes, escalationJustification);

      const remaining = pending.filter((m) => m.id !== currentMatch.id);
      setPending(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setNotes("");
      setEscalationJustification("");
      setShowEscalate(false);
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
                  {m.status === "pending_second_review" && (
                    <span style={{ color: COLORS.amber, fontWeight: 700 }}> · 2nd Review</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.detail}>
          {!currentMatch ? (
            <div style={styles.emptyState}>Select a match to review.</div>
          ) : (
            <>
              {error && <div style={styles.error}>{error}</div>}

              {/* FIX 4: STR deadline banner for confirmed screenings */}
              {detail?.screening?.status === "match_confirmed" && (
                <STRDeadlineBanner
                  screening={detail.screening}
                  onFiled={() => { loadPending(); setSelectedId(null); }}
                />
              )}

              {/* FIX 3: Second-review notice */}
              {isSecondReview && (
                <div style={{
                  background: "#fff7ed", border: `1px solid ${COLORS.amber}`,
                  borderRadius: 4, padding: "10px 14px", marginBottom: 16, fontSize: 13,
                }}>
                  <strong style={{ color: COLORS.amber }}>Second Review Required</strong>
                  <div style={{ color: COLORS.text, marginTop: 4 }}>
                    This match was escalated and requires a final decision (clear or confirm).
                  </div>
                  {pendingMatch?.escalation_justification && (
                    <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                      <strong>Escalation reason:</strong> {pendingMatch.escalation_justification}
                    </div>
                  )}
                </div>
              )}

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

              <label style={styles.label}>
                Reviewer notes (required for clear / confirm)
              </label>
              <textarea
                style={{ ...styles.notes, marginBottom: 16 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why is this a false positive or confirmed match? This goes into the audit log."
              />

              {/* FIX 3: Escalation justification panel */}
              {showEscalate && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...styles.label, color: COLORS.amber }}>
                    Escalation Justification (required — logged separately from reviewer notes)
                  </label>
                  <textarea
                    style={{ ...styles.notes, borderColor: COLORS.amber }}
                    value={escalationJustification}
                    onChange={(e) => setEscalationJustification(e.target.value)}
                    placeholder="Document specifically why this cannot be resolved now. When you are both CO and MLRO, this creates a Pending Second Review — you must re-open and make a final decision in a separate session."
                  />
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                    This is logged as a separate audit entry. You will need to return to this match
                    and issue a final Clear or Confirm decision.
                  </div>
                </div>
              )}

              <div style={styles.actions}>
                <button
                  style={{ ...styles.btn("clear"), opacity: busy ? 0.6 : 1 }}
                  onClick={() => { setShowEscalate(false); handleAction("clear"); }}
                  disabled={busy}
                >
                  Clear as False Positive
                </button>

                {!showEscalate ? (
                  <button
                    style={{ ...styles.btn("escalate"), opacity: busy ? 0.6 : 1 }}
                    onClick={() => setShowEscalate(true)}
                    disabled={busy}
                  >
                    Escalate / Second Review
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...styles.btn("escalate"), opacity: busy ? 0.6 : 1 }}
                      onClick={() => handleAction("escalate")}
                      disabled={busy}
                    >
                      {busy ? "Escalating..." : "Confirm Escalation"}
                    </button>
                    <button
                      style={{ ...styles.btn("ghost"), opacity: busy ? 0.6 : 1 }}
                      onClick={() => setShowEscalate(false)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  style={{ ...styles.btn("confirm"), opacity: busy ? 0.6 : 1 }}
                  onClick={() => { setShowEscalate(false); handleAction("confirm"); }}
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
