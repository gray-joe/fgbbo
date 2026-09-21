import { useState } from "react";
import { ApiError, endpoints, type Contestant, type Season } from "../../api";
import type { SeasonData } from "./Admin";

type Pending =
  | { kind: "activate"; season: Season }
  | { kind: "end"; season: Season }
  | { kind: "remove"; baker: Contestant };

export default function AdminSeason({
  seasons,
  season,
  data,
  reloadSeasons,
  reloadData,
}: {
  seasons: Season[];
  season: Season | null;
  data: SeasonData | null;
  reloadSeasons: () => Promise<void>;
  reloadData: () => Promise<void>;
}) {
  const [seasonName, setSeasonName] = useState("");
  const [makeActive, setMakeActive] = useState(false);
  const [bakerName, setBakerName] = useState("");
  const [renaming, setRenaming] = useState<Contestant | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(done);
      setPending(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const createSeason = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await endpoints.createSeason({ name: seasonName.trim(), active: makeActive });
      setSeasonName("");
      setMakeActive(false);
      await reloadSeasons();
    }, makeActive ? "Season created and made active." : "Season created.");
  };

  const confirmPending = () => {
    const p = pending!;
    if (p.kind === "remove") {
      return run(async () => {
        await endpoints.deleteContestant(p.baker.id);
        await reloadData();
      }, "Baker removed.");
    }
    return run(async () => {
      await endpoints.updateSeason(p.season.id, { active: p.kind === "activate" });
      await reloadSeasons();
    }, p.kind === "activate" ? "Season is now active." : "Season ended.");
  };

  const addBaker = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await endpoints.createContestant({ name: bakerName.trim(), season_id: season!.id });
      setBakerName("");
      await reloadData();
    }, "Baker added.");
  };

  const saveRename = () =>
    run(async () => {
      const baker = renaming!;
      if (newName.trim() !== baker.name) {
        await endpoints.updateContestant(baker.id, { name: newName.trim() });
        await reloadData();
      }
      setRenaming(null);
    }, "Baker renamed.");

  return (
    <div className="admin-panel">
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

      <h3>Seasons</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Season</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {[...seasons].reverse().map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.active ? "Active" : "Not active"}</td>
              <td className="row-actions">
                {s.active ? (
                  <button
                    className="link-button"
                    aria-label={`End ${s.name}`}
                    onClick={() => setPending({ kind: "end", season: s })}
                  >
                    End season
                  </button>
                ) : (
                  <button
                    className="link-button"
                    aria-label={`Make ${s.name} active`}
                    onClick={() => setPending({ kind: "activate", season: s })}
                  >
                    Make active
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pending && pending.kind !== "remove" && (
        <div className="confirm-box admin-form" role="group" aria-label="Confirm season change">
          <p>
            {pending.kind === "activate"
              ? season
                ? `Make ${pending.season.name} the active season? ${season.name} will stop being active, and members will see ${pending.season.name} from now on.`
                : `Make ${pending.season.name} the active season?`
              : `End ${pending.season.name}? Members will see no active season until you make one active.`}
          </p>
          <div className="button-row">
            <button className="save-button" disabled={busy} onClick={confirmPending}>
              {pending.kind === "activate" ? "Confirm and activate" : "Confirm and end"}
            </button>
            <button className="link-button" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <form className="admin-form" onSubmit={createSeason}>
        <h3>Create a season</h3>
        <label>
          Season name
          <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} required />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={makeActive}
            onChange={(e) => setMakeActive(e.target.checked)}
          />
          Make it the active season
        </label>
        <div className="button-row">
          <button className="save-button" type="submit" disabled={busy}>
            Create season
          </button>
        </div>
      </form>

      <h3>Bakers{season ? `: ${season.name}` : ""}</h3>
      {!season && <p className="subtitle">Make a season active to manage its bakers.</p>}
      {season && (
        <>
          <form className="admin-form" onSubmit={addBaker}>
            <label>
              Baker name
              <input value={bakerName} onChange={(e) => setBakerName(e.target.value)} required />
            </label>
            <div className="button-row">
              <button className="save-button" type="submit" disabled={busy}>
                Add baker
              </button>
            </div>
          </form>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Baker</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...(data?.contestants ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      {renaming?.id === c.id ? (
                        <input
                          aria-label={`Name for ${c.name}`}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>{c.eliminated ? "Eliminated" : "Still baking"}</td>
                    <td className="row-actions">
                      {renaming?.id === c.id ? (
                        <>
                          <button className="link-button" disabled={busy} onClick={saveRename}>
                            Save
                          </button>
                          <button className="link-button" onClick={() => setRenaming(null)}>
                            Cancel
                          </button>
                        </>
                      ) : pending?.kind === "remove" && pending.baker.id === c.id ? (
                        <>
                          <button
                            className="link-button danger"
                            disabled={busy}
                            onClick={confirmPending}
                          >
                            Confirm remove
                          </button>
                          <button className="link-button" onClick={() => setPending(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="link-button"
                            aria-label={`Rename ${c.name}`}
                            onClick={() => {
                              setRenaming(c);
                              setNewName(c.name);
                              setPending(null);
                              setMessage(null);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="link-button danger"
                            aria-label={`Remove ${c.name}`}
                            onClick={() => {
                              setPending({ kind: "remove", baker: c });
                              setRenaming(null);
                              setMessage(null);
                            }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
