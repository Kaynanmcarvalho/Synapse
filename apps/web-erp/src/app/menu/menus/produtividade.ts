import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Produtividade. Os submenus ainda esperam captura de tela do Syndata. */
export const PRODUTIVIDADE = montarMenu('Produtividade', [
  // [inferido]
  submenu('Agendamentos', [item('Agenda'), item('Novo Agendamento')]),
  SEP,
  item('Checklist'),
  item('Mala Direta por Email'),
  item('Mensagem por WhatsApp'),
  item('Plano Fidelidade'),
  item('Lista de Presentes'),
  item('Controle de Cardápio / Catálogo Virtual'),
  SEP,
  // [inferido]
  submenu('Relatórios', [item('Clientes do Plano Fidelidade'), item('Mensagens Enviadas')]),
]);
