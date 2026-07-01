import React, { Component } from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * Standard React class-based Error Boundary to catch client runtime exceptions
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Error Boundary caught crash]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
            
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-xl font-bold text-white">Something went wrong</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              An unexpected rendering exception occurred in this interface component.
            </p>
            
            <div className="pt-2 flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Reload Application
              </button>
              <a
                href="/"
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold rounded-lg text-xs transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
