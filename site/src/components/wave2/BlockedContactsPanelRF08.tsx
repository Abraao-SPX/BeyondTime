import type { BlockedContact } from '../../types/wave2';

interface BlockedContactsPanelRF08Props {
  blockedContacts: BlockedContact[];
  onUnblock: (contactId: string) => void;
}

export function BlockedContactsPanelRF08({
  blockedContacts,
  onUnblock,
}: BlockedContactsPanelRF08Props) {
  return (
    <div className="blocked-panel" aria-labelledby="blocked-panel-title">
      <div className="blocked-panel__header">
        <div>
          <span className="wave2-eyebrow">Segurança e Privacidade</span>
          <h2 id="blocked-panel-title" className="blocked-panel__title">
            Contatos bloqueados ({blockedContacts.length})
          </h2>
          <p className="blocked-panel__desc">
            Pessoas bloqueadas ficam imediatamente ocultas do seu feed e das suas conversas. Você
            pode desbloquear qualquer contato quando quiser.
          </p>
        </div>
      </div>

      {blockedContacts.length === 0 ? (
        <p className="blocked-panel__empty">
          Você não possui nenhum contato bloqueado no momento.
        </p>
      ) : (
        <ul className="blocked-list">
          {blockedContacts.map((contact) => (
            <li key={contact.id} className="blocked-list__item">
              <div className="blocked-list__person">
                <img
                  src={contact.avatarUrl}
                  alt=""
                  className="blocked-list__avatar"
                  aria-hidden="true"
                />
                <div>
                  <strong>
                    {contact.fullName}, {contact.age}
                  </strong>
                  <span className="blocked-list__meta">
                    {contact.city} • Bloqueado em {contact.blockedAt}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--secondary blocked-list__unblock-btn"
                onClick={() => onUnblock(contact.id)}
              >
                Desbloquear contato
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
