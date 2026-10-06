import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-start justify-center gap-4 px-6">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="text-4xl font-semibold">This page swam away.</h1>
      <Link href="/" className="btn">
        Back home
      </Link>
    </main>
  );
}
