import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  endpoints,
  type Contestant,
  type Prediction,
  type Result,
  type Season,
  type Week,
} from "../api";

type PickField = "star_baker" | "technical_winner" | "eliminated" | "weekly_special";

const CATEGORIES: { field: PickField; label: string; points: number; hint: string }[] = [
  { field: "star_baker", label: "Star Baker", points: 10, hint: "Best overall performance" },
  { field: "technical_winner", label: "Technical Winner", points: 5, hint: "Wins the technical challenge" },
  { field: "eliminated", label: "Eliminated", points: 10, hint: "Leaves the tent this week" },
  { field: "weekly_special", label: "Weekly Special", points: 3, hint: "This week's special achievement" },
];

type Picks = Partial<Record<PickField, number>>;

export default function MakePicks() {
  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<Prediction | undefined>(undefined);
  const [picks, setPicks] = useState<Picks>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    endpoints.seasons().then((seasons) => {
      setSeason(seasons.find((s) => s.active) ?? null);
    });
  }, []);

  useEffect(() => {
    if (!season) return;
    Promise.all([
      endpoints.weeks(season.id),
      endpoints.contestants(season.id),
      endpoints.results(),
    ]).then(([weekRows, contestantRows, resultRows]) => {
      const sorted = [...weekRows].sort((a, b) => a.number - b.number);
      setWeeks(sorted);
      setContestants(contestantRows);
      setResults(resultRows);
      const firstOpen = sorted.find(
        (w) => !resultRows.some((r) => r.week === w.id),
      );
      setSelectedWeekId((firstOpen ?? sorted[sorted.length - 1])?.id ?? null);
    });
  }, [season]);

  useEffect(() => {
    if (selectedWeekId === null) return;
    setError(null);
    endpoints.getPrediction(selectedWeekId).then((pred) => {
      setPrediction(pred);
      setPicks(
        pred
          ? {
              star_baker: pred.star_baker,
              technical_winner: pred.technical_winner,
              eliminated: pred.eliminated,
              weekly_special: pred.weekly_special,
            }
          : {},
      );
    });
  }, [selectedWeekId]);

  const selectedWeek = weeks?.find((w) => w.id === selectedWeekId);
  const aired = useMemo(
    () => new Set(results.map((r) => r.week)),
    [results],
  );
  const isLocked =
    !!selectedWeek &&
    (aired.has(selectedWeek.id) ||
      Date.now() >= new Date(selectedWeek.prediction_deadline).getTime());
  // Bakers who have left can't be picked, but a saved pick for one (e.g. this
  // episode's eliminated baker) must still show.
  const deadline = selectedWeek
    ? new Date(selectedWeek.prediction_deadline).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const offered = (field: PickField) =>
    contestants.filter((c) => !c.eliminated || picks[field] === c.id);

  async function save() {
    if (!selectedWeek) return;
    const complete = CATEGORIES.every((c) => picks[c.field] !== undefined);
    if (!complete) {
      setError("Pick a baker for every category first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        star_baker: picks.star_baker!,
        technical_winner: picks.technical_winner!,
        eliminated: picks.eliminated!,
        weekly_special: picks.weekly_special!,
      };
      const saved = prediction
        ? await endpoints.updatePrediction(selectedWeek.id, body)
        : await endpoints.createPrediction({
            week_id: selectedWeek.id,
            ...body,
          });
      setPrediction(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save picks");
    } finally {
      setSaving(false);
    }
  }

  if (season === null) {
    return (
      <section>
        <h2>Your Predictions</h2>
        <p className="subtitle">No active season yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Your Predictions</h2>
      <p className="subtitle">Pick for each episode. Locks once the episode airs.</p>

      {!weeks && <p>Loading…</p>}

      {weeks && (
        <div className="ep-strip">
          {weeks.map((w) => {
            const status = aired.has(w.id) ? "Aired" : "Upcoming";
            return (
              <button
                key={w.id}
                className={`ep-chip ${w.id === selectedWeekId ? "active" : ""}`}
                onClick={() => setSelectedWeekId(w.id)}
              >
                <span className="ep-number">EP {w.number}</span>
                <span className="ep-theme">{w.theme}</span>
                <span className="ep-status">{status}</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedWeek && (
        <>
          <div className="week-banner">
            <div>
              <p className="eyebrow">Episode {selectedWeek.number}</p>
              <h3>{selectedWeek.theme}</h3>
              <p className="subtitle deadline">
                {isLocked ? "Picks are locked" : `Picks lock ${deadline}`}
              </p>
            </div>
            <span className={`status-pill ${isLocked ? "locked" : "open"}`}>
              {isLocked ? "LOCKED" : "OPEN"}
            </span>
          </div>

          {CATEGORIES.map((cat) => (
            <div className="category" key={cat.field}>
              <div className="category-head">
                <div>
                  <h4>{cat.label}</h4>
                  <p className="subtitle">{cat.hint}</p>
                </div>
                <span className="points-pill">{cat.points} PTS</span>
              </div>
              <div className="baker-grid">
                {offered(cat.field).map((c) => (
                  <button
                    key={c.id}
                    disabled={isLocked}
                    className={`baker-card pickable ${
                      picks[cat.field] === c.id ? "selected" : ""
                    }`}
                    onClick={() => setPicks((p) => ({ ...p, [cat.field]: c.id }))}
                  >
                    <p className="baker-name">{c.name}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="form-error">{error}</p>}
          {!isLocked && (
            <button className="save-button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : prediction ? "Update picks" : "Save picks"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
