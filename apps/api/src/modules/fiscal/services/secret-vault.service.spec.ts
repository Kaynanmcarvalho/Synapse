import { randomBytes } from 'node:crypto';
import { SecretVaultService } from './secret-vault.service';

describe('SecretVaultService', () => {
  it('armazena certificado e senha cifrados', () => {
    process.env.FISCAL_MASTER_KEY = randomBytes(32).toString('base64');
    const vault = new SecretVaultService();
    vault.store('certificate', Buffer.from('pfx-secret'));
    expect(vault.read('certificate').toString()).toBe('pfx-secret');
    delete process.env.FISCAL_MASTER_KEY;
  });
});
