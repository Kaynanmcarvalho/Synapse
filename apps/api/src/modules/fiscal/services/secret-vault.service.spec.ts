import { randomBytes } from 'node:crypto';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { SecretVaultService } from './secret-vault.service';

describe('SecretVaultService', () => {
  it('armazena certificado e senha cifrados de forma persistente', async () => {
    process.env.FISCAL_MASTER_KEY = randomBytes(32).toString('base64');
    const firestore = new FakeFirestore() as unknown as Firestore;
    const vault = new SecretVaultService(firestore);
    const reference = 'fiscal/tenant-1/certificate';
    await vault.store(reference, Buffer.from('pfx-secret'));
    const restarted = new SecretVaultService(firestore);
    expect((await restarted.read(reference)).toString()).toBe('pfx-secret');
    expect(JSON.stringify((firestore as unknown as FakeFirestore).caminhosTocados)).not.toContain(
      'pfx-secret',
    );
    delete process.env.FISCAL_MASTER_KEY;
  });
});
