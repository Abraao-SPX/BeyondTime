import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { resizeAndPrepareAvatarFile } from '../../services/profileStorage';
import { FacialVerificationQrModal } from '../wave2/FacialVerificationQrModal';

interface Step4FotoPerfilProps {
  photoPreviewUrl: string | null;
  photoFileName: string | null;
  onPhotoSelect: (previewUrl: string | null, fileName: string | null, file: File | null) => void;
  onNext: () => void;
}

export function Step4FotoPerfil({
  photoPreviewUrl,
  photoFileName,
  onPhotoSelect,
  onNext,
}: Step4FotoPerfilProps) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const result = await resizeAndPrepareAvatarFile(file);
      setPhotoError(null);
      onPhotoSelect(result.dataUrl, result.fileName, result.file);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível validar a imagem selecionada.';
      setPhotoError(message);
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function handleSkipPhoto() {
    setPhotoError(null);
    onPhotoSelect(null, null, null);
    onNext();
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Uma foto sua
      </h1>
      <p className="auth-card__subtitle">
        Perfis com foto recebem mais conexões e demonstram confiança.
      </p>

      <div className="photo-preview">
        {photoPreviewUrl !== null ? (
          <img
            src={photoPreviewUrl}
            alt="Pré-visualização da sua foto de perfil"
            className="photo-preview__img"
          />
        ) : (
          <svg
            className="photo-preview__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
            <circle cx="12" cy="14" r="3.5" />
          </svg>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="step4-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="btn btn--upload"
        disabled={isProcessingPhoto}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg
          className="btn--upload__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="14" r="3.5" />
        </svg>
        <span>
          {isProcessingPhoto ? 'Otimizando imagem...' : 'Selecionar foto do dispositivo'}
        </span>
      </button>

      <div className="photo-verification-banner">
        <div className="photo-verification-banner__text">
          <strong>
            {isVerified ? '✓ Selo 50+ Pré-Verificado' : 'Verificação Facial Anti-Golpe (Opcional)'}
          </strong>
          <p>
            {isVerified
              ? 'Sua biometria facial foi confirmada no celular. Sua conta nascerá com o Selo de Verificado.'
              : 'Gere um QR Code para abrir a câmera do celular e comprovar autenticidade sem complicação no computador.'}
          </p>
        </div>
        {!isVerified && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowQrModal(true)}
          >
            Validar com Câmera do Celular (QR Code)
          </button>
        )}
      </div>

      {photoFileName !== null && photoError === null && (
        <p className="photo-selected-name" aria-live="polite">
          Arquivo selecionado: {photoFileName}
        </p>
      )}

      {photoError !== null && (
        <p className="form-error" role="alert">
          {photoError}
        </p>
      )}

      <div className="photo-guidelines">
        <p>Escolha uma foto recente e sorrindo.</p>
        <p>Evite óculos escuros ou chapéus que cubram o rosto.</p>
        <p>Garanta uma boa iluminação no ambiente.</p>
      </div>

      <div className="action-stack action-stack--compact">
        <button type="button" className="btn btn--primary" onClick={onNext}>
          Avançar
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleSkipPhoto}
        >
          <span className="underline-bold">Adicionar foto mais tarde</span>
        </button>
      </div>

      {showQrModal && (
        <FacialVerificationQrModal
          userName="Novo Membro"
          onVerified={() => {
            setIsVerified(true);
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
