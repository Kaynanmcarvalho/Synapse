/** Mensagens de erro de login e de abertura de sessao, em linguagem de gente.
 *
 *  Credencial errada, e-mail inexistente e e-mail mal formado dao a mesma
 *  mensagem de proposito: dizer qual dos dois errou entrega a um curioso quais
 *  e-mails tem conta. */
export const mensagemDeErroDeLogin = (codigo?: string): string => {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-disabled':
      return 'Este usuário está bloqueado. Fale com o administrador da empresa.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor de autenticação.';
    default:
      return 'Não foi possível entrar. Tente de novo.';
  }
};

/** A senha passou, mas a API recusou abrir a sessao: o motivo esta no status e
 *  na mensagem que os guards de tenant devolvem. */
export const mensagemDeErroDaSessao = (status: number, mensagem?: string): string => {
  if (status === 401 && mensagem?.toLowerCase().includes('tenant')) {
    return 'Seu usuário ainda não está vinculado a uma empresa.';
  }
  if (status === 403 && mensagem === 'MFA_REQUIRED') {
    return 'Sua empresa exige verificação em duas etapas para este usuário.';
  }
  if (status === 403) return 'Seu usuário não tem acesso a esta empresa.';
  if (status >= 500) return 'O servidor do Synapse está com problema. Tente de novo em instantes.';
  return mensagem ?? 'Não foi possível abrir a sessão.';
};
