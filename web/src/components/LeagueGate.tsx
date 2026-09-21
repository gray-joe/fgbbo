import { useState } from "react";
import { ApiError, endpoints, type League } from "../api";

type Mode = "join" | "create";

export default function LeagueGate({
  onJoined,
}: {
  onJoined: (league: League) => void;
}) {
  const [mode, setMode] = useState<Mode>("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const league = await endpoints.joinLeague(code.trim());
      onJoined(league);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not join league");
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const seasons = await endpoints.seasons();
      const active = seasons.find((s) => s.active);
      if (!active) {
        setError("No active season yet — ask an admin to start one.");
        return;
      }
      const league = await endpoints.createLeague(name.trim(), active.id);
      onJoined(league);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create league");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">The Great British</p>
        <h1>
          Bake Off <em>Fantasy League</em>
        </h1>

        {mode === "join" && (
          <>
            <h2 className="section-title">Join a league</h2>
            <form onSubmit={join} className="auth-form">
              <label>
                Invite code
                <input value={code} onChange={(e) => setCode(e.target.value)} required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={busy}>
                {busy ? "Joining…" : "Join league"}
              </button>
            </form>
          </>
        )}

        {mode === "create" && (
          <>
            <h2 className="section-title">Create a league</h2>
            <form onSubmit={create} className="auth-form">
              <label>
                League name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create league"}
              </button>
            </form>
          </>
        )}

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setError(null);
            setMode(mode === "join" ? "create" : "join");
          }}
        >
          {mode === "join" ? "Starting fresh? Create a league" : "Have a code? Join a league"}
        </button>
      </div>
    </div>
  );
}
