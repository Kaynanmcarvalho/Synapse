import { item, montarMenu, SEPARADOR as SEP } from '../menu.utils';

/** Ferramentas. Todas as opcoes sao de primeiro nivel, como no Syndata. */
export const FERRAMENTAS = montarMenu('Ferramentas', [
  item('Manutenção de Usuários', { para: '/configuracoes/cargos' }),
  SEP,
  item('Gerar Carga Inicial para o PDV Offline'),
  item('Painel Sincronizador PDV Offline'),
  SEP,
  item('Histórico de Logs', { para: '/ferramentas/historico-de-logs' }),
  SEP,
  item('Autenticar Licença de Uso'),
  SEP,
  item('Boas Vindas'),
  item('Informativo'),
  item('Atualizar Notificações'),
  SEP,
  item('Autenticação de Usuário', { atalho: 'Ctrl+F12' }),
  SEP,
  item('Calculadora'),
  item('Controle de Impressoras'),
  SEP,
  item('Sobre', { atalho: 'Ctrl+F1' }),
]);
