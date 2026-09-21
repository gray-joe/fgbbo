import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, endpoints, type AuditEntry } from "../../api";
import type { SeasonData } from "./Admin";
import { formatDateTime } from "./format";

const ENTITIES = ["seasons", "contestants", "weeks", "results", "users", "leagues"];

const LABELS: Record<string, string> = {
  "seasons.create": "Created season",
  "seasons.update": "Updated season",
  "contestants.create": "Added baker",
  "contestants.update": "Edited baker",
  "contestants.delete": "Removed baker",
  "weeks.create": "Added week",
  "weeks.update": "Edited week",
  "weeks.delete": "Deleted week",
  "results.create": "Published result",
  "results.update": "Corrected result",
  "results.delete": "Deleted result",
  "users.update": "Edited user",
  "users.delete": "Deleted user",
  "leagues.update": "Edited league",
  "leagues.delete": "Archived league",
  "leagues.rotate_invite_code": "Rotated invite code",
  "leagues.add_player": "Added player to league",
  "leagues.remove_player": "Removed player from league",
};

const BAKER_FIELDS = new Set(["star_baker", "technical_winner", "eliminated", "weekly_special"]);

export default function AdminActivity({ data }: { data: SeasonData | null }) {
  const [entity, setEntity] = useState("");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bakers = useMemo(
    () => new Map((data?.contestants ?? []).map((c) => [c.id, c.name])),
    [data],
  );

  const load = useCallback(async (cursor?: number) => {
    setLoading(true);
    setError(null);
    try {
      const page = await endpoints.auditLog({ cursor, entity: entity || undefined });
      setEntries((prev) => (cursor ? [...prev, ...page.data] : page.data));
      setNextCursor(page.pagination.next_cursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  function details(entry: AuditEntry): string {
    const parts = Object.entries(entry.body ?? {}).map(([key, value]) => {
      const shown =
        BAKER_FIELDS.has(key) && typeof value === "number"
          ? (bakers.get(value) ?? `#${value}`)
          : String(value);
      return `${key.replace(/_/g, " ")}: ${shown}`;
    });
    const target = entry.entity_id === null ? "" : `${entry.entity} #${entry.entity_id}`;
    return [target, ...parts].filter(Boolean).join(" · ");
  }

  return (
    <div className="admin-panel">
      <label className="filter-label">
        Show
        <select className="league-select" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Everything</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.at)}</td>
              <td>{entry.actor_email}</td>
              <td>{LABELS[entry.action] ?? entry.action}</td>
              <td>{details(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && entries.length === 0 && <p className="subtitle">Nothing recorded yet.</p>}
      {loading && <p className="subtitle">Loading…</p>}
      {nextCursor !== null && !loading && (
        <button className="link-button" onClick={() => load(nextCursor)}>
          Load more
        </button>
      )}
    </div>
  );
}
