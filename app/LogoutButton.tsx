"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={onLogout} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
      Log out
    </button>
  );
}
