import type { OnboardingStep } from '../../types/auth';

interface OnboardingStepHeaderProps {
  step: OnboardingStep;
  onBack?: () => void;
}

const STEP_PERCENTAGES: Record<OnboardingStep, number> = {
  1: 14,
  2: 28,
  3: 42,
  4: 57,
  5: 71,
  6: 85,
  7: 100,
};

export function OnboardingStepHeader({
  step,
  onBack,
}: OnboardingStepHeaderProps) {
  const percent = STEP_PERCENTAGES[step];

  return (
    <div className="register-progress">
      {step === 1 ? (
        <span className="register-progress__welcome">Boas-vindas</span>
      ) : (
        <button
          type="button"
          className="btn--step-back"
          onClick={onBack}
        >
          ← Voltar
        </button>
      )}

      <div className="register-progress__status">
        <span className="register-progress__label">
          Passo {step} de 7 ({percent}%)
        </span>
        <div
          className="register-progress__track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso do cadastro: passo ${step} de 7`}
        >
          <div className={`register-progress__fill register-progress__fill--step-${step}`} />
        </div>
      </div>
    </div>
  );
}
