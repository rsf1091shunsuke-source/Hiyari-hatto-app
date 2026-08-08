"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureAuth } from "@/lib/firebase";
import {
  StudyRecord,
  Understanding,
  addRecord,
  deleteRecord,
  ensureSettingsDocExists,
  setGoal,
  subscribeGoal,
  subscribeRecentRecords,
  subscribeReviewRecords,
  updateRecord,
} from "@/lib/records";

const SUBJECTS = ["数学", "英語", "国語", "理科", "社会", "その他"];
const SUBJECT_ICON: Record<string, string> = {
  数学: "📐",
  英語: "🔤",
  国語: "📖",
  理科: "🔬",
  社会: "🌍",
  その他: "✏️",
};
const DURATIONS = [15, 30, 45, 60, 90, 120];
const PRAISE = ["さすが！", "えらい！", "その調子✨", "一歩前進！", "ナイス集中力", "積み重なってるね", "記録した！"];
const WEEKDAY_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

type ModalState =
  | { mode: "add"; id?: undefined; subject: string; topic: string; minutes: number }
  | { mode: "edit"; id: string; subject: string; topic: string; minutes: number }
  | null;

function fmtHM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return { h, m };
}

function formatDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return formatDateStr(dt);
}

function weekdayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_LABEL[new Date(y, m - 1, d).getDay()];
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function randomPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}

function heroTimeParts(min: number) {
  return fmtHM(min);
}

type ConfettiPiece = { id: number; dx: string; dy: string; rot: string; color: string; delay: string };

