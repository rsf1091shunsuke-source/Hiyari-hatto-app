"use client";

import { useEffect, useState } from "react";
import { query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { yearsCol } from "./collections";
import { Year } from "@/types/firestore";

export function useCurrentYear() {
  const [year, setYear] = useState<Year | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // isActive:trueが複数存在する状態（データ不整合）でも、orderByが無いと
    // Firestoreがどれを返すかは不定で、アクセスのたびに違う年度に切り替わりうる。
    // startDateが最も新しいものを常に選ぶことで、少なくとも挙動を安定させる。
    const q = query(yearsCol, where("isActive", "==", true), orderBy("startDate", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setYear(snapshot.empty ? null : snapshot.docs[0].data());
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { year, isLoading };
}
