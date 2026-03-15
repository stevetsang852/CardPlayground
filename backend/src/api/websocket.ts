import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';
import { LeaderboardService } from '../services/leaderboardService';
import { LeaderboardType } from '../../../shared/src/types/leaderboard';
import { getDatabase } from '../config/database';

interface WebSocketClient extends WebSocket {
  userId?: string;
  subscriptions?: Set<string>;
}

const VALID_LEADERBOARD_TYPES: LeaderboardType[] = ['total_score', 'rarity_score', 'creativity'];
const LEADERBOARD_DEFAULT_LIMIT = 50;

export class WebSocketManager {
  private wss: WebSocketServer;
  private leaderboardWss: WebSocketServer;
  private galleryWss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map();
  private leaderboardService: LeaderboardService | null = null;
  private db: Firestore;

  constructor(server: Server, leaderboardService?: LeaderboardService, db?: Firestore) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.leaderboardWss = new WebSocketServer({ server, path: '/ws/leaderboards' });
    this.galleryWss = new WebSocketServer({ noServer: true });
    this.leaderboardService = leaderboardService || null;
    this.db = db || getDatabase();
    this.setupWebSocketServer();
    this.setupLeaderboardWebSocketServer();
    this.setupGalleryWebSocketServer(server);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocketClient, _req) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocketClient, message: any): Promise<void> {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.token);
        break;
      case 'subscribe':
        this.handleSubscribe(ws, message.channel);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.channel);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  private async handleAuth(ws: WebSocketClient, token: string): Promise<void> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      ws.userId = decodedToken.uid;

      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set());
      }
      this.clients.get(ws.userId)!.add(ws);

      ws.send(JSON.stringify({
        type: 'auth_success',
        userId: ws.userId
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid token'
      }));
      ws.close();
    }
  }

  private handleSubscribe(ws: WebSocketClient, channel: string): void {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }
    ws.subscriptions.add(channel);

    ws.send(JSON.stringify({
      type: 'subscribed',
      channel
    }));
  }

  private handleUnsubscribe(ws: WebSocketClient, channel: string): void {
    if (ws.subscriptions) {
      ws.subscriptions.delete(channel);
    }

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      channel
    }));
  }

  private handleDisconnect(ws: WebSocketClient): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
  }

  // Broadcast to specific user
  public sendToUser(userId: string, message: any): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const serialized = JSON.stringify(message);
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(serialized);
        }
      });
    }
  }

  // Broadcast event notification to a specific user
  public broadcastEventNotification(playerId: string, event: any): void {
    this.sendToUser(playerId, { type: 'event_notification', event });
  }

  // Broadcast to channel subscribers
  public broadcast(channel: string, message: any): void {
    const serialized = JSON.stringify(message);
    this.clients.forEach(userClients => {
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN &&
            client.subscriptions?.has(channel)) {
          client.send(serialized);
        }
      });
    });
  }

  private setupLeaderboardWebSocketServer(): void {
    this.leaderboardWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // Parse leaderboard type from query string, default to 'total_score'
      const reqUrl = new URL(req.url || '', `ws://${req.headers.host}`);
      const typeParam = reqUrl.searchParams.get('type') as LeaderboardType | null;
      const leaderboardType: LeaderboardType =
        typeParam && VALID_LEADERBOARD_TYPES.includes(typeParam) ? typeParam : 'total_score';

      console.log(`New leaderboard WebSocket connection, type: ${leaderboardType}`);

      if (!this.leaderboardService) {
        ws.send(JSON.stringify({ type: 'error', message: 'Leaderboard service unavailable' }));
        ws.close();
        return;
      }

      // Subscribe to real-time leaderboard updates
      const unsubscribe = this.leaderboardService.subscribeToLeaderboard(
        leaderboardType,
        LEADERBOARD_DEFAULT_LIMIT,
        (entries) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'leaderboard_update',
              leaderboardType,
              rankings: entries,
            }));
          }
        }
      );

      ws.on('close', () => {
        console.log(`Leaderboard WebSocket disconnected, type: ${leaderboardType}`);
        unsubscribe();
      });

      ws.on('error', (error) => {
        console.error('Leaderboard WebSocket error:', error);
        unsubscribe();
      });
    });
  }

  private setupGalleryWebSocketServer(server: Server): void {
    // Handle HTTP upgrade requests for /ws/gallery/:playerId paths
    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const url = req.url || '';
      const match = url.match(/^\/ws\/gallery\/([^/?]+)/);
      if (!match) return;

      this.galleryWss.handleUpgrade(req, socket as any, head, (ws) => {
        this.galleryWss.emit('connection', ws, req);
      });
    });

    this.galleryWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = req.url || '';
      const match = url.match(/^\/ws\/gallery\/([^/?]+)/);
      if (!match) {
        ws.close();
        return;
      }

      const playerId = match[1];
      console.log(`New gallery WebSocket connection for player: ${playerId}`);

      const unsubscribers: Array<() => void> = [];

      // Listener 1: gallery_update — watch the galleries/{playerId} document
      const galleryUnsub = this.db
        .collection('galleries')
        .doc(playerId)
        .onSnapshot((snapshot) => {
          if (!snapshot.exists) return;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'gallery_update',
              data: snapshot.data(),
            }));
          }
        });
      unsubscribers.push(galleryUnsub);

      // Listener 2: new_like / new_comment — watch gallery_interactions where galleryPlayerId == playerId
      const interactionsUnsub = this.db
        .collection('gallery_interactions')
        .where('galleryPlayerId', '==', playerId)
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const interaction = change.doc.data();
            if (ws.readyState !== WebSocket.OPEN) return;

            const messageType = interaction.type === 'like' ? 'new_like' : 'new_comment';
            ws.send(JSON.stringify({
              type: messageType,
              data: interaction,
            }));
          });
        });
      unsubscribers.push(interactionsUnsub);

      const cleanup = () => {
        unsubscribers.forEach((unsub) => unsub());
        console.log(`Gallery WebSocket disconnected for player: ${playerId}`);
      };

      ws.on('close', cleanup);
      ws.on('error', (error) => {
        console.error(`Gallery WebSocket error for player ${playerId}:`, error);
        cleanup();
      });
    });
  }
}
