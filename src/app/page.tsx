import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-primary">
      <h1 className="text-4xl font-bold text-white mb-4">
        Pierce Land &amp; Cattle
      </h1>
      <p className="text-white/70 text-lg mb-8">
        Stocker Heifer Business Plans
      </p>
      <Link
        href="/admin"
        className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-semibold"
      >
        Admin Dashboard
      </Link>
    </main>
  );
}
