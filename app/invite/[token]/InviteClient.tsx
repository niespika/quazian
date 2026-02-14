"use client";

import { FormEvent, useEffect, useState } from "react";

export function InviteClient({ token }: { token: string }) {
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) {
        setMessage("Invitation is invalid or expired.");
        return;
      }
      const data = await res.json();
      setName(data.name ?? null);
      setEmail(data.email ?? null);
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setMessage(res.ok ? "Account activated. You can now log in at /student/login." : "Could not activate account.");
  }

  return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-2xl font-bold">Student invitation</h1>
      {name && email && <p>Welcome {name} ({email})</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded p-2" type="password" placeholder="Set your password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        <button className="bg-black text-white rounded px-4 py-2">Activate account</button>
      </form>
      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
