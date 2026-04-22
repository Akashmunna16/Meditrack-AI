import { AlertCircle, X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface AuthErrorDisplayProps {
  error: string | null;
  onDismiss: () => void;
}

export default function AuthErrorDisplay({
  error,
  onDismiss,
}: AuthErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isNetworkError = error.includes("Network error");
  const isPopupBlocked = error.includes("Popup blocker");
  const isConfigError = error.includes("Firebase");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200 px-6 py-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Sign-In Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {isPopupBlocked && "Popup Blocker Detected"}
                {isNetworkError && "Network Connection Issue"}
                {isConfigError && "Configuration Problem"}
                {!isPopupBlocked &&
                  !isNetworkError &&
                  !isConfigError &&
                  "Authentication Failed"}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 whitespace-pre-wrap font-mono">
              {error}
            </p>
          </div>

          {/* Quick Solutions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">
              Quick Solutions:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {isPopupBlocked && (
                <>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Check browser popup blocker settings</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Whitelist localhost:3000</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Try in incognito/private window</span>
                  </li>
                </>
              )}

              {isNetworkError && (
                <>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Check your internet connection</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Verify accounts.google.com is accessible</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Disable VPN/proxy if using one</span>
                  </li>
                </>
              )}

              {isConfigError && (
                <>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Go to Firebase Console</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Check Authentication settings</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Verify Google provider is enabled</span>
                  </li>
                </>
              )}

              {!isPopupBlocked && !isNetworkError && !isConfigError && (
                <>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Refresh the page</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>Clear browser cache and cookies</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Try again in a few moments</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Debug Info */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold mb-2">
              📋 Debug Information
            </p>
            <p className="text-xs text-gray-600 mb-2">
              This information has been logged to the browser console (F12).
              Share this if seeking help:
            </p>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied to clipboard
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy error to clipboard
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Retry Sign-In
          </button>
        </div>
      </div>
    </div>
  );
}
