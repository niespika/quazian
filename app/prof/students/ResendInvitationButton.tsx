"use client";

import { useState } from "react";

type Props = {
  studentId: string;
};

export function ResendInvitationButton({ studentId }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function resendInvitation() {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/prof/students/${studentId}/resend`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to resend invitation");
        return;
      }

      setLink(data.invitationLink);
    } catch {
      setError("Failed to resend invitation");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={resendInvitation}
        className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
      >
        {isSubmitting ? "Resending..." : "Resend Invitation"}
      </button>
      {link ? (
        <p className="text-xs">
          New invite link: <code>{link}</code>
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
