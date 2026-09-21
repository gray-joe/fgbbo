import { useEffect, useState } from "react";
import { endpoints, type League, type StandingEntry, type User } from "../api";

export default function Standings({
  leagues,
  currentUser,
}: {
  leagues: League[];
  currentUser: User;
}) {
  const [leagueId, setLeagueId] = useState(leagues[0].id);
  const [entries, setEntries] = useState<StandingEntry[] | null>(null);
  const [users, setUsers] = useState<Map<number, User>>(new Map());

  const league = leagues.find((l) => l.id === leagueId) ?? leagues[0];

  useEffect(() => {
    setEntries(null);
    Promise.all([endpoints.standings(leagueId), endpoints.users()]).then(
      ([standings, allUsers]) => {
        setEntries(standings);
        setUsers(new Map(allUsers.map((u) => [u.id, u])));
      },
    );
  }, [leagueId]);

  const maxPoints = Math.max(1, ...(entries ?? []).map((e) => e.total_points));

  return (
    <section>
      <div className="standings-heading">
        <div>
          <h2>League Standings</h2>
          <p className="subtitle">{league.name}</p>
        </div>
        {leagues.length > 1 && (
          <select
            className="league-select"
            value={leagueId}
            onChange={(e) => setLeagueId(Number(e.target.value))}
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!entries && <p>Loading…</p>}

      {entries && (
        <div className="standings-table">
          <div className="standings-head">
            <span>#</span>
            <span>Player</span>
            <span className="align-right">Pts</span>
          </div>
          {entries.map((entry) => {
            const isYou = entry.user_id === currentUser.id;
            return (
              <div
                key={entry.user_id}
                className={`standings-row ${isYou ? "you" : ""}`}
              >
                <span>{entry.rank === 1 ? "★" : entry.rank}</span>
                <span className="standings-name">
                  {isYou ? "You" : (users.get(entry.user_id)?.name ?? "Former member")}
                  {isYou && <span className="badge">YOU</span>}
                  <span className="progress-track">
                    <span
                      className="progress-fill"
                      style={{ width: `${(entry.total_points / maxPoints) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="align-right points">{entry.total_points}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="scoring-guide">
        <p className="eyebrow">Scoring guide</p>
        <div className="scoring-items">
          <span>
            <strong>10</strong> Star Baker
          </span>
          <span>
            <strong>10</strong> Eliminated
          </span>
          <span>
            <strong>5</strong> Technical Winner
          </span>
          <span>
            <strong>3</strong> Weekly Special
          </span>
        </div>
      </div>
    </section>
  );
}
