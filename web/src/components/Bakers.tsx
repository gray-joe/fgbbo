import { useEffect, useState } from "react";
import { endpoints, type Contestant, type Season } from "../api";

export default function Bakers() {
  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [contestants, setContestants] = useState<Contestant[] | null>(null);

  useEffect(() => {
    endpoints.seasons().then((seasons) => {
      setSeason(seasons.find((s) => s.active) ?? null);
    });
  }, []);

  useEffect(() => {
    if (!season) return;
    endpoints.contestants(season.id).then((rows) =>
      setContestants([...rows].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, [season]);

  if (season === undefined) {
    return (
      <section>
        <h2>The Bakers</h2>
        <p>Loading…</p>
      </section>
    );
  }

  if (season === null) {
    return (
      <section>
        <h2>The Bakers</h2>
        <p className="subtitle">No active season yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>The Bakers</h2>
      <p className="subtitle">Season {season.name}</p>

      {!contestants && <p>Loading…</p>}

      <div className="baker-grid">
        {contestants?.map((c) => (
          <div key={c.id} className={`baker-card ${c.eliminated ? "eliminated" : ""}`}>
            <p className="baker-name">{c.name}</p>
            <p className="baker-status">
              {c.eliminated ? "Eliminated" : "Still baking"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
