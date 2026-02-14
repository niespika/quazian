"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type InvalidRow = {
  row: number;
  reason: string;
};

type InvitationLink = {
  email: string;
  link: string;
};

type ImportSummary = {
  created: number;
  updated: number;
  invalidRows: InvalidRow[];
  invitationLinks?: InvitationLink[];
};

export function ImportCsvSection({ initialSummary }: { initialSummary?: ImportSummary | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(initialSummary ?? null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/prof/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      setSummary(data);
      router.refresh();
    } catch {
      setError("Import failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded border p-4 space-y-3">
      <h2 className="text-lg font-semibold">Import CSV</h2>
      <p className="text-sm text-gray-700">Upload a file with headers: name,class,email</p>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded border p-2 text-sm"
        />
        <button type="submit" disabled={isSubmitting} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50">
          {isSubmitting ? "Importing..." : "Import"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {summary ? (
        <div className="space-y-2 text-sm">
          <p>Created: {summary.created}</p>
          <p>Updated: {summary.updated}</p>

          {summary.invalidRows.length > 0 ? (
            <div>
              <p className="font-medium">Invalid rows</p>
              <ul className="list-disc pl-5">
                {summary.invalidRows.map((row) => (
                  <li key={`${row.row}-${row.reason}`}>
                    Row {row.row}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No invalid rows.</p>
          )}

          {summary.invitationLinks && summary.invitationLinks.length > 0 ? (
            <div>
              <p className="font-medium">Invitation links</p>
              <ul className="list-disc pl-5">
                {summary.invitationLinks.map((item) => (
                  <li key={item.email}>
                    {item.email}: <code>{item.link}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
