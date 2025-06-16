import { sanitizeDbName } from '../database/utils';

describe('sanitizeDbName', () => {
  it('removes invalid characters', () => {
    expect(sanitizeDbName('te st-123')).toBe('test123');
  });
});
