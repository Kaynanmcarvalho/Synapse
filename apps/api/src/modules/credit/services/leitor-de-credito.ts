import { Injectable } from '@nestjs/common';
import type {
  CadastroDoCliente,
  ParametrosDaAnalise,
  PedidoDeVenda,
  SituacaoDeCredito,
  Titulo,
} from '@synapse/types';
import { PARAMETROS_PADRAO } from '@synapse/validation';
import { POLITICA_PADRAO } from '../../finance/entities/credito-do-cliente';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import { situacaoDeCredito } from '../entities/situacao-de-credito';
import { ClienteRepository } from '../repositories/cliente.repository';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';

/** O fuso da operacao. Com o dia de Greenwich, um titulo que vence hoje
 *  apareceria vencido depois das 21h. */
const FUSO_DA_OPERACAO = 'America/Sao_Paulo';

export const hojeNaOperacao = (agora = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_DA_OPERACAO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);

const inteiroPositivo = (valor: string | undefined, padrao: number): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
};

/** Parametros da analise. A tolerancia de atraso e a do financeiro (c24-8);
 *  os limiares de amostra podem ser ajustados por ambiente sem mexer em codigo. */
export const parametrosDaAnalise = (env: NodeJS.ProcessEnv = process.env): ParametrosDaAnalise => ({
  ...PARAMETROS_PADRAO,
  toleranciaDeAtrasoDias: POLITICA_PADRAO.diasDeToleranciaAtraso,
  minimoDeTitulosLiquidados: inteiroPositivo(
    env['CREDITO_MINIMO_DE_TITULOS'],
    PARAMETROS_PADRAO.minimoDeTitulosLiquidados,
  ),
  minimoDePedidosParaComparar: inteiroPositivo(
    env['CREDITO_MINIMO_DE_PEDIDOS'],
    PARAMETROS_PADRAO.minimoDePedidosParaComparar,
  ),
});

export interface DadosDeCredito {
  readonly titulos: readonly Titulo[];
  readonly cadastro: CadastroDoCliente | null;
  readonly aprovados: readonly PedidoDeVenda[];
}

/** Le o que a situacao de credito de um cliente precisa — titulos, cadastro e
 *  pedidos aprovados — em paralelo, e monta o retrato. Usado pela ficha, pela
 *  decisao e pela entrada do pedido: todos veem o mesmo cliente. */
@Injectable()
export class LeitorDeCredito {
  readonly parametros = parametrosDaAnalise();

  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
    private readonly clientes: ClienteRepository,
  ) {}

  async dados(tenantId: string, customerId: string): Promise<DadosDeCredito> {
    const [titulos, cadastro, aprovados] = await Promise.all([
      this.titulos.listByCliente(tenantId, customerId),
      this.clientes.buscar(tenantId, customerId),
      this.pedidos.doClientePorSituacao(tenantId, customerId, 'APROVADO', 500),
    ]);
    return { titulos, cadastro, aprovados };
  }

  situacao(customerId: string, dados: DadosDeCredito, agora = new Date()): SituacaoDeCredito {
    return situacaoDeCredito({
      customerId,
      titulos: dados.titulos,
      cadastro: dados.cadastro,
      aprovados: dados.aprovados,
      parametros: this.parametros,
      hoje: hojeNaOperacao(agora),
      agora: agora.toISOString(),
    });
  }
}
