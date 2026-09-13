import type { DetalheDoBoleto } from '@synapse/types';
import { ChevronDown } from 'lucide-react';
import { formatarData, formatarDataHora, formatarMoeda, formatarPercentual } from '../analise';
import { ROTULO_DO_BANCO, ROTULO_DO_BOLETO, ROTULO_DO_BOLETO_NO_BANCO } from '../rotulos';
import { Ausente, Dado, Dados, Secao } from '../ui/Superficies';
import { Copiar, LinhaDoTempo } from './partes';

function Ciclo({ boleto }: { readonly boleto: DetalheDoBoleto }) {
  return (
    <LinhaDoTempo
      formatar={formatarDataHora}
      itens={boleto.eventos.map((evento, indice) => ({
        chave: `${evento.em}-${indice}`,
        em: evento.em,
        titulo: evento.descricao,
        detalhe: [
          evento.codigo
            ? `${ROTULO_DO_BOLETO_NO_BANCO[evento.codigo as keyof typeof ROTULO_DO_BOLETO_NO_BANCO] ?? 'Código'} (${evento.codigo})`
            : null,
          evento.detalhe,
        ]
          .filter(Boolean)
          .join(' · '),
      }))}
    />
  );
}

/** Area do boleto: so o que foi gravado no registro. O Synapse registra boleto
 *  pela API do banco — nao ha arquivo de remessa nem de retorno CNAB, e a tela
 *  diz isso em vez de desenhar uma linha do tempo vazia. */
export function AreaDoBoleto({ boleto }: { readonly boleto: DetalheDoBoleto }) {
  return (
    <Secao titulo="Boleto">
      <Dados colunas={4}>
        <Dado rotulo="Banco" vazio="Conta bancária não encontrada">
          {boleto.bancoId
            ? `${ROTULO_DO_BANCO[boleto.bancoId]}${boleto.contaApelido ? ` · ${boleto.contaApelido}` : ''}`
            : null}
        </Dado>
        <Dado rotulo="Carteira">{boleto.carteira}</Dado>
        <Dado rotulo="Nosso número" vazio="Ainda não registrado">
          {boleto.nossoNumero}
        </Dado>
        <Dado rotulo="Número do documento">{boleto.numeroDoDocumento}</Dado>
        <Dado rotulo="Valor">{formatarMoeda(boleto.valorCentavos)}</Dado>
        <Dado rotulo="Emissão">{formatarData(boleto.emitidoEm)}</Dado>
        <Dado rotulo="Vencimento">{formatarData(boleto.vencimento)}</Dado>
        <Dado rotulo="Registro">
          {ROTULO_DO_BOLETO[boleto.situacao]}
          {boleto.situacaoNoBanco && (
            <span className="text-caption text-stone font-normal">
              {' '}
              · banco: {boleto.situacaoNoBanco}
            </span>
          )}
        </Dado>
        <Dado rotulo="Linha digitável" largo vazio="Disponível depois do registro">
          {boleto.linhaDigitavel ? (
            <span className="inline-flex flex-wrap items-center gap-2 break-all">
              {boleto.linhaDigitavel}
              <Copiar valor={boleto.linhaDigitavel} rotulo="Copiar a linha digitável" />
            </span>
          ) : null}
        </Dado>
        <Dado rotulo="Multa" vazio="Sem multa">
          {boleto.multaPercentual ? formatarPercentual(boleto.multaPercentual) : null}
        </Dado>
        <Dado rotulo="Juros ao mês" vazio="Sem juros">
          {boleto.jurosMensalPercentual ? formatarPercentual(boleto.jurosMensalPercentual) : null}
        </Dado>
        <Dado rotulo="Desconto" vazio="Sem desconto">
          {boleto.descontoCentavos ? formatarMoeda(boleto.descontoCentavos) : null}
        </Dado>
      </Dados>
      <div className="mt-4">
        <p className="text-caption text-charcoal mb-2 font-semibold">Ciclo do boleto</p>
        <Ciclo boleto={boleto} />
      </div>
      <details className="mt-3">
        <summary className="text-caption text-accent-link inline-flex cursor-pointer items-center gap-1 font-semibold">
          <ChevronDown size={13} aria-hidden="true" /> Informações técnicas
        </summary>
        <dl className="text-caption text-charcoal mt-2 grid gap-1">
          <div>Identificador no Synapse: {boleto.id}</div>
          <div>Integração: API do banco (sem remessa/retorno CNAB)</div>
          <div>
            PDF do boleto: {boleto.pdfDisponivel ? 'disponível no banco' : 'não disponível'}
          </div>
        </dl>
      </details>
      <Ausente texto="Remessa e retorno CNAB não se aplicam: o registro deste boleto foi feito pela API do banco." />
    </Secao>
  );
}
