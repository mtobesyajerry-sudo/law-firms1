// ManageListsPanel.jsx
// Displays all screening lists (global + internal) with their last sync time,
// entry count, and a Refresh button for global lists.

import { useEffect, useState } from "react";
import { getLists, getRecentIngestionLogs, triggerListSync } from "../services/screeningService";

const COLORS = {
  gold: "#d4af37", goldSoft: "#f4e8b8",
  navy: "#0a1929",
  white: "#ffffff", bg: "#fafaf7",
  red: "#c0392b", amber: "#e67e22", green: "#27ae60",
  border: "#e2e2dc", text: "#1a1a1a", textMuted: "#6b6b6b",
};

const styles = {
  wrap: { background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden" },
  header: {
    padding: "16px 20px", background: COLORS.navy, color: COLORS.gold,
    borderBottom: `2px solid ${COLORS.gold}`,
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: 0.5, margin: 0 },
  subtitle: { fontSize: 12, color: COLORS.goldSoft, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    background: COLORS.bg, padding: "12px 16px", textAlign: "left",
    fontSize: 11, fontWeight: 700, color: COLORS.navy,
    textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: `2px solid ${COLORS.gold}`,
  },
  td: { padding: "14px 16px", fontSize: 13, borderBottom: `1px solid ${COLORS.border}` },
  badge: (color) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
    background: color, color: COLORS.white,
  }),
  refreshBtn: {
    padding: "6px 14px", background: COLORS.navy, color: COLORS.gold,
    border: `1px solid ${COLORS.gold}`, borderRadius: 4,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    cursor: "pointer", textTransform: "uppercase",
  },
  ingestionLog: { padding: 16, background: COLORS.bg, borderTop: `1px solid ${COLORS.border}` },
  logTitle: {
    fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5,
    textTransform: "uppercase", marginBottom: 8,
  },
  logRow: { fontSize: 12, color: COLORS.text, padding: "4px 0" },
};

function timeAgo(iso) {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusBadge(status) {
  if (status === "success") return styles.badge(COLORS.green);
  if (status === "failed") return styles.badge(COLORS.red);
  if (status === "running") return styles.badge(COLORS.amber);
  return styles.badge(COLORS.textMuted);
}

export default function ManageListsPanel() {
  const [lists, setLists] = useState([]);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState({});

  async function loadAll() {
    const [l, lg] = await Promise.all([getLists(), getRecentIngestionLogs(10)]);
    setLists(l);
    setLogs(lg);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleRefresh(list) {
    setRefreshing((r) => ({ ...r, [list.id]: true }));
    try {
      await triggerListSync(list.list_source);
      await loadAll();
    } catch (err) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing((r) => ({ ...r, [list.id]: false }));
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.title}>Sanctions & Watchlists</h3>
        <div style={styles.subtitle}>
          Global lists are maintained automatically. Internal lists are your firm's own watchlists.
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>List</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Entries</th>
            <th style={styles.th}>Last Synced</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {lists.map((l) => (
            <tr key={l.id}>
              <td style={styles.td}>
                <div style={{ fontWeight: 600, color: COLORS.navy }}>{l.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  {l.description}
                </div>
              </td>
              <td style={styles.td}>
                <span style={l.is_global ? styles.badge(COLORS.navy) : styles.badge(COLORS.gold)}>
                  {l.is_global ? "Global" : "Internal"}
                </span>
              </td>
              <td style={styles.td}>{(l.entry_count ?? 0).toLocaleString()}</td>
              <td style={styles.td}>{timeAgo(l.last_synced_at)}</td>
              <td style={styles.td}>
                <span style={statusBadge(l.sync_status)}>{l.sync_status?.replace("_", " ") ?? "never"}</span>
                {l.sync_error && (
                  <div style={{ fontSize: 11, color: COLORS.red, marginTop: 4 }}>{l.sync_error}</div>
                )}
              </td>
              <td style={styles.td}>
                {l.is_global && (
                  <button
                    style={{ ...styles.refreshBtn, opacity: refreshing[l.id] ? 0.6 : 1 }}
                    onClick={() => handleRefresh(l)}
                    disabled={refreshing[l.id]}
                  >
                    {refreshing[l.id] ? "Syncing..." : "Refresh"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.ingestionLog}>
        <div style={styles.logTitle}>Recent Sync Activity</div>
        {logs.length === 0 && <div style={{ fontSize: 12, color: COLORS.textMuted }}>No sync runs yet.</div>}
        {logs.map((log) => (
          <div key={log.id} style={styles.logRow}>
            {timeAgo(log.started_at)} — <strong>{log.screening_lists?.name}</strong> —{" "}
            {log.status === "success"
              ? `+${log.entries_added} added, ${log.entries_updated} updated, ${log.entries_removed} removed (${log.duration_ms}ms)`
              : log.status === "failed"
              ? `Failed: ${log.error_message}`
              : "running..."}
          </div>
        ))}
      </div>
    </div>
  );
}
