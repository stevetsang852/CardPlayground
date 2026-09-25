export function isAuthBypassEnabled(): boolean {
  const flag = (process.env.DEBUG_AUTH_BYPASS || '').toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') {
    return true;
  }
  return false;
}

export function authSecret(): string {
  return process.env.AUTH_SECRET || 'cardplayground-local-dev-secret';
}

export function defaultDebugPlayerId(): string {
  return process.env.DEBUG_PLAYER_ID || 'debug-player';
}
