import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { ProfessorStudentRow, getProfessorClasses, getProfessorStudents } from "@/lib/prof-students";
import { ResendInvitationButton } from "./ResendInvitationButton";

type PageProps = {
  searchParams: Promise<{
    classId?: string;
  }>;
};

type ClassOption = {
  id: string;
  name: string;
};

export function ProfStudentsPageContent({
  classId,
  classes,
  students,
}: {
  classId?: string;
  classes: ClassOption[];
  students: ProfessorStudentRow[];
}) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Students Management</h1>

      <form className="rounded border p-4">
        <label htmlFor="classId" className="mb-2 block text-sm font-medium">
          Filter by class
        </label>
        <div className="flex items-center gap-2">
          <select id="classId" name="classId" defaultValue={classId ?? ""} className="rounded border p-2 text-sm">
            <option value="">All classes</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
            Apply
          </button>
        </div>
      </form>

      <section>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Class</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b align-top">
                <td className="p-2">{student.name}</td>
                <td className="p-2">{student.className}</td>
                <td className="p-2">{student.email}</td>
                <td className="p-2">{student.status}</td>
                <td className="p-2">
                  {student.status === "invited" ? (
                    <ResendInvitationButton studentId={student.id} />
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default async function ProfStudentsPage({ searchParams }: PageProps) {
  const session = await requireRole(Role.PROF);
  if (!session) {
    redirect("/prof/login");
  }

  const { classId } = await searchParams;
  const [classes, students] = await Promise.all([
    getProfessorClasses(session.userId),
    getProfessorStudents(session.userId, classId),
  ]);

  return <ProfStudentsPageContent classId={classId} classes={classes} students={students} />;
}
