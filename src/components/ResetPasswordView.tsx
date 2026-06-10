import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function ResetPasswordView() {
  const { loading, session } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(false);

  useEffect(() => {
    if (loading || session || !supabase) {
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      if (data.session) {
        setRecoveryChecked(false);
        return;
      }
      window.setTimeout(() => {
        if (active) {
          setRecoveryChecked(true);
        }
      }, 1_000);
    });
    return () => {
      active = false;
    };
  }, [loading, session]);

  if (loading || (!session && !recoveryChecked)) {
    return (
      <main className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center">
        Validating recovery link...
      </main>
    );
  }

  if (!session && recoveryChecked) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const { error: updateError } = await supabase!.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Password updated. You can return to the application.");
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="font-bold">Set a new password</h1>
        <input
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {message && <p className="text-xs text-emerald-400">{message}</p>}
        <button className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-bold">
          Update password
        </button>
      </form>
    </main>
  );
}
