import { issuePlaygroundToken, parsePlaygroundToken } from './playgroundToken';

describe('playgroundToken', () => {
  const secret = 'test-secret';

  it('round-trips a valid token', () => {
    const token = issuePlaygroundToken('p1', secret, 60, 'a@b.c');
    const parsed = parsePlaygroundToken(token, secret);
    expect(parsed?.playerId).toBe('p1');
    expect(parsed?.email).toBe('a@b.c');
  });

  it('rejects a token signed with another secret', () => {
    const token = issuePlaygroundToken('p1', secret);
    expect(parsePlaygroundToken(token, 'other')).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = issuePlaygroundToken('p1', secret, -10);
    expect(parsePlaygroundToken(token, secret)).toBeNull();
  });
});
