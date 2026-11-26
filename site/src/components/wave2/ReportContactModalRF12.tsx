import { useEffect, useRef, useState } from 'react';
import type { ModerationReasonCode } from '../../types/wave2';

interface ReportContactModalRF12Props {
  contactName: string;
  defaultReasonCode?: ModerationReasonCode;
  onConfirm: (reasonCode: ModerationReasonCode, description?: string) => void;
  onCancel: () => void;
}

const REPORT_REASONS: ReadonlyArray<{ code: ModerationReasonCode; label: string }> = [
  { code: 'MONEY_OR_PIX_REQUEST', label: 'Pedido de dinheiro, Pix, códigos ou suspeita de golpe' },
  { code: 'FAKE_PROFILE', label: 'Perfil falso ou se passando por outra pessoa' },
  { code: 'HARASSMENT', label: 'Ameaça, pressão emocional ou desrespeito' },
  { code: 'SPAM', label: 'Links suspeitos ou insistência para sair do aplicativo' },
  { code: 'INAPPROPRIATE_CONTENT', label: 'Conteúdo inadequado ou ofensivo' },
  { code: 'OTHER', label: 'Outro motivo de segurança' },
];

export function ReportContactModalRF12({
  contactName,
  defaultReasonCode = 'MONEY_OR_PIX_REQUEST',
  onConfirm,
  onCancel,
}: ReportContactModalRF12Props) {
  const [selectedReason, setSelectedReason] = useState<ModerationReasonCode>(defaultReasonCode);
  const [description, setDescription] = useState('');
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

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
      aria-labelledby="report-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="defensive-modal">
        <p className="defensive-modal__badge">Denúncia Rápida • RF-12</p>
        <h2 id="report-modal-title" className="defensive-modal__title">
          Denunciar e bloquear {contactName}?
        </h2>
        <p className="defensive-modal__text">
          Ao confirmar, a conta de <strong>{contactName}</strong> entrará em{' '}
          <strong>congelamento cautelar imediato</strong> para auditoria de segurança, e o contato
          será bloqueado e removido das suas conversas. O conteúdo da conversa continua protegido.
        </p>

        <fieldset className="block-reason-fieldset">
          <legend className="form-label">Selecione o motivo da denúncia:</legend>
          <div className="block-reason-list">
            {REPORT_REASONS.map((item) => (
              <label key={item.code} className="block-reason-option">
                <input
                  type="radio"
                  name="report-reason"
                  value={item.code}
                  checked={selectedReason === item.code}
                  onChange={() => setSelectedReason(item.code)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="report-modal__notes">
          <label htmlFor="report-description" className="form-label">
            Detalhes adicionais (opcional):
          </label>
          <textarea
            id="report-description"
            className="form-input"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: pediu transferência via Pix ou código do celular."
          />
        </div>

        <div className="defensive-modal__actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => onConfirm(selectedReason, description.trim() || undefined)}
          >
            Confirmar denúncia e bloquear
          </button>
        </div>
      </div>
    </div>
  );
}
