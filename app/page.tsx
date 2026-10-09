import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <div className="card">
        <h1>Venviewer</h1>
        <p>Open a published virtual tour using its direct link.</p>
        <Link href="/admin/login">Admin login</Link>
      </div>
    </main>
  );
}
