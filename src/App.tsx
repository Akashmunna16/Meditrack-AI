/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "./firebase";
import AuthService from "./services/AuthService";
import Navbar from "./components/Navbar";
import ReportAnalyzer from "./components/ReportAnalyzer";
import PatientDashboard from "./components/PatientDashboard";
import MedChat from "./components/MedChat";
import ErrorBoundary from "./components/ErrorBoundary";
import AlertSystem from "./components/AlertSystem";
import AuthErrorDisplay from "./components/AuthErrorDisplay";
import { Activity, ShieldCheck, Heart, LogIn, Loader } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authService = AuthService.getInstance(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Clear error when auth state changes
      if (currentUser) {
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    // Prevent multiple sign-in attempts
    if (signingIn) return;

    setSigningIn(true);
    setAuthError(null);

    try {
      await authService.signInWithGoogle();
      // Success - user state will be updated via onAuthStateChanged
      setSigningIn(false);
    } catch (error: any) {
      setSigningIn(false);
      // Set error message for display
      const errorMessage = error?.message || "An unknown error occurred during sign-in";
      setAuthError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-900 font-sans">
        <Activity className="animate-pulse text-emerald-600 size-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthErrorDisplay 
          error={authError} 
          onDismiss={() => setAuthError(null)} 
        />
        <div className="min-h-screen grid lg:grid-cols-2 bg-natural-bg font-sans">
        <div className="hidden lg:flex flex-col justify-center p-24 bg-emerald-950 text-stone-50 transition-all">
          <div className="mb-8 flex items-center gap-2">
            <Heart className="text-emerald-400 size-10 fill-emerald-400" />
            <h1 className="text-4xl font-semibold tracking-tight font-serif text-white">Meditrack-AI</h1>
          </div>
          <p className="text-2xl font-light leading-relaxed opacity-80 font-sans">
            Intelligent medical management at your fingertips. Analyze reports, track patient history, and consult AI insights with production-grade security.
          </p>
        </div>
        <div className="flex items-center justify-center p-8 bg-natural-bg">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="lg:hidden flex justify-center mb-8">
               <Heart className="text-natural-accent size-12 fill-natural-accent" />
            </div>
            <h2 className="text-4xl font-semibold text-natural-text font-serif">Welcome Back</h2>
            <p className="text-natural-muted">Access your healthcare dashboard through secure Google authentication.</p>
            <button
              onClick={login}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-natural-text text-white rounded-xl hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg group font-sans"
            >
              {signingIn ? (
                <>
                  <Loader className="size-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="size-5 group-hover:translate-x-1 transition-transform" />
                  Sign in with Google
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-natural-muted">
               <ShieldCheck className="size-4" />
               <span>HIPAA-inspired data encryption protocols active</span>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-natural-bg text-natural-text font-sans overflow-hidden">
        <Navbar user={user} onSignOut={() => signOut(auth)} />
        <main className="flex-1 h-screen overflow-y-auto p-6 md:p-10 selection:bg-natural-accent/20">
          <header className="flex justify-end mb-6 max-w-6xl mx-auto">
             <AlertSystem user={user} />
          </header>
          <div className="max-w-6xl mx-auto">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<ReportAnalyzer user={user} />} />
                <Route path="/patients" element={<PatientDashboard user={user} />} />
                <Route path="/chat" element={<MedChat user={user} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </Router>
  );
}

