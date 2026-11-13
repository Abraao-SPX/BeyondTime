import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';

interface DefensiveModalRF06Props {
  isOpen: boolean;
  onKeepEditing: () => void;
  onConfirmDiscard: () => void;
}

const DEFENSIVE_COUNTDOWN_SECONDS = 3;

export function DefensiveModalRF06({
  isOpen,
  onKeepEditing,
  onConfirmDiscard,
}: DefensiveModalRF06Props) {
  const [secondsLeft, setSecondsLeft] = useState(DEFENSIVE_COUNTDOWN_SECONDS);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepBtnRef = useRef<HTMLButtonElement>(null);
  const discardBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      if (dialog.open) {
        dialog.close();
      }
      return;
    }

    setSecondsLeft(DEFENSIVE_COUNTDOWN_SECONDS);
    if (!dialog.open) {
      dialog.showModal();
    }
    keepBtnRef.current?.focus();

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }

    if (event.key === 'Tab') {
      const keepBtn = keepBtnRef.current;
      const discardBtn = discardBtnRef.current;
      if (!keepBtn || !discardBtn) return;

      if (discardBtn.disabled) {
        event.preventDefault();
        keepBtn.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === discardBtn) {
        event.preventDefault();
        keepBtn.focus();
      } else if (event.shiftKey && document.activeElement === keepBtn) {
        event.preventDefault();
        discardBtn.focus();
      }
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      event.preventDefault();
    }
  }

  const discardLabel =
    secondsLeft > 0
      ? `Aguarde ${secondsLeft}s para confirmar descarte...`
      : 'Sim, voltar e apagar dados';

  return (
    <dialog
      ref={dialogRef}
      id="modal-rf06"
      className="defensive-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-rf06-title"
      aria-describedby="modal-rf06-desc"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <p className="defensive-modal__badge">Atenção: Ação de descarte</p>
      <h2 id="modal-rf06-title" className="defensive-modal__title">
        Deseja voltar e apagar os dados desta etapa?
      </h2>
      <p id="modal-rf06-desc" className="defensive-modal__desc">
        Se você sair agora, as informações que acabou de digitar não serão salvas. Confirme abaixo como deseja prosseguir.
      </p>
      <div className="defensive-modal__actions">
        <button
          ref={keepBtnRef}
          type="button"
          id="modal-rf06-keep"
          className="btn btn--primary"
          onClick={onKeepEditing}
        >
          Continuar preenchendo meu cadastro
        </button>
        <button
          ref={discardBtnRef}
          type="button"
          id="modal-rf06-discard"
          className="btn btn--danger-outline"
          disabled={secondsLeft > 0}
          onClick={onConfirmDiscard}
        >
          {discardLabel}
        </button>
      </div>
    </dialog>
  );
}
