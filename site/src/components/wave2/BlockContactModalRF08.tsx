import { useEffect, useRef, useState } from 'react';

interface BlockContactModalRF08Props {
  contactName: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const BLOCK_REASONS = [
  'Não tenho interesse em continuar conversando',
  'Comportamento desrespeitoso ou insistente',
  'Suspeita de perfil falso ou pedido financeiro',
  'Prefiro não informar',
] as const;

const BLOCK_CONFIRM_DELAY_SECONDS = 3;

export function BlockContactModalRF08({
  contactName,
  onConfirm,
  onCancel,
}: BlockContactModalRF08Props) {
  const [selectedReason, setSelectedReason] = useState<string>(BLOCK_REASONS[0]);
  const [secondsLeft, setSecondsLeft] = useState<number>(BLOCK_CONFIRM_DELAY_SECONDS);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  // RF-06 (SEC-ALTA-05): Temporizador defensivo de 3s antes de liberar ação destrutiva de bloqueio
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="defensive-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="defensive-modal">
        <p className="defensive-modal__badge">Segurança & Privacidade</p>
        <h2 id="block-modal-title" className="defensive-modal__title">
          Bloquear {contactName}?
        </h2>
        <p className="defensive-modal__text">
          Ao confirmar o bloqueio, <strong>{contactName}</strong> será removido(a) imediatamente das
          suas conversas e não aparecerá mais no seu feed — e seu perfil também ficará oculto para
          essa pessoa. Ela não receberá nenhuma notificação.
        </p>

        <fieldset className="block-reason-fieldset">
          <legend className="form-label">Motivo (opcional, apenas para sua segurança):</legend>
          <div className="block-reason-list">
            {BLOCK_REASONS.map((reason) => (
              <label key={reason} className="block-reason-option">
                <input
                  type="radio"
                  name="block-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="defensive-modal__actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
          >
            Cancelar e manter contato
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={secondsLeft > 0}
            aria-disabled={secondsLeft > 0}
            onClick={() => {
              if (secondsLeft > 0) return;
              onConfirm(selectedReason);
            }}
          >
            {secondsLeft > 0
              ? `Aguarde ${secondsLeft}s para confirmar bloqueio...`
              : 'Confirmar bloqueio'}
          </button>
        </div>
      </div>
    </div>
  );
}
