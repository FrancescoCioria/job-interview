import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  mock?: boolean;
}

export function Layout({ children, mock }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="font-semibold text-sm">Deployment Inspector</span>
            </Link>
            <span className="text-xs text-gray-400">Toolforge</span>
          </div>
        </div>
      </header>

      {mock && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-1.5">
            <p className="text-xs text-amber-700 text-center">
              Demo mode — showing sample data
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
