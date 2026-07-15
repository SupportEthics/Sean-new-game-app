import { describe, expect, it } from 'vitest';
import { checkForUpdate, versionNewer } from '../../src/services/UpdateCheck';

describe('update check', () => {
  it('compares dotted versions correctly', () => {
    expect(versionNewer('1.0.3', '1.0.2')).toBe(true);
    expect(versionNewer('1.1.0', '1.0.9')).toBe(true);
    expect(versionNewer('2.0', '1.9.9')).toBe(true);
    expect(versionNewer('1.0.2', '1.0.2')).toBe(false);
    expect(versionNewer('1.0.1', '1.0.2')).toBe(false);
    expect(versionNewer('1.0', '1.0.0')).toBe(false);
  });

  it('does nothing on non-native platforms', async () => {
    expect(await checkForUpdate()).toBeNull();
  });
});
