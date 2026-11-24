import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { buildIcebreakerSuggestions, getHobbyLabel } from '../../services/wave2Service';
import type { ChatThread } from '../../types/wave2';

interface SimplifiedChatRF07Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (contactId: string) => void;
  onSendMessage: (contactId: string, text: string) => void;
  onGoToDiscover: () => void;
}

export function SimplifiedChatRF07({
  threads,
  activeThreadId,
  onSelectThread,
  onSendMessage,
  onGoToDiscover,
}: SimplifiedChatRF07Props) {
  const [draft, setDraft] = useState('');
  const [mobileViewingChat, setMobileViewingChat] = useState(Boolean(activeThreadId));
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  function handleSelect(contactId: string) {
    onSelectThread(contactId);
    setMobileViewingChat(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeThread) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(activeThread.contactId, trimmed);
    setDraft('');
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
                        <span className="wa-thread-item__preview">
                          {lastMsg ? lastMsg.text : 'Nova conexão — envie uma mensagem'}
                        </span>
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
                      <p className="chat-bubble__text">{msg.text}</p>
                      <span className="chat-bubble__time">
                        {msg.sentAt} {msg.sender === 'me' ? '• Enviada' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="wa-composer" onSubmit={handleSubmit}>
              <label htmlFor="chat-message-input" className="sr-only">
                Escreva sua mensagem para {activeThread.contactName}
              </label>
              <input
                id="chat-message-input"
                type="text"
                className="form-input wa-composer__input"
                placeholder={`Digite uma mensagem para ${activeThread.contactName.split(' ')[0]}...`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn--primary wa-composer__send"
                disabled={draft.trim().length === 0}
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
          </div>
        )}
      </div>
    </section>
  );
}
