import { useState, type FormEvent } from "react";
import { Building2, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginView() {
  const { configured, signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Sign-in failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await requestPasswordReset(email);
      setMessage("Password reset instructions have been sent.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Password reset failed.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-2xl shadow-2xl p-7">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PropIQ AI</h1>
            <p className="text-xs text-zinc-500">Secure organization sign-in</p>
          </div>
        </div>

        {!configured && (
          <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            Supabase is not configured. Set `VITE_SUPABASE_URL` and
            `VITE_SUPABASE_ANON_KEY` in an ignored local environment file.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-zinc-300">
            Email
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-zinc-300">
            Password
            <div className="relative mt-1.5">
              <LockKeyhole className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!configured || submitting}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={!configured}
            className="w-full text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </main>
  );
}
