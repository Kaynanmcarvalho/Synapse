import { ConsultaService } from './consulta.service';

/** Nenhum teste sai para a internet: o `fetch` responde com o que cada
 *  provedor devolveria. */
const resposta = (status: number, corpo: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => corpo,
  }) as Response;

const montar = (rotas: Record<string, () => Response>) => {
  const service = new ConsultaService();
  const chamadas: string[] = [];
  service.buscar = (async (url: string) => {
    chamadas.push(url);
    const rota = Object.entries(rotas).find(([prefixo]) => url.startsWith(prefixo));
    if (!rota) throw new Error(`sem rota para ${url}`);
    return rota[1]();
  }) as typeof fetch;
  return { service, chamadas };
};

const BRASILAPI_CNPJ = {
  cnpj: '11222333000181',
  razao_social: 'DISTRIBUIDORA NORTE LTDA',
  nome_fantasia: 'NORTE RACOES',
  descricao_situacao_cadastral: 'ATIVA',
  data_inicio_atividade: '2015-03-10',
  cnae_fiscal_descricao: 'Comércio atacadista de alimentos para animais',
  descricao_tipo_de_logradouro: 'RUA',
  logradouro: 'T-37',
  numero: '1450',
  complemento: 'SALA 2',
  bairro: 'SETOR BUENO',
  municipio: 'Goiânia',
  uf: 'GO',
  cep: '74230020',
  ddd_telefone_1: '6232415566',
  email: 'CONTATO@NORTE.COM.BR',
  opcao_pelo_simples: false,
  codigo_municipio_ibge: 5208707,
};

describe('ConsultaService', () => {
  it('preenche a ficha com o CNPJ da BrasilAPI', async () => {
    const { service } = montar({
      'https://brasilapi.com.br/api/cnpj': () => resposta(200, BRASILAPI_CNPJ),
    });
    const achado = await service.cnpj('11.222.333/0001-81');
    expect(achado).toMatchObject({
      razaoSocial: 'DISTRIBUIDORA NORTE LTDA',
      nomeFantasia: 'NORTE RACOES',
      abertura: '2015-03-10',
      telefone: '6232415566',
      email: 'contato@norte.com.br',
      simplesNacional: false,
      endereco: {
        logradouro: 'RUA T-37',
        numero: '1450',
        cidade: 'GOIÂNIA',
        uf: 'GO',
        cidadeCodigoIbge: '5208707',
        paisCodigo: '1058',
      },
    });
  });

  it('com a BrasilAPI fora, tenta a ReceitaWS e completa o IBGE pelo CEP', async () => {
    const { service, chamadas } = montar({
      'https://brasilapi.com.br/api/cnpj': () => resposta(503, {}),
      'https://www.receitaws.com.br': () =>
        resposta(200, {
          nome: 'DISTRIBUIDORA NORTE LTDA',
          fantasia: '',
          situacao: 'ATIVA',
          abertura: '10/03/2015',
          atividade_principal: [{ text: 'Comércio atacadista' }],
          logradouro: 'RUA T-37',
          numero: '1450',
          bairro: 'SETOR BUENO',
          municipio: 'GOIANIA',
          uf: 'GO',
          cep: '74.230-020',
          telefone: '(62) 3241-5566 / (62) 9999-0000',
          simples: { optante: true },
        }),
      'https://viacep.com.br': () =>
        resposta(200, {
          logradouro: 'Rua T-37',
          bairro: 'Setor Bueno',
          localidade: 'Goiânia',
          uf: 'GO',
          ibge: '5208707',
        }),
    });
    const achado = await service.cnpj('11222333000181');
    expect(achado.abertura).toBe('2015-03-10');
    expect(achado.telefone).toBe('6232415566');
    expect(achado.simplesNacional).toBe(true);
    expect(achado.endereco.cidadeCodigoIbge).toBe('5208707');
    expect(chamadas.some((url) => url.includes('viacep'))).toBe(true);
  });

  it('recusa CNPJ inválido sem sair para a internet', async () => {
    const { service, chamadas } = montar({});
    await expect(service.cnpj('11222333000100')).rejects.toThrow('CNPJ inválido');
    expect(chamadas).toHaveLength(0);
  });

  it('CNPJ que nenhum provedor conhece vira "não encontrado"', async () => {
    const { service } = montar({
      'https://brasilapi.com.br': () => resposta(404, {}),
      'https://www.receitaws.com.br': () => resposta(200, { status: 'ERROR' }),
      'https://api.opencnpj.org': () => resposta(404, {}),
    });
    await expect(service.cnpj('11222333000181')).rejects.toThrow('CNPJ não encontrado');
  });

  it('guarda a consulta: o mesmo CEP não vai duas vezes à internet', async () => {
    const { service, chamadas } = montar({
      'https://viacep.com.br': () =>
        resposta(200, {
          logradouro: 'Rua T-37',
          bairro: 'Setor Bueno',
          localidade: 'Goiânia',
          uf: 'GO',
          ibge: '5208707',
        }),
    });
    await service.cep('74230-020');
    const segundo = await service.cep('74230020');
    expect(segundo).toMatchObject({ cidade: 'Goiânia', cidadeCodigoIbge: '5208707' });
    expect(chamadas).toHaveLength(1);
  });

  it('procura município da UF sem acento e pelo código', async () => {
    const { service } = montar({
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/GO/municipios': () =>
        resposta(200, [
          { id: 5208707, nome: 'Goiânia' },
          { id: 5201405, nome: 'Aparecida de Goiânia' },
          { id: 5200258, nome: 'Águas Lindas de Goiás' },
        ]),
    });
    expect((await service.municipios('go', 'goiania')).map((m) => m.nome)).toEqual([
      'Aparecida de Goiânia',
      'Goiânia',
    ]);
    expect(await service.municipios('GO', '5208707')).toEqual([
      { codigo: '5208707', nome: 'Goiânia', uf: 'GO' },
    ]);
  });
});
