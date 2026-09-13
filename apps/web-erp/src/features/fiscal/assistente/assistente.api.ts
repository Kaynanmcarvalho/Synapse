import type { FiscalCompanyConfig } from '@synapse/types';
import { apiRequest } from '../../../lib/dev-auth';
import type { ConfigFiscalPayload } from './assistente.payload';

export interface ConfigFiscalAtual {
  /** A API usa o tenant como companyId da configuracao fiscal. */
  readonly companyId: string;
  readonly config: FiscalCompanyConfig | null;
}

export const carregarConfigFiscal = () => apiRequest<ConfigFiscalAtual>('/fiscal/config');

export const salvarConfigFiscal = (payload: ConfigFiscalPayload) =>
  apiRequest<FiscalCompanyConfig>('/fiscal/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export interface EnderecoDoCep {
  readonly street: string;
  readonly district: string;
  readonly cityName: string;
  readonly cityCode: string;
  readonly state: string;
}

/** ViaCEP, so quando o usuario clica na lupa. Sai do Synapse apenas o CEP. */
export const buscarCep = async (cep: string): Promise<EnderecoDoCep | null> => {
  if (!/^\d{8}$/.test(cep)) return null;
  let resposta: Response;
  try {
    resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  } catch {
    throw new Error('Sem conexão com o serviço de CEP. Preencha o endereço à mão.');
  }
  if (!resposta.ok) throw new Error('O serviço de CEP não respondeu. Tente de novo.');
  const corpo = (await resposta.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    ibge?: string;
    uf?: string;
  };
  if (corpo.erro) return null;
  return {
    street: corpo.logradouro ?? '',
    district: corpo.bairro ?? '',
    cityName: corpo.localidade ?? '',
    cityCode: corpo.ibge ?? '',
    state: corpo.uf ?? '',
  };
};

export const lerArquivoComoBase64 = (arquivo: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const url = String(leitor.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo do certificado.'));
    leitor.readAsDataURL(arquivo);
  });
