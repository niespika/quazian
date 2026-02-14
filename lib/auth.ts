import { Role } from "@prisma/client";
import { getSession } from "@/lib/session";

export async function requireRole(role: Role) {
  const session = await getSession();
  if (!session || session.role !== role) {
    return null;
  }

  return session;
}
