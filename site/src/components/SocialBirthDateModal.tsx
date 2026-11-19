import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';
import type { SocialProvider } from '../types/auth';
import { formatBirthDateInput, validateBirthDate50Plus } from '../utils/validation';

interface SocialBirthDateModalProps {
  isOpen: boolean;
  providerName: SocialProvider | null;
  isSubmitting: boolean;
  serverError: string | null;
  onConfirm: (isoBirthDate: string) => void;
  onCancel: () => void;
}

function toIsoBirthDate(brDate: string): string {
  const [day, month, year] = brDate.trim().split('/');
  return `${year}-${month}-${day}`;
}

export function SocialBirthDateModal({
  isOpen,
  providerName,
  isSubmitting,
  serverError,
  onConfirm,
  onCancel,
}: SocialBirthDateModalProps) {
  const [birthDate, setBirthDate] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      if (dialog.open) {
        dialog.close();
      }
      setBirthDate('');
      setLocalError(null);
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }
    inputRef.current?.focus();
  }, [isOpen]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onCancel();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      event.preventDefault();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const validationMsg = validateBirthDate50Plus(birthDate);
    if (validationMsg !== null) {
      setLocalError(validationMsg);
      inputRef.current?.focus();
      return;
    }

    onConfirm(toIsoBirthDate(birthDate));
  }

  const activeError = localError || serverError;

  return (
    <dialog
      ref={dialogRef}
      id="modal-social-birthdate"
      className="defensive-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-social-title"
      aria-describedby="modal-social-desc"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <p className="defensive-modal__badge">
        Regra de Elegibilidade 50+ (RF02)
      </p>

      <h2 id="modal-social-title" className="defensive-modal__title">
        Primeiro acesso com {providerName || 'Provedor Social'}
      </h2>

      <p id="modal-social-desc" className="defensive-modal__desc">
        O <strong>BeyondTime</strong> é uma comunidade segura e exclusiva para pessoas com <strong>50 anos ou mais</strong>. Para validar seu cadastro inicial, informe sua data de nascimento.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="social-birthdate-input">
            Data de Nascimento (DD/MM/AAAA)
          </label>
          <input
            ref={inputRef}
            id="social-birthdate-input"
            type="text"
            inputMode="numeric"
            className="form-input"
            style={{ fontSize: '1.25rem', minHeight: '52px' }}
            placeholder="Ex.: 15/06/1965"
            value={birthDate}
            onChange={(e) => {
              setBirthDate(formatBirthDateInput(e.target.value));
              if (localError) setLocalError(null);
            }}
            aria-invalid={activeError !== null}
            aria-describedby={activeError ? 'social-birthdate-error' : undefined}
            maxLength={10}
            disabled={isSubmitting}
          />
          {activeError && (
            <p
              id="social-birthdate-error"
              className="form-error form-error--block"
              role="alert"
              style={{ marginTop: '8px' }}
            >
              {activeError}
            </p>
          )}
        </div>

        <div className="defensive-modal__actions">
          <button
            type="submit"
            className="btn btn--primary"
            style={{ minHeight: '48px', fontSize: '1.125rem' }}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Validando idade 50+...' : 'Confirmar e Entrar'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ minHeight: '48px', fontSize: '1rem' }}
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
}
