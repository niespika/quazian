"use client";

import { FormEvent, useEffect, useState } from "react";

type Student = {
  id: string;
  name: string;
  email: string;
  className: string;
  status: string;
  invitationLink: string | null;
};

export default function ProfStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [links, setLinks] = useState<Array<{ name: string; email: string; link: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadStudents() {
    const res = await fetch("/api/prof/students");
    if (!res.ok) {
      setError("Unauthorized. Please log in as professor.");
      return;
    }
    const data = await res.json();
    setStudents(data.students);
  }

  useEffect(() => {
    let active = true;

    fetch("/api/prof/students")
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setError("Unauthorized. Please log in as professor.");
          return;
        }
        const data = await res.json();
        if (active) {
          setStudents(data.students);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load students");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/prof/students", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
      return;
    }

    const data = await res.json();
    setLinks(data.links);
    await loadStudents();
    e.currentTarget.reset();
  }

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <h1 className="text-2xl font-bold">Students import & invitations</h1>
      <form onSubmit={onUpload} className="space-y-3 border rounded p-4">
        <p className="text-sm text-gray-600">Upload CSV with header: name,class,email</p>
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button className="bg-black text-white rounded px-4 py-2">Import CSV</button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {links.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">New invitation links</h2>
          <ul className="space-y-1 text-sm">
            {links.map((item) => (
              <li key={item.email}>
                {item.name} ({item.email}): <code>{item.link}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Students</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Class</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Invitation link</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.className}</td>
                <td className="p-2">{s.email}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{s.invitationLink ? <code>{s.invitationLink}</code> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
