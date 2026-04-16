import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected clinical error occurred.";
      let isPermissionError = false;

      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("permission-denied")) {
          errorMessage = "Security clearance check failed. Access to these medical records is restricted.";
          isPermissionError = true;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-natural-card max-w-md w-full p-8 md:p-10 rounded-[40px] border border-black/5 shadow-2xl space-y-8 text-center">
            <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-serif font-bold text-natural-text">Protocol Breach</h2>
              <p className="text-natural-muted font-medium text-[15px] leading-relaxed">
                {errorMessage}
                {isPermissionError && (
                  <span className="block mt-4 text-[13px] opacity-75">
                    Ensure your biometric profile (Account) has the required authorization for this patient registry.
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-natural-text text-white rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all font-bold uppercase tracking-widest text-[11px]"
            >
              <RefreshCcw size={16} className="text-natural-accent" />
              Re-initialize Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
