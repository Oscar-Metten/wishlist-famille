"use client";
import { useEffect, useState } from "react";
export default function AccountsSection() {
  const [users, setUsers] = useState<
    { id: string; username: string; displayName: string; role: string }[]
  >([]);
  const [username, setUsername] = useState(""),
    [displayName, setDisplayName] = useState(""),
    [password, setPassword] = useState("");
  const [target, setTarget] = useState(""),
    [reset, setReset] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await fetch("/api/users");
    if (r.ok) setUsers((await r.json()).users);
  };
  useEffect(() => {
    load();
  }, []);
  const submit = async (e: React.FormEvent, method: "POST" | "PATCH") => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "POST"
            ? { username, displayName, password }
            : { id: target, password: reset },
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (method === "POST") {
        setUsername("");
        setDisplayName("");
        setPassword("");
        setMessage(
          "Compte créé avec une première liste privée. Transmettez les identifiants à cette personne.",
        );
      } else {
        setReset("");
        setMessage(
          "Mot de passe remplacé. Les anciennes sessions sont déconnectées.",
        );
      }
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const input = "border rounded p-2 dark:bg-gray-800 min-w-0";
  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-2">Comptes de la famille</h2>
      <p className="text-sm text-gray-500 mb-4">
        Chaque personne gère uniquement ses propres listes. Les visiteurs
        peuvent réserver sans compte.
      </p>
      <ul className="mb-5 space-y-1">
        {users.map((u) => (
          <li key={u.id}>
            {u.displayName}{" "}
            <span className="text-sm text-gray-500">
              (@{u.username}
              {u.role === "admin" ? " · administrateur" : ""})
            </span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => submit(e, "POST")}
        className="grid sm:grid-cols-2 gap-3"
      >
        <label className="grid gap-1">
          Prénom ou nom affiché
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={input}
          />
        </label>
        <label className="grid gap-1">
          Identifiant
          <input
            required
            minLength={3}
            pattern="[a-z0-9][a-z0-9_-]{2,39}"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={input}
          />
        </label>
        <label className="grid gap-1">
          Mot de passe initial (12 caractères minimum)
          <input
            type="password"
            required
            minLength={12}
            maxLength={1024}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <button
          disabled={busy}
          className="self-end rounded bg-indigo-600 text-white p-2 disabled:opacity-50"
        >
          Créer le compte et sa liste
        </button>
      </form>
      <details className="mt-5">
        <summary className="cursor-pointer">
          Réinitialiser le mot de passe d’un compte
        </summary>
        <form
          onSubmit={(e) => submit(e, "PATCH")}
          className="grid sm:grid-cols-3 gap-3 mt-3"
        >
          <label className="grid gap-1">
            Compte
            <select
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={input}
            >
              <option value="">Choisir…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Nouveau mot de passe
            <input
              type="password"
              required
              minLength={12}
              maxLength={1024}
              autoComplete="new-password"
              value={reset}
              onChange={(e) => setReset(e.target.value)}
              className={input}
            />
          </label>
          <button
            disabled={busy}
            className="self-end border rounded p-2 disabled:opacity-50"
          >
            Réinitialiser
          </button>
        </form>
      </details>
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
    </section>
  );
}
