"use client";

import { FormEvent, useState } from "react";

type ConceptRow = {
  id: string;
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string[];
  dateSeen: string;
};

type ConceptsManagerProps = {
  concepts: ConceptRow[];
};

type ConceptForm = {
  subject: string;
  title: string;
  correctAnswer: string;
  distractors: string;
  dateSeen: string;
};

const emptyForm: ConceptForm = {
  subject: "",
  title: "",
  correctAnswer: "",
  distractors: "",
  dateSeen: "",
};

function toFormValues(concept: ConceptRow): ConceptForm {
  return {
    subject: concept.subject,
    title: concept.title,
    correctAnswer: concept.correctAnswer,
    distractors: concept.distractors.join("\n"),
    dateSeen: concept.dateSeen.slice(0, 10),
  };
}

export function ConceptsManager({ concepts }: ConceptsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ConceptForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const isEditing = editingId !== null;

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      ...form,
      distractors: form.distractors
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const endpoint = isEditing ? `/api/prof/concepts/${editingId}` : "/api/prof/concepts";
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Unable to save concept.");
      return;
    }

    window.location.reload();
  }

  async function removeConcept(conceptId: string) {
    setError(null);
    const response = await fetch(`/api/prof/concepts/${conceptId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Unable to delete concept.");
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">{isEditing ? "Edit Concept" : "Create Concept"}</h2>
        <form className="mt-4 space-y-3" onSubmit={submitForm}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Subject
              <input
                className="mt-1 w-full rounded border p-2"
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </label>
            <label className="text-sm">
              Date seen
              <input
                type="date"
                className="mt-1 w-full rounded border p-2"
                value={form.dateSeen}
                onChange={(event) => setForm((prev) => ({ ...prev, dateSeen: event.target.value }))}
              />
            </label>
          </div>

          <label className="block text-sm">
            Title
            <input
              className="mt-1 w-full rounded border p-2"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>

          <label className="block text-sm">
            Correct answer
            <input
              className="mt-1 w-full rounded border p-2"
              value={form.correctAnswer}
              onChange={(event) => setForm((prev) => ({ ...prev, correctAnswer: event.target.value }))}
            />
          </label>

          <label className="block text-sm">
            Distractors (one per line, minimum 9)
            <textarea
              className="mt-1 h-36 w-full rounded border p-2"
              value={form.distractors}
              onChange={(event) => setForm((prev) => ({ ...prev, distractors: event.target.value }))}
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
              {isEditing ? "Save" : "Create"}
            </button>
            {isEditing ? (
              <button
                type="button"
                className="rounded border px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Date seen</th>
              <th className="p-2 text-left">Subject</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Correct answer</th>
              <th className="p-2 text-left">Distractors</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {concepts.map((concept) => (
              <tr key={concept.id} className="border-b align-top">
                <td className="p-2">{new Date(concept.dateSeen).toLocaleDateString()}</td>
                <td className="p-2">{concept.subject}</td>
                <td className="p-2">{concept.title}</td>
                <td className="p-2">{concept.correctAnswer}</td>
                <td className="p-2">{concept.distractors.length}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      onClick={() => {
                        setEditingId(concept.id);
                        setForm(toFormValues(concept));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-red-700"
                      onClick={() => removeConcept(concept.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
