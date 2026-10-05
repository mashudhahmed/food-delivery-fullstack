'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Critical Application Error</h2>
          <p className="text-sm text-gray-500 mb-6">
            A fatal error occurred. Please refresh or try again in a few moments.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
