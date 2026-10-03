import { createHmac } from 'crypto';

export interface PlaygroundTokenPayload {
  playerId: string;
  email?: string;
  exp: number;
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

export function issuePlaygroundToken(playerId: string, secret: string, lifetimeSeconds = 86400, email?: string): string {
  const payload: PlaygroundTokenPayload = {
    playerId,
    email,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function parsePlaygroundToken(token: string, secret: string): PlaygroundTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(createHmac('sha256', secret).update(body).digest());
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as PlaygroundTokenPayload;
    if (!payload.playerId || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
