import { useState } from "react";
import { ApiError, endpoints, setToken, type User } from "../api";

type Step = "signup" | "email" | "code";

export default function Login({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await endpoints.signup(name, email);
      await endpoints.requestLoginCode(email);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await endpoints.requestLoginCode(email);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token, user } = await endpoints.verifyLoginCode(email, code);
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
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

        {step === "signup" && (
          <form onSubmit={submitSignup} className="auth-form">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Please wait…" : "Create account"}
            </button>
          </form>
        )}

        {step === "email" && (
          <form onSubmit={submitEmail} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send login code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={submitCode} className="auth-form">
            <p className="subtitle">
              Enter the 6-digit code sent to {email}.
            </p>
            <label>
              Code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoFocus
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Log in"}
            </button>
          </form>
        )}

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setError(null);
            setCode("");
            setStep(step === "signup" ? "email" : "signup");
          }}
        >
          {step === "signup" ? "Have an account? Log in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
