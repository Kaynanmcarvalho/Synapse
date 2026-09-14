import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Auth } from '@synapse/firebase/admin';
import type {
  AuditActor,
  Funcionario,
  PaginaDeFuncionarios,
  PedidoDeVenda,
  PedidoDoVendedor,
  ResumoDoVendedor,
  TenantId,
} from '@synapse/types';
import type { FuncionarioInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import { PedidoDeVendaRepository } from '../../credit/repositories/pedido-de-venda.repository';
import { FIREBASE_AUTH } from '../../iam/firebase.tokens';
import type { TenantContext } from '../../iam/iam.types';
import { MembershipRepository } from '../../iam/repositories/membership.repository';
import { TabelaService } from '../tabelas/tabela.service';
import { FuncionarioRepository, funcionarioNaLista } from './funcionario.repository';
import { podeVender } from './pode-vender';
import { resumirVendedor } from './resumo-do-vendedor';

export { podeVender } from './pode-vender';

/** Tipos de imagem aceitos na foto e o maior arquivo: a foto mora num
 *  documento do Firestore (limite de 1 MiB) em base64, que cresce um terço. */
const TIPOS_DE_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAIOR_FOTO_EM_BYTES = 700 * 1024;

export interface UsuarioDoTenant {
  readonly uid: string;
  readonly email: string;
  readonly nome: string;
  readonly situacao: 'active' | 'blocked';
  readonly cargos: readonly string[];
  /** Funcionário que já usa este login, quando houver. */
  readonly funcionario: {
    readonly id: string;
    readonly codigo: number;
    readonly nome: string;
  } | null;
}

const hoje = () => new Date().toISOString().slice(0, 10);

/** O cadastro de funcionários: a ficha, a foto, o login ligado a ela e o que o
 *  funcionário vendeu (abas Documentos e Relatórios). */
@Injectable()
export class FuncionarioService {
  constructor(
    private readonly repositorio: FuncionarioRepository,
    private readonly tabelas: TabelaService,
    private readonly pedidosDeVenda: PedidoDeVendaRepository,
    private readonly membros: MembershipRepository,
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
  ) {}

  async listar(
    context: TenantContext,
    filtros: { readonly termo?: string; readonly limite: number; readonly cursor?: string | null },
  ): Promise<PaginaDeFuncionarios> {
    if (filtros.termo?.trim()) {
      const achados = await this.repositorio.procurar(
        context.tenantId,
        filtros.termo,
        filtros.limite,
      );
      return { itens: achados.map(funcionarioNaLista), proximoCursor: null };
    }
    return this.repositorio.listar(context.tenantId, {
      limite: filtros.limite,
      cursor: filtros.cursor ?? null,
    });
  }

  async buscar(context: TenantContext, id: string): Promise<Funcionario> {
    const funcionario = await this.repositorio.buscar(context.tenantId, id);
    if (!funcionario) throw new NotFoundException('Funcionário não encontrado');
    return funcionario;
  }

  /** Vendedores que podem entrar numa venda agora: marcados como vendedor, sem
   *  bloqueio e sem demissão até hoje. */
  async vendedoresAtivos(context: TenantContext, termo = ''): Promise<Funcionario[]> {
    const procurado = termo.trim().toLocaleUpperCase('pt-BR');
    return (await this.repositorio.vendedores(context.tenantId)).filter(
      (funcionario) =>
        podeVender(funcionario) &&
        (!procurado ||
          String(funcionario.codigo) === procurado ||
          funcionario.nome.toLocaleUpperCase('pt-BR').includes(procurado)),
    );
  }

  async criar(
    context: TenantContext,
    input: FuncionarioInput,
    autor: AuditActor,
  ): Promise<Funcionario> {
    const agora = new Date().toISOString();
    return this.repositorio.criar({
      ...(await this.ficha(context, input)),
      id: randomUUID(),
      tenantId: context.tenantId as TenantId,
      codigo: 0,
      usuario: null,
      fotoAtualizadaEm: null,
      createdAt: agora,
      createdBy: autor,
      updatedAt: agora,
      updatedBy: autor,
      version: 1,
    });
  }

  async atualizar(
    context: TenantContext,
    id: string,
    input: FuncionarioInput,
    autor: AuditActor,
  ): Promise<Funcionario> {
    const anterior = await this.buscar(context, id);
    return this.repositorio.atualizar({
      ...anterior,
      ...(await this.ficha(context, input)),
      updatedAt: new Date().toISOString(),
      updatedBy: autor,
      version: anterior.version + 1,
    });
  }

  async gravarFoto(
    context: TenantContext,
    id: string,
    arquivo: { readonly mimetype: string; readonly size: number; readonly buffer: Buffer },
  ): Promise<Funcionario> {
    if (!TIPOS_DE_FOTO.has(arquivo.mimetype))
      throw new BadRequestException('A foto precisa ser JPG, PNG ou WEBP');
    if (arquivo.size > MAIOR_FOTO_EM_BYTES)
      throw new BadRequestException('A foto passou de 700 KB: diminua a imagem e tente de novo');
    return this.repositorio.gravarFoto(context.tenantId, id, {
      tipo: arquivo.mimetype,
      base64: arquivo.buffer.toString('base64'),
      atualizadaEm: new Date().toISOString(),
    });
  }

  async lerFoto(context: TenantContext, id: string) {
    const foto = await this.repositorio.lerFoto(context.tenantId, id);
    if (!foto) throw new NotFoundException('Funcionário sem foto');
    return { tipo: foto.tipo, conteudo: Buffer.from(foto.base64, 'base64') };
  }

  removerFoto(context: TenantContext, id: string): Promise<Funcionario> {
    return this.repositorio.removerFoto(context.tenantId, id);
  }

  /** Logins do tenant, para "Manutenção de Usuário" ligar um deles à ficha. */
  async usuariosDoTenant(context: TenantContext): Promise<UsuarioDoTenant[]> {
    const membros = await this.membros.listByTenant(context.tenantId);
    const uids = membros.map((membro) => membro.authUid).filter(Boolean);
    const contas = new Map<string, { email: string; nome: string }>();
    for (let inicio = 0; inicio < uids.length; inicio += 100) {
      const lote = await this.auth.getUsers(
        uids.slice(inicio, inicio + 100).map((uid) => ({ uid })),
      );
      for (const conta of lote.users)
        contas.set(conta.uid, { email: conta.email ?? '', nome: conta.displayName ?? '' });
    }
    const vinculos = await Promise.all(
      uids.map((uid) => this.repositorio.porUsuario(context.tenantId, uid)),
    );
    return membros
      .map((membro, indice) => {
        const conta = contas.get(membro.authUid);
        const funcionario = vinculos[indice];
        return {
          uid: membro.authUid,
          email: conta?.email ?? '',
          nome: conta?.nome ?? '',
          situacao: membro.status,
          cargos: membro.roleIds,
          funcionario: funcionario
            ? { id: funcionario.id, codigo: funcionario.codigo, nome: funcionario.nome }
            : null,
        };
      })
      .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR'));
  }

  /** Liga (ou desliga, com `uid` nulo) o login do sistema a este funcionário.
   *  Um login serve a um funcionário só: é por ele que o PDV sabe quem vende. */
  async definirUsuario(
    context: TenantContext,
    id: string,
    uid: string | null,
    autor: AuditActor,
  ): Promise<Funcionario> {
    if (!uid) {
      return this.repositorio.alterar(context.tenantId, id, (funcionario) => ({
        ...funcionario,
        usuario: null,
        updatedAt: new Date().toISOString(),
        updatedBy: autor,
        version: funcionario.version + 1,
      }));
    }
    const membro = await this.membros.find(context.tenantId, uid);
    if (!membro) throw new NotFoundException('Usuário não pertence a esta empresa');
    const outro = await this.repositorio.porUsuario(context.tenantId, uid);
    if (outro && outro.id !== id)
      throw new ConflictException(`Este usuário já está ligado a ${outro.codigo} - ${outro.nome}`);
    const conta = await this.auth.getUser(uid);
    return this.repositorio.alterar(context.tenantId, id, (funcionario) => ({
      ...funcionario,
      usuario: { uid, email: conta.email ?? '', nome: conta.displayName ?? funcionario.nome },
      updatedAt: new Date().toISOString(),
      updatedBy: autor,
      version: funcionario.version + 1,
    }));
  }

  /** Aba Documentos: os pedidos em que o funcionário é o vendedor. */
  async pedidos(context: TenantContext, id: string): Promise<PedidoDoVendedor[]> {
    const funcionario = await this.buscar(context, id);
    return (await this.pedidosDoVendedor(context.tenantId, funcionario, null, 200)).map(
      (pedido) => ({
        id: pedido.id,
        numero: pedido.numero,
        clienteNome: pedido.clienteNome,
        situacao: pedido.situacao,
        tipo: pedido.tipo,
        totalCentavos: pedido.totalCentavos,
        enviadoEm: pedido.enviadoEm,
      }),
    );
  }

  /** Aba Relatórios: o mês corrente (ou o pedido, "2026-09") do vendedor. */
  async resumo(context: TenantContext, id: string, mes?: string): Promise<ResumoDoVendedor> {
    const funcionario = await this.buscar(context, id);
    const referencia = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoje().slice(0, 7);
    const pedidos = await this.pedidosDoVendedor(
      context.tenantId,
      funcionario,
      `${referencia}-01`,
      2000,
    );
    return resumirVendedor(funcionario, pedidos, referencia);
  }

  private async pedidosDoVendedor(
    tenantId: string,
    funcionario: Funcionario,
    desde: string | null,
    limite: number,
  ): Promise<PedidoDeVenda[]> {
    const [doFuncionario, doLogin] = await Promise.all([
      this.pedidosDeVenda.porCampo(tenantId, 'funcionarioId', funcionario.id, desde, limite),
      funcionario.usuario
        ? this.pedidosDeVenda.porCampo(
            tenantId,
            'vendedorId',
            funcionario.usuario.uid,
            desde,
            limite,
          )
        : Promise.resolve([]),
    ]);
    const unicos = new Map<string, PedidoDeVenda>();
    for (const pedido of [...doFuncionario, ...doLogin]) unicos.set(pedido.id, pedido);
    return [...unicos.values()].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
  }

  private async ficha(context: TenantContext, input: FuncionarioInput) {
    const [cargo, praca, departamento] = await Promise.all([
      this.tabelas.referencia(context, 'cargos', input.cargo, 'Cargo'),
      this.tabelas.referencia(context, 'pracas', input.praca, 'Praça / Região'),
      this.tabelas.referencia(context, 'departamentos', input.departamento, 'Departamento'),
    ]);
    return {
      matricula: input.matricula,
      nome: input.nome,
      bloqueado: input.bloqueado,
      endereco: input.endereco,
      telefone: input.telefone,
      celular: input.celular,
      cargo,
      praca,
      departamento,
      horaDeEntrada: input.horaDeEntrada,
      horaDeSaida: input.horaDeSaida,
      admissao: input.admissao,
      demissao: input.demissao,
      salarioCentavos: input.salarioCentavos,
      outrasInformacoes: input.outrasInformacoes,
      documentos: input.documentos,
      comissao: input.comissao,
    };
  }
}
