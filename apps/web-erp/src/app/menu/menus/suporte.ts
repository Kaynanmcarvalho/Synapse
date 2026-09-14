import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Suporte: o caminho curto até a ajuda da Muvta. É o único menu com ícones —
 *  WhatsApp e telefone no primeiro item, para quem precisa de socorro achar de
 *  relance. A cópia de segurança continua como estava no Syndata. */
export const SUPORTE = montarMenu('Suporte', [
  item('Mande-nos Mensagem ou Ligamos para Você!', { icone: 'whatsapp-telefone' }),
  item('Chat Online', { icone: 'chat' }),
  SEP,
  submenu(
    'Cópia de Segurança (Backup)',
    [item('Fazer Backup Agora'), item('Restaurar Backup')],
    undefined,
    'backup',
  ),
  SEP,
  item('Versão do Sistema', { icone: 'versao' }),
  item('Boleto de Manutenção Disponível', { icone: 'boleto' }),
]);
