"use client";

/**
 * useAdminAuth
 * 参照：詳細設計書 4章 認証・権限方針（Custom Tokenでのサインイン）
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut, User } from "firebase/auth";
import { auth } from "./firebase-client";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isLoading };
}

export async function signInAdminWithCustomToken(customToken: string) {
  await signInWithCustomToken(auth, customToken);
}

export async function signOutAdmin() {
  await signOut(auth);
}
