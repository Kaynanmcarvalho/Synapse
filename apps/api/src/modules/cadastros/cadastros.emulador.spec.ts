import { getAdminFirestore } from '@synapse/firebase/admin';
import type { AuditActor, Funcionario, Supplier, SupplierId, TenantId } from '@synapse/types';
import { FornecedorRepository } from '../catalog/repositories/fornecedor.repository';
import { FuncionarioRepository } from './funcionarios/funcionario.repository';
import { TabelaRepository } from './tabelas/tabela.repository';

/** Cadastros contra o emulador do Firestore, com concorrência de verdade. Roda
 *  com `pnpm test:emulador`; sem FIRESTORE_EMULATOR_HOST fica de fora.
 *  Cada teste usa um tenant próprio. */

const noEmulador = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

const ATOR: AuditActor = { uid: 'u' as AuditActor['uid'], email: '', name: 'Teste', source: 'api' };

noEmulador('cadastros no Firestore (emulador)', () => {
  jest.setTimeout(60_000);

  let db: ReturnType<typeof getAdminFirestore>;
  beforeAll(() => {
    db = getAdminFirestore();
  });
  afterAll(async () => {
    await db.terminate();
  });

  let tenantId = '';
  beforeEach(() => {
    tenantId = `cadastros-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  it('dez telas abrindo a mesma tabela ao mesmo tempo semeiam um GERAL só', async () => {
    const tabelas = new TabelaRepository(db);
    const leituras = await Promise.all(
      Array.from({ length: 10 }, () => tabelas.listar(tenantId, 'pracas')),
    );
    expect(leituras.every((itens) => itens.length === 1)).toBe(true);
    const novos = await Promise.all(
      ['NORTE', 'SUL', 'LESTE', 'OESTE'].map((nome) =>
        tabelas.criar(tenantId, 'pracas', { nome, ativo: true }, 'u'),
      ),
    );
    expect(novos.map((item) => item.codigo).sort()).toEqual([2, 3, 4, 5]);
  });

  it('o mesmo CNPJ enviado em paralelo vira um fornecedor só', async () => {
    const fornecedores = new FornecedorRepository(db);
    const base = (id: string): Supplier =>
      ({
        id: id as SupplierId,
        tenantId: tenantId as TenantId,
        taxId: '11222333000181',
        stateRegistration: '101234567',
        legalName: `Distribuidora ${id}`,
        tradeName: id,
        contacts: [],
        paymentTermId: null,
        averageLeadDays: 0,
        averagePrice: 0,
        productIds: [],
        active: true,
        codigo: null,
        createdAt: new Date().toISOString(),
        createdBy: ATOR,
        updatedAt: new Date().toISOString(),
        updatedBy: ATOR,
        version: 1,
      }) as Supplier;
    const resultados = await Promise.allSettled(
      Array.from({ length: 6 }, (_, indice) => fornecedores.criar(base(`f${indice}`))),
    );
    expect(resultados.filter((resultado) => resultado.status === 'fulfilled')).toHaveLength(1);
    expect(await fornecedores.todos(tenantId)).toHaveLength(1);
  });

  it('funcionários cadastrados ao mesmo tempo levam códigos seguidos', async () => {
    const funcionarios = new FuncionarioRepository(db);
    const ficha = (indice: number) =>
      ({
        id: `func-${indice}`,
        tenantId: tenantId as TenantId,
        codigo: 0,
        matricula: null,
        nome: `FUNCIONARIO ${indice}`,
        bloqueado: false,
        endereco: {
          cep: '',
          logradouro: '',
          bairro: '',
          cidadeCodigoIbge: null,
          cidade: '',
          uf: '',
        },
        telefone: null,
        celular: null,
        cargo: { codigo: 1, nome: 'GERAL' },
        praca: { codigo: 1, nome: 'GERAL' },
        departamento: { codigo: 1, nome: 'GERAL' },
        horaDeEntrada: null,
        horaDeSaida: null,
        admissao: '2026-01-01',
        demissao: null,
        salarioCentavos: 0,
        outrasInformacoes: {
          nascimento: null,
          sexo: 'NAO_INFORMADO',
          tipoSanguineo: null,
          escolaridade: null,
          email: null,
          pai: null,
          mae: null,
          estadoCivil: 'NAO_INFORMADO',
          conjuge: null,
          observacoes: null,
        },
        documentos: {
          identidade: null,
          cpf: null,
          pis: null,
          tituloDeEleitor: null,
          ctps: null,
          serieDaCtps: null,
          cnh: null,
          categoriaDaCnh: null,
        },
        comissao: {
          vendedor: true,
          percentualAVista: 0,
          percentualAPrazo: 0,
          base: 'FATURAMENTO',
          descontoMaximoPercentual: 0,
          metaMensalCentavos: 0,
        },
        usuario: null,
        fotoAtualizadaEm: null,
        createdAt: new Date().toISOString(),
        createdBy: ATOR,
        updatedAt: new Date().toISOString(),
        updatedBy: ATOR,
        version: 1,
      }) as Funcionario;
    const criados = await Promise.all(
      Array.from({ length: 8 }, (_, indice) => funcionarios.criar(ficha(indice))),
    );
    expect(criados.map((funcionario) => funcionario.codigo).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect((await funcionarios.vendedores(tenantId)).length).toBe(8);
  });
});
