import type { Funcionario } from '@synapse/types';

const hoje = () => new Date().toISOString().slice(0, 10);

/** Vendedor liberado para uma venda de hoje. */
export const podeVender = (funcionario: Funcionario): boolean =>
  funcionario.comissao.vendedor &&
  !funcionario.bloqueado &&
  !(funcionario.demissao && funcionario.demissao <= hoje());
