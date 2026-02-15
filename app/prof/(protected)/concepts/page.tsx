import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getProfessorConceptClasses, listProfessorConcepts } from "@/lib/prof-concepts";
import { ConceptsManager } from "./ConceptsManager";

type PageProps = {
  searchParams: Promise<{
    classId?: string;
    search?: string;
    subject?: string;
    sort?: string;
  }>;
};

export default async function ProfConceptsPage({ searchParams }: PageProps) {
  const session = await requireRole(Role.PROF);
  if (!session) {
    redirect("/prof/login");
  }

  const [{ classId, search, subject, sort }, classContext] = await Promise.all([
    searchParams,
    getProfessorConceptClasses(session.userId),
  ]);

  const effectiveSort = sort === "dateSeenAsc" ? "dateSeenAsc" : "dateSeenDesc";
  const effectiveClassId = classId?.trim() ? classId : undefined;

  const concepts = await listProfessorConcepts({
    profId: session.userId,
    classId: effectiveClassId,
    search,
    subject,
    sort: effectiveSort,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Concepts Management</h1>

      <form className="rounded border p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            Class
            <select name="classId" defaultValue={effectiveClassId ?? ""} className="mt-1 w-full rounded border p-2">
              <option value="">All classes</option>
              {classContext.classes.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm md:col-span-2">
            Search by title
            <input name="search" defaultValue={search ?? ""} className="mt-1 w-full rounded border p-2" />
          </label>

          <label className="text-sm">
            Subject
            <input name="subject" defaultValue={subject ?? ""} className="mt-1 w-full rounded border p-2" />
          </label>

          <label className="text-sm">
            Sort
            <select name="sort" defaultValue={effectiveSort} className="mt-1 w-full rounded border p-2">
              <option value="dateSeenDesc">Date seen (newest)</option>
              <option value="dateSeenAsc">Date seen (oldest)</option>
            </select>
          </label>
        </div>
        <button type="submit" className="mt-3 rounded bg-black px-4 py-2 text-sm text-white">
          Apply
        </button>
      </form>

      <ConceptsManager
        concepts={concepts}
        classes={classContext.classes}
        defaultClassId={classContext.mostRecentClassId ?? classContext.classes[0]?.id ?? ""}
      />
    </main>
  );
}
