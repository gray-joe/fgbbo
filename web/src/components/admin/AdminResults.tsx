import { useEffect, useMemo, useState } from "react";
import { ApiError, endpoints, type ResultPicks } from "../../api";
import type { SeasonData } from "./Admin";
import { formatDateTime } from "./format";

type Field = keyof ResultPicks;

const CATEGORIES: { field: Field; label: string }[] = [
  { field: "star_baker", label: "Star Baker" },
  { field: "technical_winner", label: "Technical Winner" },
  { field: "eliminated", label: "Eliminated" },
  { field: "weekly_special", label: "Weekly Special" },
];

type Step = "editing" | "confirm-save" | "confirm-delete";

export default function AdminResults({
  data,
  reload,
}: {
  data: SeasonData;
  reload: () => Promise<void>;
}) {
  const { weeks, contestants, results } = data;
  const [weekId, setWeekId] = useState<number | null>(null);
  const [picks, setPicks] = useState<Partial<ResultPicks>>({});
  const [step, setStep] = useState<Step>("editing");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const week = weeks.find((w) => w.id === weekId);
  const current = results.find((r) => r.week === weekId);
  const names = useMemo(() => new Map(contestants.map((c) => [c.id, c.name])), [contestants]);
  const name = (id: number | undefined) => (id === undefined ? "" : (names.get(id) ?? `#${id}`));

  // Start on the first week still waiting for a result.
  useEffect(() => {
    if (weekId === null && weeks.length > 0) {
      setWeekId((weeks.find((w) => !results.some((r) => r.week === w.id)) ?? weeks[weeks.length - 1]).id);
    }
  }, [weekId, weeks, results]);

  // Reset the form when the chosen week (or its result) changes.
  useEffect(() => {
    setPicks(
      current
        ? {
            star_baker: current.star_baker,
            technical_winner: current.technical_winner,
            eliminated: current.eliminated,
            weekly_special: current.weekly_special,
          }
        : {},
    );
    setStep("editing");
    setError(null);
  }, [weekId, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bakers who have gone home can't be named, except the one this result already eliminated.
  const options = (contestants ?? [])
    .filter((c) => !c.eliminated || c.id === current?.eliminated)
    .sort((a, b) => a.name.localeCompare(b.name));

  const complete = CATEGORIES.every((c) => picks[c.field] !== undefined);
  const changes = current
    ? CATEGORIES.filter((c) => picks[c.field] !== current[c.field])
    : [];
  const canReview = complete && (!current || changes.length > 0);
  const deadlineAhead = week && new Date(week.prediction_deadline).getTime() > Date.now();

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
      setMessage(done);
      setStep("editing");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if (current) {
        // Send only what changed, so the activity log shows the actual correction.
        const patch: Partial<ResultPicks> = {};
        for (const c of changes) patch[c.field] = picks[c.field];
        await endpoints.updateResult(current.id, patch);
      } else {
        await endpoints.publishResult({ week: week!.id, ...(picks as ResultPicks) });
      }
    }, current ? "Result corrected. Every league's scores for this week were recalculated." : "Result published. Every league's scores for this week were calculated.");

  const remove = () =>
    run(async () => {
      await endpoints.deleteResult(current!.id);
    }, "Result deleted. This week's scores were cleared.");

  return (
    <div className="admin-panel">
      <div className="ep-strip">
        {weeks.map((w) => (
          <button
            key={w.id}
            className={`ep-chip ${w.id === weekId ? "active" : ""}`}
            onClick={() => {
              setWeekId(w.id);
              setMessage(null);
            }}
          >
            <span className="ep-number">EP {w.number}</span>
            <span className="ep-theme">{w.theme}</span>
            <span className="ep-status">
              {results.some((r) => r.week === w.id) ? "Published" : "No result"}
            </span>
          </button>
        ))}
      </div>

      {message && (
        <p className="banner" role="status">
          {message}
        </p>
      )}

      {week && (
        <div className="admin-form">
          <h3>
            {current ? "Result" : "Publish result"}: {week.theme}
          </h3>

          {!current && deadlineAhead && step === "editing" && (
            <p className="warning">
              Picks for this week are open until {formatDateTime(week.prediction_deadline)}.
              Publishing now locks them.
            </p>
          )}

          {step === "editing" && (
            <>
              {CATEGORIES.map((c) => (
                <label key={c.field}>
                  {c.label}
                  <select
                    value={picks[c.field] ?? ""}
                    onChange={(e) =>
                      setPicks((p) => ({
                        ...p,
                        [c.field]: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">Choose a baker…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button
                  className="save-button"
                  disabled={!canReview}
                  onClick={() => setStep("confirm-save")}
                >
                  {current ? "Review correction" : "Review and publish"}
                </button>
                {current && (
                  <button className="danger-button" onClick={() => setStep("confirm-delete")}>
                    Delete result
                  </button>
                )}
              </div>
            </>
          )}

          {step === "confirm-save" && (
            <div className="confirm-box" role="group" aria-label="Confirm result">
              <p>
                {current
                  ? "Correct this result? Every league's scores for this week will be recalculated."
                  : "Publish this result? Every league's scores for this week will be calculated and picks for the week lock."}
              </p>
              <ul>
                {CATEGORIES.map((c) => (
                  <li key={c.field}>
                    {c.label}: <strong>{name(picks[c.field])}</strong>
                    {current && picks[c.field] !== current[c.field] && (
                      <> (was {name(current[c.field])})</>
                    )}
                  </li>
                ))}
              </ul>
              {!current && (
                <p>{name(picks.eliminated)} will be marked as eliminated.</p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button className="save-button" disabled={busy} onClick={save}>
                  {busy ? "Saving…" : current ? "Confirm correction" : "Confirm and publish"}
                </button>
                <button className="link-button" disabled={busy} onClick={() => setStep("editing")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "confirm-delete" && (
            <div className="confirm-box" role="group" aria-label="Confirm delete">
              <p>
                Delete this result? Every league's scores for this week are cleared.
                {deadlineAhead ? " Picks reopen because the deadline hasn't passed." : ""}
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button className="danger-button" disabled={busy} onClick={remove}>
                  {busy ? "Deleting…" : "Confirm delete"}
                </button>
                <button className="link-button" disabled={busy} onClick={() => setStep("editing")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
