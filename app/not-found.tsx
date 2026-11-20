import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-5xl font-extrabold text-brand">404</h1><p className="mt-2 text-zinc-400">Page not found.</p>
        <Link href="/" className="btn-primary mt-6">Go home</Link></div>
    </div>
  );
}
