import { useCallback, useEffect, useState } from "react";
import {
  endpoints,
  type Contestant,
  type Result,
  type Season,
  type Week,
} from "../../api";
import AdminActivity from "./AdminActivity";
import AdminResults from "./AdminResults";
import AdminSeason from "./AdminSeason";
import AdminWeeks from "./AdminWeeks";

type Section = "results" | "weeks" | "season" | "activity";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "results", label: "Results" },
  { id: "weeks", label: "Weeks" },
  { id: "season", label: "Season & bakers" },
  { id: "activity", label: "Activity" },
];

export interface SeasonData {
  weeks: Week[];
  contestants: Contestant[];
  results: Result[];
}

export default function Admin() {
  const [section, setSection] = useState<Section>("results");
  const [seasons, setSeasons] = useState<Season[] | undefined>(undefined);
  const [data, setData] = useState<SeasonData | null>(null);
  const season = seasons === undefined ? undefined : (seasons.find((s) => s.active) ?? null);

  const loadSeasons = useCallback(async () => {
    setSeasons(await endpoints.seasons());
  }, []);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  const load = useCallback(async (seasonId: number) => {
    const [weeks, contestants, results] = await Promise.all([
      endpoints.weeks(seasonId),
      endpoints.contestants(seasonId),
      endpoints.results(),
    ]);
    const sorted = [...weeks].sort((a, b) => a.number - b.number);
    const weekIds = new Set(sorted.map((w) => w.id));
    setData({
      weeks: sorted,
      contestants,
      results: results.filter((r) => weekIds.has(r.week)),
    });
  }, []);

  // Reload when the active season changes, and don't show the old season's data meanwhile.
  const seasonId = season?.id;
  useEffect(() => {
    setData(null);
    if (seasonId !== undefined) load(seasonId);
  }, [seasonId, load]);

  return (
    <section>
      <h2>Admin</h2>
      <p className="subtitle">
        {season === undefined
          ? "Loading…"
          : season
            ? `Managing ${season.name}. Every change here is recorded in Activity.`
            : "No active season yet."}
      </p>

      <nav className="admin-tabs" aria-label="Admin sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={section === s.id ? "active" : ""}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {section === "activity" && <AdminActivity data={data} />}
      {section === "season" && seasons && (
        <AdminSeason
          seasons={seasons}
          season={season ?? null}
          data={data}
          reloadSeasons={loadSeasons}
          reloadData={() => (season ? load(season.id) : Promise.resolve())}
        />
      )}
      {(section === "results" || section === "weeks") && season && data && (
        <>
          {section === "results" && (
            <AdminResults data={data} reload={() => load(season.id)} />
          )}
          {section === "weeks" && (
            <AdminWeeks season={season} data={data} reload={() => load(season.id)} />
          )}
        </>
      )}
    </section>
  );
}
