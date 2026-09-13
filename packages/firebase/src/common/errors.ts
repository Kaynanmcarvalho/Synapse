export class FirebaseConfigError extends Error {
  constructor(missing: readonly string[]) {
    super(`Configuracao do Firebase incompleta. Faltando: ${missing.join(', ')}`);
    this.name = 'FirebaseConfigError';
  }
}

/** Problema no JSON da conta de servico. A mensagem diz o caminho e o motivo,
 *  mas nunca o conteudo — o arquivo carrega a chave privada. */
export class FirebaseCredentialFileError extends Error {
  constructor(caminho: string, motivo: string) {
    super(`Chave da conta de serviço inválida em ${caminho}: ${motivo}`);
    this.name = 'FirebaseCredentialFileError';
  }
}
