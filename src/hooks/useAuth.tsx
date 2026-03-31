"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Map Firebase error codes to user-friendly messages */
function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Email or password is incorrect";
    case "auth/email-already-in-use":
      return "User already exists. Please sign in";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/network-request-failed":
      return "Network error. Check your connection";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed";
    default:
      return "Something went wrong. Please try again";
  }
}

async function saveUserToFirestore(user: User, additionalData?: { displayName?: string }) {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await setDoc(userRef, {
        displayName: additionalData?.displayName || user.displayName || user.email?.split("@")[0] || "",
        email: user.email,
        plan: "free",
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error saving user to Firestore", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (
        firebaseUser &&
        !firebaseUser.emailVerified &&
        firebaseUser.providerData.some((p) => p.providerId === "password")
      ) {
        setUser(null);
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (!result.user.emailVerified) {
          await firebaseSignOut(auth);
          return { error: "Please verify your email address before logging in. Check your inbox." };
        }
        await saveUserToFirestore(result.user);
        return { error: null };
      } catch (err: any) {
        return { error: getAuthErrorMessage(err?.code) };
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string = "") => {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName) {
          await updateProfile(result.user, { displayName: fullName });
        }
        await saveUserToFirestore(result.user, { displayName: fullName });
        
        await sendEmailVerification(result.user);
        await firebaseSignOut(auth);
        
        return { error: null };
      } catch (err: any) {
        return { error: getAuthErrorMessage(err?.code) };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      return { error: null };
    } catch (err: any) {
      return { error: getAuthErrorMessage(err?.code) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err: any) {
      return { error: getAuthErrorMessage(err?.code) };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
