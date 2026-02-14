import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/app/LogoutButton";

export default async function ProfessorProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.PROF);
  if (!session) {
    redirect("/prof/login");
  }

  return (
    <div>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-8 py-4">
        <p className="text-sm font-semibold">Professor Area</p>
        <LogoutButton redirectTo="/prof/login" />
      </header>
      {children}
    </div>
  );
}
