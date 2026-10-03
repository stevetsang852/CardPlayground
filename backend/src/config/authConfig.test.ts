import { isAuthBypassEnabled } from './authConfig';

describe('authConfig', () => {
  const original = process.env.DEBUG_AUTH_BYPASS;

  afterEach(() => {
    process.env.DEBUG_AUTH_BYPASS = original;
    jest.resetModules();
  });

  it('is off by default', () => {
    delete process.env.DEBUG_AUTH_BYPASS;
    jest.resetModules();
    const cfg = require('./authConfig');
    expect(cfg.isAuthBypassEnabled()).toBe(false);
  });

  it('turns on when DEBUG_AUTH_BYPASS=true', () => {
    process.env.DEBUG_AUTH_BYPASS = 'true';
    jest.resetModules();
    const cfg = require('./authConfig');
    expect(cfg.isAuthBypassEnabled()).toBe(true);
  });
});
