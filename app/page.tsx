export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Quazian Auth Prototype</h1>
      <p>Use the links below to test professor/student auth and invitation flows.</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><a className="underline" href="/prof/login">Professor login</a></li>
        <li><a className="underline" href="/prof/students">Professor students dashboard</a></li>
        <li><a className="underline" href="/student/login">Student login</a></li>
      </ul>
    </main>
  );
}
