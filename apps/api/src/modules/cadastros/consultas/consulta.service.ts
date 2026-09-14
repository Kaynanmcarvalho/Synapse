import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConsultaDeCnpj } from '@synapse/types';
import { isValidCnpj } from '@synapse/validation';
import {
  digitos,
  lerCepBrasilApi,
  lerCepViaCep,
  lerCnpjBrasilApi,
  lerCnpjOpenCnpj,
  lerCnpjReceitaWs,
  texto,
  type EnderecoDoCep,
  type Json,
} from './leitores';

export type { EnderecoDoCep } from './leitores';

/** Consultas públicas que as fichas usam para não digitar à mão: CNPJ na
 *  Receita, CEP e municípios do IBGE. Cada uma tenta mais de um provedor —
 *  os gratuitos caem com frequência — e guarda a resposta por um tempo, para o
 *  mesmo CNPJ não ir três vezes à internet enquanto a ficha é preenchida.
 *
 *  Nenhum dado do tenant sai daqui: só o CNPJ, o CEP ou a UF consultados. */

export interface MunicipioIbge {
  readonly codigo: string;
  readonly nome: string;
  readonly uf: string;
}

const TEMPO_LIMITE_MS = 6_000;
const VALIDADE_DO_CACHE_MS = 6 * 60 * 60_000;

const semAcento = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');

@Injectable()
export class ConsultaService {
  private readonly logger = new Logger(ConsultaService.name);
  private readonly cache = new Map<string, { readonly em: number; readonly valor: unknown }>();

  /** Trocável no teste: nenhum teste sai para a internet. */
  buscar: typeof fetch = (entrada, opcoes) => globalThis.fetch(entrada, opcoes);

  async cnpj(entrada: string): Promise<ConsultaDeCnpj> {
    const cnpj = digitos(entrada);
    if (!isValidCnpj(cnpj)) throw new BadRequestException('CNPJ inválido');
    return this.lembrar(`cnpj:${cnpj}`, async () => {
      const provedores: readonly [string, () => Promise<ConsultaDeCnpj | null>][] = [
        ['brasilapi', () => this.cnpjBrasilApi(cnpj)],
        ['receitaws', () => this.cnpjReceitaWs(cnpj)],
        ['opencnpj', () => this.cnpjOpenCnpj(cnpj)],
      ];
      const achado = await this.primeiro(provedores);
      if (!achado) throw new NotFoundException('CNPJ não encontrado nos serviços da Receita');
      if (achado.endereco.cidadeCodigoIbge || !achado.endereco.cep) return achado;
      const doCep = await this.cep(achado.endereco.cep).catch(() => null);
      return doCep?.cidadeCodigoIbge
        ? { ...achado, endereco: { ...achado.endereco, cidadeCodigoIbge: doCep.cidadeCodigoIbge } }
        : achado;
    });
  }

  async cep(entrada: string): Promise<EnderecoDoCep> {
    const cep = digitos(entrada);
    if (cep.length !== 8) throw new BadRequestException('CEP tem 8 dígitos');
    return this.lembrar(`cep:${cep}`, async () => {
      const achado = await this.primeiro([
        ['viacep', () => this.cepViaCep(cep)],
        ['brasilapi', () => this.cepBrasilApi(cep)],
      ]);
      if (!achado) throw new NotFoundException('CEP não encontrado');
      return achado;
    });
  }

  /** Municípios da UF, para a lupa da cidade. */
  async municipios(ufEntrada: string, termo = ''): Promise<MunicipioIbge[]> {
    const uf = texto(ufEntrada).toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) throw new BadRequestException('UF tem 2 letras');
    const todos = await this.lembrar(`municipios:${uf}`, async () => {
      const lista = await this.json(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      );
      if (!Array.isArray(lista) || lista.length === 0)
        throw new BadGatewayException('O IBGE não respondeu a lista de municípios');
      return (lista as Json[])
        .map((item) => ({ codigo: texto(item['id']), nome: texto(item['nome']), uf }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });
    const procurado = semAcento(termo.trim());
    return procurado
      ? todos.filter(
          (item) => semAcento(item.nome).includes(procurado) || item.codigo === procurado,
        )
      : todos;
  }

  /** O município do código IBGE — quando a ficha digita o código na mão. */
  async municipio(codigoEntrada: string): Promise<MunicipioIbge> {
    const codigo = digitos(codigoEntrada);
    if (codigo.length !== 7) throw new BadRequestException('Código IBGE tem 7 dígitos');
    return this.lembrar(`municipio:${codigo}`, async () => {
      const dados = (await this.json(
        `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codigo}`,
      )) as Json | null;
      const nome = texto(dados?.['nome']);
      if (!dados || !nome) throw new NotFoundException('Código IBGE não encontrado');
      const uf =
        texto(
          (
            (((dados['microrregiao'] as Json | undefined)?.['mesorregiao'] as Json | undefined)?.[
              'UF'
            ] ?? {}) as Json
          )['sigla'],
        ) ||
        texto(
          (
            ((
              (dados['regiao-imediata'] as Json | undefined)?.['regiao-intermediaria'] as
                Json | undefined
            )?.['UF'] ?? {}) as Json
          )['sigla'],
        );
      return { codigo, nome, uf };
    });
  }

  private async cnpjBrasilApi(cnpj: string): Promise<ConsultaDeCnpj | null> {
    return lerCnpjBrasilApi(cnpj, await this.json(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`));
  }

  private async cnpjReceitaWs(cnpj: string): Promise<ConsultaDeCnpj | null> {
    return lerCnpjReceitaWs(cnpj, await this.json(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`));
  }

  private async cnpjOpenCnpj(cnpj: string): Promise<ConsultaDeCnpj | null> {
    return lerCnpjOpenCnpj(cnpj, await this.json(`https://api.opencnpj.org/${cnpj}`));
  }

  private async cepViaCep(cep: string): Promise<EnderecoDoCep | null> {
    return lerCepViaCep(cep, await this.json(`https://viacep.com.br/ws/${cep}/json/`));
  }

  private async cepBrasilApi(cep: string): Promise<EnderecoDoCep | null> {
    return lerCepBrasilApi(cep, await this.json(`https://brasilapi.com.br/api/cep/v1/${cep}`));
  }

  private async primeiro<T>(
    provedores: readonly [string, () => Promise<T | null>][],
  ): Promise<T | null> {
    for (const [nome, consultar] of provedores) {
      try {
        const achado = await consultar();
        if (achado) return achado;
      } catch (erro) {
        this.logger.warn(`consulta ${nome} falhou: ${(erro as Error).message}`);
      }
    }
    return null;
  }

  /** GET com tempo limite. 404 é "não achou" (null); o resto é falha do provedor. */
  private async json(url: string): Promise<unknown> {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const resposta = await this.buscar(url, {
        signal: controle.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'Synapse-ERP' },
      });
      if (resposta.status === 404) return null;
      if (!resposta.ok) throw new Error(`${resposta.status} ${resposta.statusText}`);
      return await resposta.json();
    } finally {
      clearTimeout(relogio);
    }
  }

  private async lembrar<T>(chave: string, obter: () => Promise<T>): Promise<T> {
    const guardado = this.cache.get(chave);
    if (guardado && Date.now() - guardado.em < VALIDADE_DO_CACHE_MS) return guardado.valor as T;
    const valor = await obter();
    this.cache.set(chave, { em: Date.now(), valor });
    if (this.cache.size > 2_000) this.cache.delete(this.cache.keys().next().value as string);
    return valor;
  }
}
