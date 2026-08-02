// components/ErrorBoundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center max-w-sm">
            {/* Icon */}
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
              Something went wrong
            </h2>

            {/* Message */}
            <p className="text-sm text-slate-500 leading-relaxed mb-7">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {/* Action */}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh page
            </button>

            {/* Optional: show error in dev */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-6 text-left text-[11px] text-red-600/80 bg-red-50 rounded-xl p-3 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}