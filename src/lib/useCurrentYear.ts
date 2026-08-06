"use client";

import { useEffect, useState } from "react";
import { query, where, onSnapshot, limit } from "firebase/firestore";
import { yearsCol } from "./collections";
import { Year } from "@/types/firestore";

export function useCurrentYear() {
  const [year, setYear] = useState<Year | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 「設定」画面の年度切替（この年度に切替）が、対象以外の年度のisActiveを
    // 必ずfalseにする実装になっているため、原則isActive:trueは常に1件のみになる。
    // orderByを組み合わせると複合索引が必要になり未作成だと取得自体が失敗するため、
    // 単純な等価条件のみで取得する（索引不要・より壊れにくい構成）。
    const q = query(yearsCol, where("isActive", "==", true), limit(1));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setYear(snapshot.empty ? null : snapshot.docs[0].data());
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { year, isLoading };
}
