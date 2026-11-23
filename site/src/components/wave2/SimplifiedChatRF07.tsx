import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { buildIcebreakerSuggestions, getHobbyLabel } from '../../services/wave2Service';
import type { ChatThread } from '../../types/wave2';

interface SimplifiedChatRF07Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (contactId: string) => void;
  onSendMessage: (contactId: string, text: string) => void;
  onRequestBlock: (thread: ChatThread) => void;
  onGoToDiscover: () => void;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread =
    threads.find((item) => item.contactId === activeThreadId) ?? threads[0] ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeThread?.contactId, activeThread?.messages.length]);

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
      <section className="wave2-section" aria-labelledby="chat-empty-heading">
        <div className="wave2-empty-card">
          <span className="wave2-eyebrow">RF-07 • Chat Simplificado</span>
          <h1 id="chat-empty-heading" className="wave2-empty-card__title">
            Você ainda não tem conversas ativas
          </h1>
          <p className="wave2-empty-card__text">
            Conecte-se com pessoas compatíveis na aba Descobrir para iniciar uma conversa tranquila e
            protegida.
          </p>
          <div className="wave2-empty-card__actions">
            <button type="button" className="btn btn--primary" onClick={onGoToDiscover}>
              Ir para Descobrir conexões
            </button>
          </div>
        </div>
      </section>
    );
  }

  const icebreakers = activeThread ? buildIcebreakerSuggestions(activeThread) : [];

  return (
    <section className="wave2-section" aria-labelledby="chat-heading">
      <header className="wave2-section__header wave2-section__header--compact">
        <div>
          <span className="wave2-eyebrow">RF-07 • Chat Simplificado 50+</span>
          <h1 id="chat-heading" className="wave2-title">
            Suas conversas
          </h1>
        </div>
      </header>

      <div className="chat-shell">
        <aside className="chat-sidebar" aria-label="Lista de conexões">
          <h2 className="chat-sidebar__title">Conexões ({threads.length})</h2>
          <ul className="chat-thread-list">
            {threads.map((thread) => {
              const isSelected = activeThread?.contactId === thread.contactId;
              const lastMsg = thread.messages[thread.messages.length - 1];
              return (
                <li key={thread.contactId}>
                  <button
                    type="button"
                    className={`chat-thread-item${isSelected ? ' chat-thread-item--active' : ''}`}
                    onClick={() => onSelectThread(thread.contactId)}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <img
                      src={thread.contactAvatarUrl}
                      alt=""
                      className="chat-thread-item__avatar"
                      aria-hidden="true"
                    />
                    <div className="chat-thread-item__info">
                      <div className="chat-thread-item__top">
                        <strong className="chat-thread-item__name">{thread.contactName}</strong>
                        <span className="chat-thread-item__affinity">
                          {thread.affinityPercent}%
                        </span>
                      </div>
                      <span className="chat-thread-item__preview">
                        {lastMsg
                          ? lastMsg.text.slice(0, 44) + (lastMsg.text.length > 44 ? '...' : '')
                          : 'Nova conexão — diga olá!'}
                      </span>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span
                        className="chat-unread-badge"
                        aria-label={`${thread.unreadCount} mensagens não lidas`}
                      >
                        {thread.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {activeThread && (
          <div className="chat-conversation">
            <header className="chat-conversation__header">
              <div className="chat-conversation__contact">
                <img
                  src={activeThread.contactAvatarUrl}
                  alt={`Foto de ${activeThread.contactName}`}
                  className="chat-conversation__avatar"
                />
                <div>
                  <h2 className="chat-conversation__name">
                    {activeThread.contactName}, {activeThread.contactAge}
                  </h2>
                  <p className="chat-conversation__meta">
                    {activeThread.contactCity} • {activeThread.affinityPercent}% de afinidade •{' '}
                    {activeThread.contactGoal}
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

            <div className="chat-safety-tip" role="note">
              <strong>Dica de segurança:</strong> converse com calma pelo BeyondTime e nunca envie
              dinheiro, códigos ou dados bancários para pessoas recém-conhecidas.
            </div>

            {activeThread.sharedHobbies.length > 0 && (
              <div className="chat-shared-bar">
                <span className="chat-shared-bar__label">Em comum:</span>
                {activeThread.sharedHobbies.map((hobbyId) => (
                  <span key={hobbyId} className="candidate-hobby-chip candidate-hobby-chip--shared">
                    ★ {getHobbyLabel(hobbyId)}
                  </span>
                ))}
              </div>
            )}

            <div className="chat-messages" role="log" aria-live="polite" aria-label="Mensagens da conversa">
              {activeThread.messages.length === 0 ? (
                <div className="chat-empty-thread">
                  <p>
                    Vocês se conectaram por afinidade! Escolha uma sugestão abaixo ou escreva sua
                    própria mensagem para começar:
                  </p>
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

            <form className="chat-composer" onSubmit={handleSubmit}>
              <label htmlFor="chat-message-input" className="sr-only">
                Escreva sua mensagem para {activeThread.contactName}
              </label>
              <input
                id="chat-message-input"
                type="text"
                className="form-input chat-composer__input"
                placeholder={`Escreva uma mensagem para ${activeThread.contactName.split(' ')[0]}...`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn--primary chat-composer__send"
                disabled={draft.trim().length === 0}
              >
                <span>Enviar</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
