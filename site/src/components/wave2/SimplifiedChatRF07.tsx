import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { buildIcebreakerSuggestions, getHobbyLabel } from '../../services/wave2Service';
import type { ChatThread, OutgoingMessagePayload } from '../../types/wave2';

interface SimplifiedChatRF07Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (contactId: string) => void;
  onSendMessage: (contactId: string, payload: string | OutgoingMessagePayload) => void;
  onRequestBlock: (thread: ChatThread) => void;
  onGoToDiscover: () => void;
}

const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function SimplifiedChatRF07({
  threads,
  activeThreadId,
  onSelectThread,
  onSendMessage,
  onRequestBlock,
  onGoToDiscover,
}: SimplifiedChatRF07Props) {
  const [draft, setDraft] = useState('');
  const [mobileViewingChat, setMobileViewingChat] = useState(Boolean(activeThreadId));
  const [pendingImage, setPendingImage] = useState<{ url: string; name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const cancelRecordingFlagRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  const activeThread =
    threads.find((item) => item.contactId === activeThreadId) ?? threads[0] ?? null;

  useEffect(() => {
    if (activeThreadId) {
      setMobileViewingChat(true);
    }
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeThread?.contactId, activeThread?.messages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function cleanupRecordingStream() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
  }

  function handleSelect(contactId: string) {
    onSelectThread(contactId);
    setMobileViewingChat(true);
    setMediaNotice(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeThread) return;
    const trimmed = draft.trim();
    if (!trimmed && !pendingImage) return;

    if (pendingImage) {
      onSendMessage(activeThread.contactId, {
        text: trimmed,
        imageUrl: pendingImage.url,
        imageName: pendingImage.name,
      });
      setPendingImage(null);
      setDraft('');
      setMediaNotice(null);
      return;
    }

    onSendMessage(activeThread.contactId, trimmed);
    setDraft('');
    setMediaNotice(null);
  }

  function handlePhotoPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMediaNotice('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setMediaNotice('A foto escolhida é muito grande. Use uma imagem de até 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingImage({ url: reader.result, name: file.name });
        setMediaNotice(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleStartRecording() {
    if (!activeThread) return;
    setMediaNotice(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMediaNotice(
        'Seu navegador não suporta gravação de áudio aqui. Você pode enviar mensagens por texto ou foto.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingFlagRef.current = false;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const targetContactId = activeThread.contactId;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = cancelRecordingFlagRef.current;
        const durationLabel = formatSeconds(Math.max(1, recordingSecondsRef.current));
        const chunks = [...audioChunksRef.current];
        cleanupRecordingStream();

        if (wasCancelled || chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onSendMessage(targetContactId, {
              text: '',
              audioUrl: reader.result,
              audioDurationLabel: durationLabel,
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch {
      cleanupRecordingStream();
      setMediaNotice(
        'Não foi possível acessar o microfone. Verifique a permissão no navegador e tente novamente.'
      );
    }
  }

  function handleStopAndSendRecording() {
    cancelRecordingFlagRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingStream();
    }
  }

  function handleCancelRecording() {
    cancelRecordingFlagRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingStream();
    }
  }

  if (threads.length === 0) {
    return (
      <section className="wave2-section" aria-label="Conversas">
        <div className="wave2-empty-card">
          <h1 className="wave2-empty-card__title">Nenhuma conversa ainda</h1>
          <p className="wave2-empty-card__text">
            Curta pessoas na aba Descobrir para começar a conversar por aqui.
          </p>
          <div className="wave2-empty-card__actions">
            <button type="button" className="btn btn--primary" onClick={onGoToDiscover}>
              Ir para Descobrir
            </button>
          </div>
        </div>
      </section>
    );
  }

  const icebreakers = activeThread ? buildIcebreakerSuggestions(activeThread) : [];
  const canSubmit = draft.trim().length > 0 || pendingImage !== null;

  return (
    <section className="wa-chat-section" aria-label="Conversas">
      <div className={`wa-shell${mobileViewingChat ? ' wa-shell--chat-open' : ''}`}>
        {/* Coluna Esquerda: Lista de Conexões (estilo WhatsApp Web) */}
        <aside className="wa-sidebar" aria-label="Suas conexões">
          <header className="wa-sidebar__header">
            <h1 className="wa-sidebar__title">Conversas</h1>
            <span className="wa-sidebar__count">{threads.length}</span>
          </header>

          <ul className="wa-thread-list">
            {threads.map((thread) => {
              const isSelected = activeThread?.contactId === thread.contactId;
              const lastMsg = thread.messages[thread.messages.length - 1];
              const previewText = lastMsg
                ? lastMsg.text ||
                  (lastMsg.audioUrl
                    ? `Mensagem de voz (${lastMsg.audioDurationLabel || '00:01'})`
                    : lastMsg.imageUrl
                      ? 'Foto enviada'
                      : '')
                : 'Nova conexão — envie uma mensagem';

              return (
                <li key={thread.contactId}>
                  <button
                    type="button"
                    className={`wa-thread-item${isSelected ? ' wa-thread-item--active' : ''}`}
                    onClick={() => handleSelect(thread.contactId)}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <img
                      src={thread.contactAvatarUrl}
                      alt=""
                      className="wa-thread-item__avatar"
                      aria-hidden="true"
                    />
                    <div className="wa-thread-item__body">
                      <div className="wa-thread-item__top">
                        <strong className="wa-thread-item__name">{thread.contactName}</strong>
                        {lastMsg && (
                          <span className="wa-thread-item__time">{lastMsg.sentAt}</span>
                        )}
                      </div>
                      <div className="wa-thread-item__bottom">
                        <span className="wa-thread-item__preview">{previewText}</span>
                        {thread.unreadCount > 0 && (
                          <span
                            className="chat-unread-badge"
                            aria-label={`${thread.unreadCount} mensagens não lidas`}
                          >
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Coluna Direita: Área Ampla de Conversa */}
        {activeThread && (
          <div className="wa-main">
            <header className="wa-main__header">
              <button
                type="button"
                className="wa-mobile-back"
                onClick={() => setMobileViewingChat(false)}
                aria-label="Voltar para lista de conversas"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Conversas</span>
              </button>

              <div className="wa-main__contact">
                <img
                  src={activeThread.contactAvatarUrl}
                  alt={`Foto de ${activeThread.contactName}`}
                  className="wa-main__avatar"
                />
                <div>
                  <h2 className="wa-main__name">
                    {activeThread.contactName}, {activeThread.contactAge}
                  </h2>
                  <p className="wa-main__meta">
                    {activeThread.contactCity} • {activeThread.contactGoal}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--secondary chat-block-btn"
                onClick={() => onRequestBlock(activeThread)}
              >
                Bloquear contato
              </button>
            </header>

            <div className="wa-safety-bar" role="note">
              Converse com calma por aqui e nunca envie dinheiro, códigos ou dados bancários.
            </div>

            {activeThread.sharedHobbies.length > 0 && (
              <div className="wa-shared-bar">
                <span className="wa-shared-bar__label">Em comum:</span>
                {activeThread.sharedHobbies.map((hobbyId) => (
                  <span key={hobbyId} className="candidate-hobby-chip candidate-hobby-chip--shared">
                    {getHobbyLabel(hobbyId)}
                  </span>
                ))}
              </div>
            )}

            <div
              className="wa-messages"
              role="log"
              aria-live="polite"
              aria-label="Mensagens da conversa"
            >
              {activeThread.messages.length === 0 ? (
                <div className="wa-empty-thread">
                  <p>Escolha uma frase para começar a conversa ou escreva abaixo:</p>
                  <div className="chat-icebreakers">
                    {icebreakers.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="chat-icebreaker-btn"
                        onClick={() => onSendMessage(activeThread.contactId, suggestion)}
                      >
                        “{suggestion}”
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                activeThread.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row chat-bubble-row--${msg.sender}`}
                  >
                    <div className={`chat-bubble chat-bubble--${msg.sender}`}>
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt={msg.imageName || 'Foto enviada na conversa'}
                          className="chat-bubble__image"
                        />
                      )}
                      {msg.audioUrl && (
                        <div className="chat-bubble__audio-wrap">
                          <span className="chat-bubble__audio-label">
                            Mensagem de voz ({msg.audioDurationLabel || '00:01'})
                          </span>
                          <audio
                            controls
                            src={msg.audioUrl}
                            className="chat-bubble__audio"
                            aria-label="Reproduzir mensagem de voz"
                          />
                        </div>
                      )}
                      {msg.text && <p className="chat-bubble__text">{msg.text}</p>}
                      <span className="chat-bubble__time">
                        {msg.sentAt} {msg.sender === 'me' ? '• Enviada' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {mediaNotice && (
              <div className="wa-media-notice" role="alert">
                <span>{mediaNotice}</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setMediaNotice(null)}
                >
                  Fechar
                </button>
              </div>
            )}

            {pendingImage && (
              <div className="wa-attachment-bar">
                <div className="wa-attachment-bar__info">
                  <img
                    src={pendingImage.url}
                    alt="Pré-visualização da foto selecionada"
                    className="wa-attachment-bar__thumb"
                  />
                  <div>
                    <strong>Foto pronta para enviar</strong>
                    <span className="wa-attachment-bar__name">{pendingImage.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary wa-attachment-bar__cancel"
                  onClick={() => setPendingImage(null)}
                >
                  Remover foto
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoPick}
              aria-hidden="true"
              tabIndex={-1}
            />

            {isRecording ? (
              <div className="wa-composer wa-composer--recording" role="status" aria-live="polite">
                <div className="wa-recording-status">
                  <span className="wa-recording-dot" aria-hidden="true" />
                  <strong>Gravando áudio... {formatSeconds(recordingSeconds)}</strong>
                </div>
                <div className="wa-recording-actions">
                  <button
                    type="button"
                    className="btn btn--secondary wa-recording-btn"
                    onClick={handleCancelRecording}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary wa-recording-btn"
                    onClick={handleStopAndSendRecording}
                  >
                    Enviar áudio
                  </button>
                </div>
              </div>
            ) : (
              <form className="wa-composer" onSubmit={handleSubmit}>
                <button
                  type="button"
                  className="wa-media-btn"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Enviar foto"
                  title="Enviar foto"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="wa-media-btn"
                  onClick={handleStartRecording}
                  aria-label="Gravar mensagem de voz"
                  title="Gravar áudio"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </button>

                <label htmlFor="chat-message-input" className="sr-only">
                  Escreva sua mensagem para {activeThread.contactName}
                </label>
                <input
                  id="chat-message-input"
                  type="text"
                  className="form-input wa-composer__input"
                  placeholder={
                    pendingImage
                      ? 'Adicione uma legenda opcional...'
                      : `Digite uma mensagem para ${activeThread.contactName.split(' ')[0]}...`
                  }
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="btn btn--primary wa-composer__send"
                  disabled={!canSubmit}
                >
                  <span>Enviar</span>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
