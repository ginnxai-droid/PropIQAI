import { Link } from "react-router-dom";

export function NotFoundView() {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link to="/" className="mt-3 inline-block text-sm text-indigo-400">
          Return to PropIQ AI
        </Link>
      </div>
    </main>
  );
}
