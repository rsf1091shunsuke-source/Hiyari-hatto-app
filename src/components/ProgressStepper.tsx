/**
 * ProgressStepper
 * 参照：詳細設計書 2章 コンポーネント設計（ProgressStepper：currentStep, totalSteps）
 */

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressStepper({ currentStep, totalSteps }: ProgressStepperProps) {
  return (
    <div
      className="flex gap-1 px-4 pt-3"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={[
            "h-1 flex-1 rounded-full transition-colors duration-150",
            i < currentStep ? "bg-primary" : "bg-black/10",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
