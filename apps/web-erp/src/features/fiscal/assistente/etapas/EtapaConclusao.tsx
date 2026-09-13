import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROTAS } from '../../../../app/rotas';
import { PROVEDORES, rotuloDoAmbiente } from '../assistente.dados';
import { formatarCfop, formatarDocumento, quando } from '../assistente.formato';
import type {
  FormularioFiscal,
  Pendencia,
  SegredosDigitados,
  SegredosGravados,
} from '../assistente.tipos';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '../campos';
import type { PropsDeFechamento } from './EtapaSincronia';

interface DadosDoResumo {
  readonly titulo: string;
  readonly valor: string;
  readonly detalhe: string;
}

const resumoDaEmpresa = ({ issuer, state }: FormularioFiscal): DadosDoResumo => ({
  titulo: 'Empresa',
  valor: issuer.tradeName || issuer.legalName || 'Sem nome',
  detalhe: `${issuer.document ? formatarDocumento(issuer.document) : 'Sem CNPJ'} · ${state || 'sem UF'}`,
});

const resumoDoAmbiente = ({ environment, provider }: FormularioFiscal): DadosDoResumo => ({
  titulo: 'Ambiente',
  valor: rotuloDoAmbiente(environment),
  detalhe: PROVEDORES.find((item) => item.valor === provider)?.rotulo ?? provider,
});

const resumoDoCertificado = (
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): DadosDoResumo => {
  const configurado = gravados.certificado || segredos.certificateBase64 !== '';
  return {
    titulo: 'Certificado digital',
    valor: configurado ? 'Configurado' : 'Pendente',
    detalhe:
      segredos.certificateFileName || (configurado ? 'Guardado no cofre' : 'Envie o A1 da empresa'),
  };
};

const resumoDaNfe = ({ nfeSeries, nfe }: FormularioFiscal): DadosDoResumo => ({
  titulo: 'NF-e',
  valor: `Série ${nfeSeries}`,
  detalhe: `Próximo nº ${nfe.nextNumber} · CFOP ${formatarCfop(nfe.cfopInState)}`,
});

const resumoDaNfce = (
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): DadosDoResumo => {
  const linhas = formulario.nfce.series.length;
  const csc = formulario.cscId !== '' && (gravados.csc || segredos.csc !== '');
  return {
    titulo: 'NFC-e',
    valor: `${linhas} ${linhas === 1 ? 'série' : 'séries'}`,
    detalhe: csc ? 'CSC configurado' : 'CSC pendente',
  };
};

const resumoDasPendencias = (
  pendencias: readonly Pendencia[],
  atualizadoEm: string | null,
): DadosDoResumo => ({
  titulo: 'Pendências',
  valor: pendencias.length === 0 ? 'Nenhuma' : String(pendencias.length),
  detalhe: `Última gravação: ${quando(atualizadoEm)}`,
});

export function EtapaConclusao({
  formulario,
  segredos,
  gravados,
  pendencias,
  sujo,
  salvando,
  atualizadoEm,
  aoConcluir,
}: PropsDeFechamento & {
  readonly formulario: FormularioFiscal;
  readonly segredos: SegredosDigitados;
  readonly gravados: SegredosGravados;
  readonly aoConcluir: () => void;
}) {
  const resumos = [
    resumoDaEmpresa(formulario),
    resumoDoAmbiente(formulario),
    resumoDoCertificado(segredos, gravados),
    resumoDaNfe(formulario),
    resumoDaNfce(formulario, segredos, gravados),
    resumoDasPendencias(pendencias, atualizadoEm),
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumos.map((resumo) => (
          <div key={resumo.titulo} className="border-hairline-light rounded-2xl border p-5">
            <p className="text-caption text-mute">{resumo.titulo}</p>
            <p className="text-heading-sm text-ink mt-2 truncate font-medium">{resumo.valor}</p>
            <p className="text-body-sm text-mute mt-1 truncate">{resumo.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" className={BOTAO_PRIMARIO} onClick={aoConcluir} disabled={salvando}>
          {salvando && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {sujo ? 'Salvar e concluir' : 'Concluir'}
        </button>
        <Link to={ROTAS.integracoes} className={BOTAO_SECUNDARIO}>
          Testar na Central de Integrações <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
