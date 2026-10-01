import { Button, Text } from '@synapse/sdl';
import { ArrowRight } from 'lucide-react';
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
import { Secao } from '../../../../components/formulario/Formulario';
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
    <Secao titulo="Resumo" descricao="O que vai para o servidor, por assunto.">
      {/* Leitura em grade de valores, sem cartão por item. */}
      <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {resumos.map((resumo) => (
          <div key={resumo.titulo} className="border-line-fina min-w-0 border-l-2 pl-4">
            <dt>
              <Text variant="rotulo">{resumo.titulo}</Text>
            </dt>
            <dd className="mt-0.5">
              <Text variant="tituloCartao" as="p" className="truncate">
                {resumo.valor}
              </Text>
              <Text variant="corpoSecundario" className="truncate">
                {resumo.detalhe}
              </Text>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button variant="primary" onClick={aoConcluir} loading={salvando}>
          {sujo ? 'Salvar e concluir' : 'Concluir'}
        </Button>
        <Link
          to={ROTAS.integracoes}
          className="text-button-sm text-primary rounded-minimo focus-visible:ring-primary/40 inline-flex items-center gap-1 underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          Testar na Central de Integrações <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </Secao>
  );
}
