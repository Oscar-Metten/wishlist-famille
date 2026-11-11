"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
export default function PasswordSection() {
  const [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  return (
    <details className="bg-white dark:bg-gray-800 rounded-xl border p-5 mb-6">
      <summary className="cursor-pointer font-semibold">
        Changer mon mot de passe
      </summary>
      <form
        className="grid sm:grid-cols-3 gap-3 mt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await fetch("/api/auth/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, password }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            await logout();
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="grid gap-1">
          Mot de passe actuel
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            className="border rounded p-2 dark:bg-gray-900"
          />
        </label>
        <label className="grid gap-1">
          Nouveau mot de passe
          <input
            required
            minLength={12}
            maxLength={1024}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded p-2 dark:bg-gray-900"
          />
        </label>
        <button disabled={busy} className="border rounded p-2 self-end">
          Enregistrer et me reconnecter
        </button>
      </form>
      <p role="status" className="mt-2">
        {message}
      </p>
    </details>
  );
}
