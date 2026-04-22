/**
 * Authentication Service with comprehensive error handling
 * Handles Google OAuth popup issues and provides detailed debugging
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  Auth,
  User,
  UserCredential,
} from "firebase/auth";

export interface AuthServiceError extends Error {
  code?: string;
  message: string;
}

export class AuthService {
  private static instance: AuthService;
  private auth: Auth;
  private isAuthenticating = false;

  private constructor(auth: Auth) {
    this.auth = auth;
  }

  static getInstance(auth: Auth): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(auth);
    }
    return AuthService.instance;
  }

  /**
   * Sign in with Google OAuth - with comprehensive error handling
   */
  async signInWithGoogle(): Promise<UserCredential | null> {
    // Prevent multiple simultaneous auth attempts
    if (this.isAuthenticating) {
      console.warn("Authentication already in progress");
      throw new Error("Authentication already in progress. Please wait.");
    }

    this.isAuthenticating = true;

    try {
      const provider = new GoogleAuthProvider();

      // Configure provider for better popup behavior
      provider.setCustomParameters({
        prompt: "select_account", // Allow user to select account
        login_hint: "", // Let user choose account
      });

      // Add scopes for additional functionality
      provider.addScope("profile");
      provider.addScope("email");

      console.log("🔐 Initiating Google OAuth sign-in...");

      // Attempt popup sign-in
      const result = await signInWithPopup(this.auth, provider);

      console.log(
        "✅ Successfully signed in:",
        result.user.email,
        result.user.displayName
      );

      this.isAuthenticating = false;
      return result;
    } catch (error: any) {
      this.isAuthenticating = false;

      // Log full error for debugging
      console.error("❌ Google Sign-in Error:", error);
      console.error("Error Code:", error.code);
      console.error("Error Message:", error.message);

      // Handle specific error codes
      const errorMessage = this.getHumanReadableError(error);
      console.error("User-friendly message:", errorMessage);

      // Re-throw with detailed message
      const customError = new Error(errorMessage);
      (customError as any).code = error.code;
      throw customError;
    }
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getHumanReadableError(error: any): string {
    const errorCode = error?.code || "";
    const errorMsg = error?.message || "Unknown error occurred";

    console.log(`📋 Error Code: ${errorCode}`);

    switch (errorCode) {
      case "auth/popup-blocked":
        return (
          "Popup blocker detected. Please allow popups for this site:\n" +
          "1. Check your browser's popup blocker\n" +
          "2. Add localhost:3000 to allowed sites\n" +
          "3. Try again"
        );

      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";

      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled. Please try again.";

      case "auth/network-request-failed":
        return (
          "Network error. Check your internet connection and try again.\n" +
          "Make sure you can reach: accounts.google.com"
        );

      case "auth/operation-not-allowed":
        return (
          "Google Sign-in is not enabled for this Firebase project.\n" +
          "This needs to be configured in Firebase Console:\n" +
          "1. Go to Firebase Console\n" +
          "2. Authentication → Sign-in method\n" +
          "3. Enable Google provider"
        );

      case "auth/operation-not-supported-in-this-environment":
        return (
          "Authentication popups are not supported in this environment.\n" +
          "Please check your browser settings and security restrictions."
        );

      case "auth/internal-error":
        return (
          "Internal Firebase error. This might be a configuration issue.\n" +
          "Check Firebase console for any errors."
        );

      case "auth/invalid-api-key":
        return (
          "Invalid Firebase API key configuration.\n" +
          "Please check your Firebase credentials in the .env file."
        );

      case "auth/domain-not-whitelisted":
        return (
          "This domain is not whitelisted in Firebase.\n" +
          "Add localhost:3000 to authorized domains in Firebase Console:\n" +
          "Settings → Authorized Domains"
        );

      default:
        return `Sign-in failed: ${errorMsg}\nError Code: ${errorCode}`;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      console.log("🚪 Signing out...");
      await firebaseSignOut(this.auth);
      console.log("✅ Successfully signed out");
    } catch (error) {
      console.error("❌ Sign-out error:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}

export default AuthService;
