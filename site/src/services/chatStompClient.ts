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
  onConnectionChange?: (connected: boolean) => void;
}

export interface ChatStompConnection {
  sendMessage: (payload: SendEncryptedMessageDto) => boolean;
  sendReadReceipt: (conversationId: string) => boolean;
  disconnect: () => void;
}

/**
 * Cliente WebSocket STOMP para /ws-chat (RF-07) com autenticação Bearer JWT.
 */
export function createChatStompConnection(
  session: AuthSession,
  callbacks: ChatStompCallbacks
): ChatStompConnection {
  let isConnected = false;

  const client = new Client({
    brokerURL: getWebSocketChatUrl(),
    connectHeaders: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    onConnect: () => {
      isConnected = true;
      callbacks.onConnectionChange?.(true);

      client.subscribe('/user/queue/messages', (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as EncryptedMessageDto;
          callbacks.onMessage(parsed);
        } catch {
          // ignora frame malformado
        }
      });

      client.subscribe('/user/queue/read-receipts', (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as ReadReceiptEventDto;
          callbacks.onReadReceipt(parsed);
        } catch {
          // ignora frame malformado
        }
      });
    },
    onWebSocketClose: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
    },
    onStompError: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
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
      isConnected = false;
      void client.deactivate();
    },
  };
}
