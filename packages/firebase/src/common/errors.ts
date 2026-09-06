export class FirebaseConfigError extends Error {
  constructor(missing: readonly string[]) {
    super(`Configuracao do Firebase incompleta. Faltando: ${missing.join(', ')}`);
    this.name = 'FirebaseConfigError';
  }
}
