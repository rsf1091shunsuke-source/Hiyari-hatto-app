"use client";

import { useEffect, useState } from "react";
import { query, where, onSnapshot, limit } from "firebase/firestore";
import { yearsCol } from "./collections";
import { Year } from "@/types/firestore";

export function useCurrentYear() {
  const [year, setYear] = useState<Year | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(yearsCol, where("isActive", "==", true), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setYear(snapshot.empty ? null : snapshot.docs[0].data());
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { year, isLoading };
}
