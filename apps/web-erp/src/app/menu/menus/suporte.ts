import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Suporte. O submenu de backup ainda espera captura de tela do Syndata. */
export const SUPORTE = montarMenu('Suporte', [
  item('Nós Ligamos para Você!'),
  item('Chat Online'),
  item('Boleto de Manutenção Disponível'),
  SEP,
  item('AnyDesk'),
  item('RustDesk'),
  SEP,
  // [inferido]
  submenu('Cópia de Segurança (Backup)', [item('Fazer Backup Agora'), item('Restaurar Backup')]),
  SEP,
  item('Instalador Certificado Digital'),
  SEP,
  item('Consultar Disponibilidade SEFAZ'),
  SEP,
  item('Verificar Atualização do Sistema'),
  item('Notas da Versão'),
  item('Dados de Instalação'),
]);
