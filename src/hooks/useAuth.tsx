import { useState, useEffect, useCallback } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata: Record<string, string>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a profile document in Firestore immediately
      await setDoc(doc(db, "profiles", user.uid), {
        user_id: user.uid,
        email: user.email,
        full_name: metadata.full_name || "",
        role: metadata.role || "citizen",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        points: 0,
        streak_days: 0,
        trust_score: 4.5,
      });

    } catch (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  }, []);

  return { ...state, signIn, signUp, signOut, resetPassword };
}
