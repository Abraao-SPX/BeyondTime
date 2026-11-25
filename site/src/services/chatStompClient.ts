import { Client, type IMessage } from '@stomp/stompjs';
import type { AuthSession } from '../types/auth';
import {
  getWebSocketChatUrl,
  type EncryptedMessageDto,
  type ReadReceiptEventDto,
  type SendEncryptedMessageDto,
} from './wave2ApiClient';

export interface ChatStompCallbacks {
  onMessage: (message: EncryptedMessageDto) => void;
  onReadReceipt: (receipt: ReadReceiptEventDto) => void;
  onError?: (friendlyMessage: string) => void;
  onReconnect?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface ChatStompConnection {
  sendMessage: (payload: SendEncryptedMessageDto) => boolean;
  sendReadReceipt: (conversationId: string) => boolean;
  disconnect: () => void;
}

const MAX_STOMP_RECONNECT_ATTEMPTS = 8;

/**
 * Cliente WebSocket STOMP para /ws-chat (RF-07) com autenticação Bearer JWT renovada via beforeConnect.
 */
export function createChatStompConnection(
  session: AuthSession,
  callbacks: ChatStompCallbacks
): ChatStompConnection {
  let isConnected = false;
  let hasConnectedOnce = false;
  let reconnectAttempts = 0;
  let manuallyDisconnected = false;
  const subscriptions: Array<{ unsubscribe: () => void }> = [];

  const clearSubscriptions = () => {
    while (subscriptions.length > 0) {
      const sub = subscriptions.pop();
      try {
        sub?.unsubscribe();
      } catch {
        // ignora assinatura já encerrada
      }
    }
  };

  const client = new Client({
    brokerURL: getWebSocketChatUrl(),
    connectHeaders: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    beforeConnect: () => {
      // Injeta sempre o JWT mais recente (inclusive após auto-refresh 401 — AUD-024)
      client.connectHeaders = {
        Authorization: `Bearer ${session.accessToken}`,
      };
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    onConnect: () => {
      const isReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      isConnected = true;
      reconnectAttempts = 0;
      client.reconnectDelay = 5000;
      callbacks.onConnectionChange?.(true);

      clearSubscriptions();
      subscriptions.push(
        client.subscribe('/user/queue/messages', (frame: IMessage) => {
          try {
            const parsed = JSON.parse(frame.body) as EncryptedMessageDto;
            callbacks.onMessage(parsed);
          } catch {
            // ignora frame malformado
          }
        })
      );

      subscriptions.push(
        client.subscribe('/user/queue/read-receipts', (frame: IMessage) => {
          try {
            const parsed = JSON.parse(frame.body) as ReadReceiptEventDto;
            callbacks.onReadReceipt(parsed);
          } catch {
            // ignora frame malformado
          }
        })
      );

      subscriptions.push(
        client.subscribe('/user/queue/errors', (frame: IMessage) => {
          try {
            const parsed = JSON.parse(frame.body) as { detail?: string };
            callbacks.onError?.(
              parsed.detail || 'Não foi possível enviar sua mensagem agora. Tente novamente.'
            );
          } catch {
            callbacks.onError?.('Não foi possível enviar sua mensagem agora. Tente novamente.');
          }
        })
      );

      if (isReconnect) {
        callbacks.onReconnect?.();
      }
    },
    onWebSocketClose: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
      if (manuallyDisconnected) return;
      reconnectAttempts += 1;
      if (reconnectAttempts >= MAX_STOMP_RECONNECT_ATTEMPTS) {
        client.reconnectDelay = 0;
        void client.deactivate();
      } else {
        client.reconnectDelay = Math.min(30000, 5000 * Math.pow(2, reconnectAttempts - 1));
      }
    },
    onStompError: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
      reconnectAttempts += 1;
      if (reconnectAttempts >= MAX_STOMP_RECONNECT_ATTEMPTS) {
        client.reconnectDelay = 0;
        void client.deactivate();
        callbacks.onError?.(
          'A conexão com o chat foi interrompida. Saia e entre novamente para continuar.'
        );
      }
    },
  });

  client.activate();

  return {
    sendMessage(payload: SendEncryptedMessageDto): boolean {
      if (!isConnected || !client.connected) return false;
      try {
        client.publish({
          destination: '/app/chat.send',
          body: JSON.stringify(payload),
        });
        return true;
      } catch {
        return false;
      }
    },
    sendReadReceipt(conversationId: string): boolean {
      if (!isConnected || !client.connected) return false;
      try {
        client.publish({
          destination: '/app/chat.read',
          body: JSON.stringify({ conversationId }),
        });
        return true;
      } catch {
        return false;
      }
    },
    disconnect(): void {
      manuallyDisconnected = true;
      isConnected = false;
      clearSubscriptions();
      void client.deactivate();
    },
  };
}
