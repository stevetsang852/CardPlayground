/**
 * NetworkClient — HTTP fetch with exponential backoff retry and WebSocket reconnection.
 *
 * Validates Requirements: 12.4, 12.5
 */

const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 1s, 2s, 4s

export class NetworkClient {
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds (Requirement 12.4)

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch with exponential backoff retry (3 attempts: 1s, 2s, 4s).
   * Retries on network errors and 5xx responses.
   * Throws on 4xx (client errors) without retrying.
   */
  async fetchWithRetry(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500) {
          const isLastAttempt = attempt === maxRetries - 1;
          if (isLastAttempt) return response;
          await this._delay(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        const isLastAttempt = attempt === maxRetries - 1;
        const isTimeout = error.name === 'AbortError';
        const isNetworkError =
          isTimeout ||
          error.name === 'TypeError' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';

        if (!isNetworkError || isLastAttempt) {
          throw error;
        }

        await this._delay(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Connect a WebSocket with exponential backoff reconnection.
   * Automatically reconnects on close/error (up to maxReconnects times).
   */
  connectWebSocket(
    path: string,
    onMessage: (data: any) => void,
    maxReconnects: number = 5
  ): { ws: WebSocket; close: () => void } {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + path;
    let reconnectAttempt = 0;
    let closed = false;
    let ws: WebSocket;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch {
          onMessage(event.data);
        }
      };

      ws.onopen = () => {
        reconnectAttempt = 0; // reset on successful connection
      };

      ws.onclose = () => {
        if (closed || reconnectAttempt >= maxReconnects) return;
        const delay = RETRY_DELAYS_MS[Math.min(reconnectAttempt, RETRY_DELAYS_MS.length - 1)];
        reconnectAttempt++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, so reconnect is handled there
      };
    };

    connect();

    return {
      get ws() { return ws; },
      close() {
        closed = true;
        ws?.close();
      },
    };
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
