import { useState } from "react";
import { ApiError, endpoints, type Season, type Week } from "../../api";
import type { SeasonData } from "./Admin";
import { formatDateTime, fromLocalInput, timeZoneName, toLocalInput } from "./format";

export default function AdminWeeks({
  season,
  data,
  reload,
}: {
  season: Season;
  data: SeasonData;
  reload: () => Promise<void>;
}) {
  const { weeks, results } = data;
  const nextNumber = weeks.reduce((max, w) => Math.max(max, w.number), 0) + 1;

  const [number, setNumber] = useState<string>("");
  const [theme, setTheme] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editing, setEditing] = useState<Week | null>(null);
  const [editTheme, setEditTheme] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await reload();
      setMessage(done);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    return run(async () => {
      await endpoints.createWeek({
        number: number === "" ? nextNumber : Number(number),
        theme: theme.trim(),
        season_id: season.id,
        prediction_deadline: fromLocalInput(deadline),
      });
      setNumber("");
      setTheme("");
      setDeadline("");
    }, "Week added.");
  }

  function startEdit(week: Week) {
    setEditing(week);
    setEditTheme(week.theme);
    setEditDeadline(toLocalInput(week.prediction_deadline));
    setDeleting(null);
    setMessage(null);
    setError(null);
  }

  function saveEdit() {
    const week = editing!;
    // Send only what changed, so the activity log shows the actual edit.
    const patch: { theme?: string; prediction_deadline?: string } = {};
    if (editTheme.trim() !== week.theme) patch.theme = editTheme.trim();
    // Compare what the picker shows (to the minute), so an untouched deadline
    // isn't rewritten with its seconds cut off.
    if (editDeadline !== toLocalInput(week.prediction_deadline)) {
      patch.prediction_deadline = fromLocalInput(editDeadline);
    }
    return run(async () => {
      if (Object.keys(patch).length > 0) await endpoints.updateWeek(week.id, patch);
      setEditing(null);
    }, "Week updated.");
  }

  const status = (w: Week) =>
    results.some((r) => r.week === w.id)
      ? "Result published"
      : new Date(w.prediction_deadline).getTime() <= Date.now()
        ? "Locked"
        : "Open";

  return (
    <div className="admin-panel">
      <form className="admin-form" onSubmit={add}>
        <h3>Add a week</h3>
        <label>
          Week number
          <input
            type="number"
            min={1}
            value={number}
            placeholder={String(nextNumber)}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          Theme
          <input value={theme} onChange={(e) => setTheme(e.target.value)} required />
        </label>
        <label>
          Deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </label>
        <p className="subtitle">Times use your browser's time zone ({timeZoneName}).</p>
        <div className="button-row">
          <button className="save-button" type="submit" disabled={busy}>
            Add week
          </button>
        </div>
      </form>

      {message && (
        <p className="banner" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Theme</th>
            <th>Picks lock</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) =>
            editing?.id === w.id ? (
              <tr key={w.id}>
                <td>{w.number}</td>
                <td>
                  <input
                    aria-label={`Theme for week ${w.number}`}
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value)}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Deadline for week ${w.number}`}
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                </td>
                <td>{status(w)}</td>
                <td className="row-actions">
                  <button className="link-button" disabled={busy} onClick={saveEdit}>
                    Save
                  </button>
                  <button className="link-button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={w.id}>
                <td>{w.number}</td>
                <td>{w.theme}</td>
                <td>{formatDateTime(w.prediction_deadline)}</td>
                <td>{status(w)}</td>
                <td className="row-actions">
                  {deleting === w.id ? (
                    <>
                      <button
                        className="link-button danger"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await endpoints.deleteWeek(w.id);
                            setDeleting(null);
                          }, "Week deleted.")
                        }
                      >
                        Confirm delete
                      </button>
                      <button className="link-button" onClick={() => setDeleting(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="link-button"
                        aria-label={`Edit week ${w.number}`}
                        onClick={() => startEdit(w)}
                      >
                        Edit
                      </button>
                      <button
                        className="link-button danger"
                        aria-label={`Delete week ${w.number}`}
                        disabled={results.some((r) => r.week === w.id)}
                        title={
                          results.some((r) => r.week === w.id)
                            ? "Delete the result first"
                            : undefined
                        }
                        onClick={() => {
                          setDeleting(w.id);
                          setEditing(null);
                          setMessage(null);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
