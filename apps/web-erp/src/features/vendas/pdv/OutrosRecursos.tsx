/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { CashSession } from '@synapse/types';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Printer,
  Scale,
  Usb,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { formatarMoeda, lerMoeda } from '../../customers/formato';
import {
  conteudoDaEtiqueta,
  guardarConteudoDaEtiqueta,
  type ConteudoDaEtiqueta,
} from '../comum/balanca';
import { gavetaSuportada, trocarPortaDaGaveta } from '../comum/gaveta';
import { movimentarCaixa } from '../comum/vendas.api';
import { FechamentoDeCaixa } from './FechamentoDeCaixa';

/** Ctrl+A Outros Recursos: suprimento, sangria, fechamento do caixa, reimprimir
 *  a última venda, a impressora da gaveta e o que a etiqueta da balança traz. */

type Etapa = 'menu' | 'suprimento' | 'sangria' | 'fechar';

function Opcao({
  icone: Icone,
  titulo,
  descricao,
  aoEscolher,
  desabilitada = false,
}: {
  readonly icone: LucideIcon;
  readonly titulo: string;
  readonly descricao: string;
  readonly aoEscolher: () => void;
  readonly desabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      disabled={desabilitada}
      className="border-hairline-light hover:border-faint flex items-start gap-3 rounded-2xl border bg-white p-3 text-left transition disabled:opacity-40"
    >
      <span className="bg-surface-soft text-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Icone size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="text-body-sm text-ink block font-semibold">{titulo}</span>
        <span className="text-caption text-stone block">{descricao}</span>
      </span>
    </button>
  );
}

export function OutrosRecursos({
  caixa,
  temUltimaVenda,
  aoAtualizarCaixa,
  aoFecharCaixa,
  aoReimprimir,
  aoFechar,
}: {
  readonly caixa: CashSession;
  readonly temUltimaVenda: boolean;
  readonly aoAtualizarCaixa: (caixa: CashSession) => void;
  readonly aoFecharCaixa: (caixa: CashSession) => void;
  readonly aoReimprimir: () => void;
  readonly aoFechar: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>('menu');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [etiqueta, setEtiqueta] = useState<ConteudoDaEtiqueta>(conteudoDaEtiqueta);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (etapa === 'fechar') {
    return (
      <FechamentoDeCaixa
        caixa={caixa}
        aoFechado={aoFecharCaixa}
        aoVoltar={() => setEtapa('menu')}
      />
    );
  }

  const movimentar = async () => {
    const centavos = lerMoeda(valor);
    if (centavos <= 0 || motivo.trim().length < 3) {
      setMensagem('Informe o valor e o motivo (3 letras ou mais)');
      return;
    }
    setEnviando(true);
    setMensagem(null);
    try {
      const atualizado = await movimentarCaixa(
        caixa.id,
        etapa === 'suprimento' ? 'supply' : 'withdrawal',
        centavos,
        motivo.trim(),
      );
      aoAtualizarCaixa(atualizado);
      setMensagem(
        `${etapa === 'suprimento' ? 'Suprimento' : 'Sangria'} de ${formatarMoeda(centavos)} registrado`,
      );
      setValor('');
      setMotivo('');
      setEtapa('menu');
    } catch (falha: unknown) {
      setMensagem(falha instanceof Error ? falha.message : 'Não foi possível movimentar o caixa');
    } finally {
      setEnviando(false);
    }
  };

  const trocarGaveta = async () => {
    try {
      await trocarPortaDaGaveta();
      setMensagem('Impressora da gaveta escolhida');
    } catch (falha: unknown) {
      setMensagem(falha instanceof Error ? falha.message : 'Nenhuma porta escolhida');
    }
  };

  if (etapa === 'suprimento' || etapa === 'sangria') {
    return (
      <Modal
        onClose={() => setEtapa('menu')}
        title={etapa === 'suprimento' ? 'Suprimento' : 'Sangria'}
        description={`Em dinheiro na gaveta agora: ${formatarMoeda(caixa.expectedCash)}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEtapa('menu')} className={BOTAO_CLARO}>
              (Esc) Voltar
            </button>
            <button
              type="submit"
              form="movimento-de-caixa"
              disabled={enviando}
              className={BOTAO_ESCURO}
            >
              (Enter) Registrar
            </button>
          </div>
        }
      >
        <form
          id="movimento-de-caixa"
          onSubmit={(evento) => {
            evento.preventDefault();
            void movimentar();
          }}
          className="flex flex-col gap-3"
        >
          <label className="block">
            <span className="text-caption text-charcoal mb-1 block font-medium">Valor (R$)</span>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(evento) => setValor(evento.target.value.replace(/[^\d,]/g, ''))}
              placeholder="0,00"
              className={`${INPUT_DE_BUSCA} text-right tabular-nums`}
            />
          </label>
          <label className="block">
            <span className="text-caption text-charcoal mb-1 block font-medium">Motivo</span>
            <input
              value={motivo}
              maxLength={240}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder={etapa === 'suprimento' ? 'Troco do dia' : 'Depósito no cofre'}
              className={INPUT_DE_BUSCA}
            />
          </label>
          {mensagem ? <p className="text-caption text-[#b3242f]">{mensagem}</p> : null}
        </form>
      </Modal>
    );
  }

  return (
    <Modal onClose={aoFechar} title="Outros Recursos" size="lg">
      <div className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Opcao
            icone={ArrowDownToLine}
            titulo="Suprimento"
            descricao="Entrada de dinheiro na gaveta"
            aoEscolher={() => setEtapa('suprimento')}
          />
          <Opcao
            icone={ArrowUpFromLine}
            titulo="Sangria"
            descricao="Retirada de dinheiro da gaveta"
            aoEscolher={() => setEtapa('sangria')}
          />
          <Opcao
            icone={Lock}
            titulo="Fechar caixa"
            descricao="Conta o dinheiro e encerra o caixa"
            aoEscolher={() => setEtapa('fechar')}
          />
          <Opcao
            icone={Printer}
            titulo="Reimprimir última venda"
            descricao="Pedido ou NFC-e da última venda"
            aoEscolher={aoReimprimir}
            desabilitada={!temUltimaVenda}
          />
          <Opcao
            icone={Usb}
            titulo="Impressora da gaveta"
            descricao={
              gavetaSuportada()
                ? 'Escolhe a porta USB/serial da impressora'
                : 'Precisa do Chrome ou Edge'
            }
            aoEscolher={() => void trocarGaveta()}
            desabilitada={!gavetaSuportada()}
          />
          <div className="border-hairline-light flex items-start gap-3 rounded-2xl border bg-white p-3">
            <span className="bg-surface-soft text-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Scale size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="text-body-sm text-ink block font-semibold">Etiqueta da balança</span>
              <span className="text-caption text-stone mb-1.5 block">
                O que vem depois do código
              </span>
              <span className="bg-surface-soft inline-flex rounded-full p-1">
                {(['peso', 'valor'] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    aria-pressed={etiqueta === opcao}
                    onClick={() => {
                      guardarConteudoDaEtiqueta(opcao);
                      setEtiqueta(opcao);
                    }}
                    className={`text-caption h-7 rounded-full px-3 font-medium ${
                      etiqueta === opcao ? 'text-ink bg-white shadow-sm' : 'text-mute'
                    }`}
                  >
                    {opcao === 'peso' ? 'Peso' : 'Valor'}
                  </button>
                ))}
              </span>
            </span>
          </div>
        </div>
        {mensagem ? <p className="text-body-sm text-charcoal">{mensagem}</p> : null}
      </div>
    </Modal>
  );
}
