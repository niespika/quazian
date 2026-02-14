"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/prof/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Unable to log in");
      setLoading(false);
      return;
    }

    router.push("/prof/students");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-6">Professor login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="bg-black text-white rounded px-4 py-2" disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
      </form>
    </main>
  );
}