export default function StudyTracker() {
  const todayStrRef = useRef(formatDateStr(new Date()));
  const todayStr = todayStrRef.current;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSlowHint, setShowSlowHint] = useState(false);

  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [reviewRecords, setReviewRecords] = useState<StudyRecord[]>([]);
  const [goalMinutes, setGoalMinutes] = useState(180);

  const [modal, setModal] = useState<ModalState>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);

  type TimerPhase = "idle" | "running" | "paused";
  const [timerPhase, setTimerPhase] = useState<TimerPhase>("idle");
  const [timerDisplayMs, setTimerDisplayMs] = useState(0);
  const timerAccumulatedRef = useRef(0);
  const timerRunStartRef = useRef<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [heroDisplay, setHeroDisplay] = useState(0);
  const prevTotalRef = useRef<number | null>(null);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const spawnConfetti = useCallback(() => {
    if (reduceMotion) return;
    const colors = ["#ef8354", "#7bc99a", "#ecd06f", "#eef0f4"];
    const pieces: ConfettiPiece[] = Array.from({ length: 14 }, (_, i) => {
      const angle = Math.random() * Math.PI + Math.PI;
      const dist = 60 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 20;
      return {
        id: i,
        dx: `${dx}px`,
        dy: `${dy}px`,
        rot: `${Math.random() * 360 - 180}deg`,
        color: colors[i % colors.length],
        delay: `${Math.random() * 80}ms`,
      };
    });
    setConfettiPieces(pieces);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setConfettiPieces([]), 1100);
  }, [reduceMotion]);

  // 読み込みが長引いている場合は、原因の切り分けヒントを表示する
  useEffect(() => {
    if (!loading) {
      setShowSlowHint(false);
      return;
    }
    const t = setTimeout(() => setShowSlowHint(true), 6000);
    return () => clearTimeout(t);
  }, [loading]);

  // ---- 初期データ購読 ----
  useEffect(() => {
    let cancelled = false;
    let unsubRecords: (() => void) | undefined;
    let unsubReview: (() => void) | undefined;
    let unsubGoal: (() => void) | undefined;

    (async () => {
      try {
        await ensureAuth();
        await ensureSettingsDocExists();
        const start = addDays(todayStr, -6);
        unsubRecords = subscribeRecentRecords(
          start,
          todayStr,
          (list) => {
            if (cancelled) return;
            setRecords(list);
            setLoading(false);
          },
          () => {
            if (cancelled) return;
            setLoadError("記録の読み込みに失敗しました。ページを再読み込みしてください。");
            setLoading(false);
          }
        );
        unsubReview = subscribeReviewRecords(
          (list) => !cancelled && setReviewRecords(list),
          () => {}
        );
        unsubGoal = subscribeGoal(
          (m) => !cancelled && setGoalMinutes(m),
          () => {}
        );
      } catch (err) {
        console.error("[StudyTracker] init failed", err);
        if (!cancelled) {
          setLoadError("初期化に失敗しました。ページを再読み込みしてください。");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubRecords?.();
      unsubReview?.();
      unsubGoal?.();
    };
  }, [todayStr]);

  // ---- 導出データ ----
  const todayRecords = useMemo(
    () =>
      records
        .filter((r) => r.date === todayStr)
        .sort((a, b) => (a.time < b.time ? 1 : -1)),
    [records, todayStr]
  );
  const todayTotal = useMemo(() => todayRecords.reduce((s, r) => s + r.minutes, 0), [todayRecords]);
  const weekTotal = useMemo(() => records.reduce((s, r) => s + r.minutes, 0), [records]);

  const subjectTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of todayRecords) map.set(r.subject, (map.get(r.subject) ?? 0) + r.minutes);
    return Array.from(map.entries())
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [todayRecords]);
  const maxSubjectMinutes = useMemo(() => Math.max(1, ...subjectTotals.map((s) => s.minutes)), [subjectTotals]);

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(todayStr, -(6 - i))), [todayStr]);
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of last7Days) map.set(d, 0);
    for (const r of records) map.set(r.date, (map.get(r.date) ?? 0) + r.minutes);
    return last7Days.map((d) => ({ date: d, minutes: map.get(d) ?? 0, isToday: d === todayStr }));
  }, [records, last7Days, todayStr]);
  const maxDayMinutes = useMemo(
    () => Math.max(goalMinutes, ...dayTotals.map((d) => d.minutes), 1),
    [dayTotals, goalMinutes]
  );

  const sortedReview = useMemo(
    () => [...reviewRecords].sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1)),
    [reviewRecords]
  );

  const lastRecord = useMemo(() => {
    if (records.length === 0) return null;
    return [...records].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)).slice(-1)[0];
  }, [records]);

  // ---- ヒーロー数字のカウントアップ演出 ----
  useEffect(() => {
    if (prevTotalRef.current === null) {
      prevTotalRef.current = todayTotal;
      setHeroDisplay(todayTotal);
      return;
    }
    const prev = prevTotalRef.current;
    const next = todayTotal;
    if (prev === next) return;

    if (reduceMotion) {
      setHeroDisplay(next);
      prevTotalRef.current = next;
      if (prev < goalMinutes && next >= goalMinutes) spawnConfetti();
      return;
    }

    const start = performance.now();
    const dur = 550;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setHeroDisplay(Math.round(prev + (next - prev) * eased));
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        prevTotalRef.current = next;
        if (prev < goalMinutes && next >= goalMinutes) spawnConfetti();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayTotal, goalMinutes]);

  const heroGlow = useMemo(() => {
    const scale = 0.55 + Math.min(1, heroDisplay / goalMinutes) * 0.85;
    const opacity = 0.35 + Math.min(1, heroDisplay / goalMinutes) * 0.55;
    return { scale, opacity };
  }, [heroDisplay, goalMinutes]);

  // ---- 勉強タイマー ----
  useEffect(() => {
    if (timerPhase !== "running") return;
    const id = setInterval(() => {
      setTimerDisplayMs(timerAccumulatedRef.current + (timerRunStartRef.current ? Date.now() - timerRunStartRef.current : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerPhase]);

  function handleTimerStart() {
    timerAccumulatedRef.current = 0;
    timerRunStartRef.current = Date.now();
    setTimerDisplayMs(0);
    setTimerPhase("running");
  }

  function handleTimerPause() {
    if (timerRunStartRef.current) {
      timerAccumulatedRef.current += Date.now() - timerRunStartRef.current;
    }
    timerRunStartRef.current = null;
    setTimerDisplayMs(timerAccumulatedRef.current);
    setTimerPhase("paused");
  }

  function handleTimerResume() {
    timerRunStartRef.current = Date.now();
    setTimerPhase("running");
  }

  function handleTimerStop() {
    const finalMs =
      timerPhase === "running" && timerRunStartRef.current
        ? timerAccumulatedRef.current + (Date.now() - timerRunStartRef.current)
        : timerAccumulatedRef.current;
    const minutes = Math.max(1, Math.round(finalMs / 60000));
    // ここではまだリセットしない。保存が成功するまでは、記録モーダルを
    // キャンセルした場合に「続きから再開」できるよう一時停止状態で保持する。
    timerAccumulatedRef.current = finalMs;
    timerRunStartRef.current = null;
    setTimerDisplayMs(finalMs);
    setTimerPhase("paused");
    setModal({ mode: "add", subject: lastRecord?.subject ?? "数学", topic: "", minutes });
  }

  function resetTimerToIdle() {
    timerAccumulatedRef.current = 0;
    timerRunStartRef.current = null;
    setTimerDisplayMs(0);
    setTimerPhase("idle");
  }

  function fmtTimer(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // ---- アクション ----
  async function handleAdjustGoal(delta: number) {
    const next = Math.min(300, Math.max(30, goalMinutes + delta));
    setGoalMinutes(next);
    try {
      await setGoal(next);
    } catch {
      showToast("目標の保存に失敗しました");
    }
  }

  async function handleSetStatus(record: StudyRecord, val: Exclude<Understanding, null>) {
    const nextVal: Understanding = record.understanding === val ? null : val;
    setPendingIds((prev) => new Set(prev).add(record.id));
    try {
      await updateRecord(record.id, { understanding: nextVal });
    } catch {
      showToast("更新に失敗しました");
    } finally {
      setPendingIds((prev) => {
        const n = new Set(prev);
        n.delete(record.id);
        return n;
      });
      setOpenStatusId(null);
    }
  }

  async function handleResolveReview(record: StudyRecord) {
    setResolvingIds((prev) => new Set(prev).add(record.id));
    try {
      await updateRecord(record.id, { understanding: "good" });
      showToast("復習を完了にしました");
    } catch {
      showToast("更新に失敗しました");
    } finally {
      setResolvingIds((prev) => {
        const n = new Set(prev);
        n.delete(record.id);
        return n;
      });
    }
  }

  async function handleSaveRecord() {
    if (!modal || saving) return;
    setSaving(true);
    try {
      const topic = modal.topic.trim();
      if (modal.mode === "add") {
        await addRecord({ subject: modal.subject, topic, minutes: modal.minutes, date: todayStr, time: nowTimeStr() });
        showToast(randomPraise());
        resetTimerToIdle();
      } else {
        await updateRecord(modal.id, { subject: modal.subject, topic, minutes: modal.minutes });
        showToast("保存しました");
      }
      setModal(null);
    } catch {
      showToast("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord() {
    if (!modal || modal.mode !== "edit" || deleting) return;
    setDeleting(true);
    try {
      await deleteRecord(modal.id);
      showToast("削除しました");
      setModal(null);
    } catch {
      showToast("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  function buildShareText() {
    const t = fmtHM(todayTotal);
    const lines = todayRecords
      .slice()
      .reverse()
      .map((r) => `${r.subject}：${r.topic || "—"}`);
    return `📚 今日の勉強\n\n勉強時間：${t.h > 0 ? t.h + "時間" : ""}${t.m}分\n\n${lines.join("\n")}\n\n今日もお疲れさま！`;
  }

  async function handleShare() {
    setSharePreviewOpen(true);
    const text = buildShareText();
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ text });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast("コピーしました");
      }
    } catch (err) {
      // 共有シートのキャンセルはエラーとして扱わない
      console.error("[StudyTracker] share failed", err);
    }
  }

  function dateLabel(dateStr: string) {
    if (dateStr === todayStr) return "今日";
    const [, m, d] = dateStr.split("-").map(Number);
    return `${m}/${d}`;
  }

  function fmtGoalLabel() {
    const g = fmtHM(goalMinutes);
    return `${g.h > 0 ? g.h + "時間" : ""}${g.m > 0 ? g.m + "分" : ""}`;
  }

  if (loading) {
    return (
      <div className="loading-screen" style={{ flexDirection: "column", gap: 14, padding: "0 24px", textAlign: "center" }}>
        <div>読み込み中…</div>
        {showSlowHint && (
          <div style={{ fontSize: 12, color: "var(--text-faint)", maxWidth: 320, lineHeight: 1.7 }}>
            時間がかかりすぎている場合、以下のいずれかが原因の可能性があります。
            <br />
            ・Firestore Databaseがまだ作成中／未作成
            <br />
            ・Authenticationの「匿名」ログインが未有効化
            <br />
            ・Firestoreのルールが未公開のまま
            <br />
            ・Vercelの環境変数を追加した後、再デプロイしていない
          </div>
        )}
      </div>
    );
  }

  const th = heroTimeParts(heroDisplay);
  const goalPct = Math.min(100, Math.round((todayTotal / goalMinutes) * 100));

  return (
    <div className="page-shell">
      {loadError && (
        <div style={{ margin: "12px 20px 0", fontSize: 12.5, color: "var(--review)" }}>{loadError}</div>
      )}

      <div className="header">
        <div className="brand">
          <span className="brand-mark">がんばり日誌</span>
        </div>
        <button className="icon-btn" aria-label="目標を編集" onClick={() => setShowGoalEdit((v) => !v)}>
          ⚙
        </button>
      </div>

      <div className="hero" id="hero-box">
        <div
          className="lamp-glow"
          style={{ opacity: heroGlow.opacity, transform: `translateX(-50%) scale(${heroGlow.scale})` }}
        />
        {confettiPieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece"
            style={
              {
                background: p.color,
                animationDelay: p.delay,
                "--dx": p.dx,
                "--dy": p.dy,
                "--rot": p.rot,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="eyebrow">今日の勉強時間</div>
        <div className="time-display">
          {th.h > 0 && <>{th.h}<span className="unit">時間</span></>}
          {th.m}
          <span className="unit">分</span>
        </div>
        <div className="goal-line">
          目標 {fmtGoalLabel()} まで {goalPct >= 100 ? "達成 ✓" : `${goalPct}%`}　
          <button onClick={() => setShowGoalEdit((v) => !v)}>目標を変更</button>
        </div>
        {showGoalEdit && (
          <div className="goal-edit open">
            <button onClick={() => handleAdjustGoal(-15)} aria-label="目標を15分減らす">
              −
            </button>
            <span>{fmtGoalLabel()}</span>
            <button onClick={() => handleAdjustGoal(15)} aria-label="目標を15分増やす">
              ＋
            </button>
          </div>
        )}
      </div>

      <div className="section">
        <div className="timer-card">
          <div className="timer-info">
            <div className="timer-label">
              {timerPhase === "idle" ? "タイマーで記録" : timerPhase === "paused" ? "休憩中" : "計測中"}
            </div>
            <div className={`timer-clock ${timerPhase === "running" ? "running" : ""}`}>{fmtTimer(timerDisplayMs)}</div>
          </div>
          <div className="timer-actions">
            {timerPhase === "idle" && (
              <button className="timer-btn primary" onClick={handleTimerStart}>
                ▶ 開始
              </button>
            )}
            {timerPhase === "running" && (
              <>
                <button className="timer-btn" onClick={handleTimerPause}>
                  ⏸ 休憩
                </button>
                <button className="timer-btn stop" onClick={handleTimerStop}>
                  ⏹ 終了
                </button>
              </>
            )}
            {timerPhase === "paused" && (
              <>
                <button className="timer-btn primary" onClick={handleTimerResume}>
                  ▶ 再開
                </button>
                <button className="timer-btn stop" onClick={handleTimerStop}>
                  ⏹ 終了
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">今日の学習</div>
          <div className="section-sub">{todayRecords.length}件・タップで確認/編集</div>
        </div>
        {todayRecords.length === 0 ? (
          <div className="empty-state">
            まだ記録がありません。
            <br />
            上の「▶ 開始」から始めてみよう。
          </div>
        ) : (
          todayRecords.map((r) => {
            const isOpen = openStatusId === r.id;
            const isPending = pendingIds.has(r.id);
            const statusLabel =
              r.understanding === "good"
                ? "🟢 理解できた"
                : r.understanding === "soso"
                ? "🟡 少し怪しい"
                : r.understanding === "review"
                ? "🔴 要復習"
                : "未確認";
            const statusClass =
              r.understanding === "good"
                ? "good"
                : r.understanding === "soso"
                ? "soso"
                : r.understanding === "review"
                ? "review"
                : "unconfirmed";
            return (
              <div
                className="record-card"
                key={r.id}
                onClick={() => setModal({ mode: "edit", id: r.id, subject: r.subject, topic: r.topic, minutes: r.minutes })}
              >
                <div className="record-top">
                  <div className="record-main">
                    <span className="record-subject">
                      {SUBJECT_ICON[r.subject] || ""} {r.subject}
                    </span>
                    <span className="record-topic">{r.topic || "(内容未記入)"}</span>
                    <span className="record-meta">{r.time}</span>
                  </div>
                  <div className="record-right">
                    <span className="record-minutes">{r.minutes}分</span>
                    <span
                      className={`status-pill ${statusClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenStatusId(isOpen ? null : r.id);
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
                <div className={`status-choices ${isOpen ? "open" : ""}`}>
                  <button
                    className="sel-good"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetStatus(r, "good");
                    }}
                  >
                    🟢 理解した
                  </button>
                  <button
                    className="sel-soso"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetStatus(r, "soso");
                    }}
                  >
                    🟡 少し怪しい
                  </button>
                  <button
                    className="sel-review"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetStatus(r, "review");
                    }}
                  >
                    🔴 要復習
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {subjectTotals.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">科目別（今日）</div>
          </div>
          <div className="week-card">
            {subjectTotals.map((s) => (
              <div className="subject-row" key={s.subject}>
                <div className="sr-label">
                  {SUBJECT_ICON[s.subject] || ""} {s.subject}
                </div>
                <div className="sr-track">
                  <div className="sr-fill" style={{ width: `${Math.max(6, (s.minutes / maxSubjectMinutes) * 100)}%` }} />
                </div>
                <div className="sr-minutes">{s.minutes}分</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <div className="section-title">週間の学習時間</div>
        </div>
        <div className="week-card">
          <div className="week-total">
            {fmtHM(weekTotal).h}
            <span className="unit">時間</span>
            {fmtHM(weekTotal).m}
            <span className="unit">分</span>
          </div>
          <div className="week-bars">
            {dayTotals.map((d) => {
              const h = Math.max(6, Math.round((d.minutes / maxDayMinutes) * 70));
              return (
                <div className="week-bar-col" key={d.date}>
                  <div className="week-bar-track">
                    <div className={`week-bar-fill ${d.isToday ? "today" : ""}`} style={{ height: `${h}px` }} />
                  </div>
                  <div className={`week-bar-label ${d.isToday ? "today" : ""}`}>
                    {d.isToday ? "今日" : weekdayLabel(d.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">要復習</div>
          <div className="section-sub">{sortedReview.length}件</div>
        </div>
        {sortedReview.length === 0 ? (
          <div className="empty-state">今のところ要復習はありません 👍</div>
        ) : (
          sortedReview.map((r) => (
            <div className="review-item" key={r.id}>
              <div className="ri-main">
                <span className="ri-subject">{r.subject}</span>
                <span className="ri-topic">{r.topic || "(内容未記入)"}</span>
                <span className="ri-date">{dateLabel(r.date)}</span>
              </div>
              <button className="ri-done" disabled={resolvingIds.has(r.id)} onClick={() => handleResolveReview(r)}>
                復習した
              </button>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <button className="share-btn" onClick={handleShare}>
          📤 今日の記録を共有する
        </button>
        {sharePreviewOpen && <div className="share-preview open">{buildShareText()}</div>}
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(null)}>
          <div className="modal-sheet enter" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">{modal.mode === "edit" ? "記録を編集" : "勉強を記録する"}</div>

            <div className="field-label">科目</div>
            <div className="chip-row">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  className={`chip ${modal.subject === s ? "selected" : ""}`}
                  onClick={() => setModal({ ...modal, subject: s })}
                >
                  {SUBJECT_ICON[s]} {s}
                </button>
              ))}
            </div>

            <div className="field-label">内容（かんたんでOK）</div>
            <input
              className="topic-input"
              type="text"
              placeholder="例：二次関数"
              value={modal.topic}
              onChange={(e) => setModal({ ...modal, topic: e.target.value })}
            />

            <div className="field-label">
              時間
              {!DURATIONS.includes(modal.minutes) && (
                <span style={{ color: "var(--accent)", fontWeight: 700 }}> ・計測時間 {modal.minutes}分</span>
              )}
            </div>
            <div className="chip-row">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  className={`chip ${modal.minutes === d ? "selected" : ""}`}
                  onClick={() => setModal({ ...modal, minutes: d })}
                >
                  {d < 60 ? `${d}分` : `${Math.floor(d / 60)}時間${d % 60 ? `${d % 60}分` : ""}`}
                </button>
              ))}
            </div>

            <div className="modal-actions">
              {modal.mode === "edit" && (
                <button className="btn-secondary btn-danger" disabled={deleting} onClick={handleDeleteRecord}>
                  削除
                </button>
              )}
              <button className="btn-secondary" onClick={() => setModal(null)}>
                キャンセル
              </button>
              <button className="btn-primary" disabled={saving} onClick={handleSaveRecord}>
                {saving ? "保存中…" : modal.mode === "edit" ? "保存" : "記録する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
