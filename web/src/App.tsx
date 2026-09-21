import { useEffect, useState } from "react";
import "./App.css";
import { endpoints, setToken, type League, type User } from "./api";
import Login from "./components/Login";
import LeagueGate from "./components/LeagueGate";
import MakePicks from "./components/MakePicks";
import Standings from "./components/Standings";
import Bakers from "./components/Bakers";
import Admin from "./components/admin/Admin";

type Tab = "picks" | "standings" | "bakers" | "admin";

function loadStoredUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [tab, setTab] = useState<Tab>("picks");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (user) endpoints.myLeagues().then(setLeagues);
  }, [user]);

  // Admin status comes from the server (it is set by configuration), not the
  // stored login, so it is always current. The server enforces it either way.
  useEffect(() => {
    if (user) endpoints.me().then((me) => setIsAdmin(me.is_admin));
  }, [user]);

  function logOut() {
    // End the session on the server too; the local sign-out happens regardless.
    endpoints.logout().catch(() => {});
    setToken(null);
    setUser(null);
    setLeagues(null);
    setIsAdmin(false);
    setTab("picks");
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">The Great British</p>
          <h1>
            Bake Off <em>Fantasy League</em>
          </h1>
        </div>
        <div className="header-right">
          <button className="link-button" onClick={logOut}>
            Log out
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "picks" ? "active" : ""} onClick={() => setTab("picks")}>
          Make Picks
        </button>
        <button
          className={tab === "standings" ? "active" : ""}
          onClick={() => setTab("standings")}
        >
          Standings
        </button>
        <button className={tab === "bakers" ? "active" : ""} onClick={() => setTab("bakers")}>
          Bakers
        </button>
        {isAdmin && (
          <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
            Admin
          </button>
        )}
      </nav>

      <main>
        {tab === "picks" && <MakePicks />}
        {tab === "standings" &&
          (leagues === null ? (
            <p>Loading…</p>
          ) : leagues.length > 0 ? (
            <Standings leagues={leagues} currentUser={user} />
          ) : (
            <LeagueGate onJoined={(l) => setLeagues([l])} />
          ))}
        {tab === "bakers" && <Bakers />}
        {tab === "admin" && isAdmin && <Admin />}
      </main>
    </div>
  );
}
