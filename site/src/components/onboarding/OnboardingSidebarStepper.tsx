import type { OnboardingStep } from '../../types/auth';

interface StepMeta {
  number: OnboardingStep;
  title: string;
  shortDesc: string;
}

const STEP_LIST: readonly StepMeta[] = [
  { number: 1, title: 'Conta', shortDesc: 'Seu acesso seguro' },
  { number: 2, title: 'Seus dados', shortDesc: 'Nome e idade 50+' },
  { number: 3, title: 'Localização', shortDesc: 'Sua cidade em Sergipe' },
  { number: 4, title: 'Foto', shortDesc: 'Sua melhor imagem' },
  { number: 5, title: 'Interesses', shortDesc: 'Gostos e hobbies' },
  { number: 6, title: 'O que procura', shortDesc: 'Seu objetivo hoje' },
  { number: 7, title: 'Senha', shortDesc: 'Confirmação e segurança' },
];

interface OnboardingSidebarStepperProps {
  currentStep: OnboardingStep;
  isCompleted?: boolean;
  onStepClick?: (step: OnboardingStep) => void;
}

export function OnboardingSidebarStepper({
  currentStep,
  isCompleted = false,
  onStepClick,
}: OnboardingSidebarStepperProps) {
  return (
    <nav className="onboarding-stepper" aria-label="Etapas do cadastro guiado">
      <div className="onboarding-stepper__header">
        <h2 className="onboarding-stepper__title">Sua caminhada até aqui:</h2>
        <span className="onboarding-stepper__counter">
          {isCompleted ? (
            <strong>Cadastro concluído</strong>
          ) : (
            <>
              Passo <strong>{currentStep}</strong> de 7
            </>
          )}
        </span>
      </div>

      <ol className="onboarding-stepper__list">
        {STEP_LIST.map((item) => {
          const isDone = isCompleted || item.number < currentStep;
          const isCurrent = !isCompleted && item.number === currentStep;
          const isPending = !isCompleted && item.number > currentStep;
          const canClick = !isCompleted && isDone && Boolean(onStepClick);

          return (
            <li
              key={item.number}
              className={[
                'onboarding-stepper__item',
                isDone ? 'onboarding-stepper__item--done' : '',
                isCurrent ? 'onboarding-stepper__item--current' : '',
                isPending ? 'onboarding-stepper__item--pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                className="onboarding-stepper__button"
                disabled={!canClick}
                onClick={() => canClick && onStepClick?.(item.number)}
                title={canClick ? `Voltar para o Passo ${item.number}: ${item.title}` : undefined}
              >
                <span className="onboarding-stepper__bullet" aria-hidden="true">
                  {isDone ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="onboarding-stepper__check">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.number
                  )}
                </span>
                <span className="onboarding-stepper__meta">
                  <span className="onboarding-stepper__label">{item.title}</span>
                  <span className="onboarding-stepper__desc">{item.shortDesc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
