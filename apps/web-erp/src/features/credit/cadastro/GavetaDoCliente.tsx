import type { CadastroDoCliente, FinancialStatus, SituacaoDeCredito } from '@synapse/types';
import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { formatarDataHora, formatarDocumento, formatarMoeda } from '../analise';
import { Situacao } from '../ui/Etiquetas';
import { BOTAO_ESCURO, Dado, Dados } from '../ui/Superficies';
import { useEscParaFechar } from '../ui/useEscParaFechar';

/** Mesma lista de `Dialogo` (`ui/Superficies.tsx`) e da Janela
 *  (`components/janela/Janela.tsx`) — elementos alcançáveis por Tab. */
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SITUACAO_FINANCEIRA: Record<
  FinancialStatus,
  { texto: string; tom: 'positivo' | 'atencao' | 'critico' }
> = {
  REGULAR: { texto: 'Regular', tom: 'positivo' },
  OVERDUE: { texto: 'Inadimplente', tom: 'atencao' },
  BLOCKED: { texto: 'Bloqueado', tom: 'critico' },
};

function Bloco({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <section className="border-hairline-light border-t px-5 py-4">
      <h3 className="text-caption text-stone mb-2.5 font-semibold uppercase tracking-[0.08em]">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Conteudo({
  cadastro,
  situacao,
}: {
  readonly cadastro: CadastroDoCliente;
  readonly situacao: SituacaoDeCredito;
}) {
  const status = cadastro.financialStatus ? SITUACAO_FINANCEIRA[cadastro.financialStatus] : null;
  const { address } = cadastro;
  const endereco = [
    [address.street, address.number].filter(Boolean).join(', '),
    address.complement,
    address.district,
    [address.city, address.state].filter(Boolean).join(' / '),
    address.postalCode ? `CEP ${address.postalCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : null,
  ].filter(Boolean);
  return (
    <>
      <Bloco titulo="Crédito">
        <Dados colunas={2}>
          <Dado rotulo="Limite">{formatarMoeda(cadastro.creditLimit)}</Dado>
          <Dado rotulo="Disponível">
            {situacao.disponivelCentavos === null
              ? null
              : formatarMoeda(situacao.disponivelCentavos)}
          </Dado>
          <Dado rotulo="Situação financeira" vazio="Não informada no cadastro">
            {status ? <Situacao texto={status.texto} tom={status.tom} /> : null}
          </Dado>
          <Dado rotulo="Condição padrão" vazio="Não informada no cadastro" />
        </Dados>
        {situacao.cadastro.faltando.length > 0 && (
          <p className="text-caption mt-2 text-[#8a4b00]">
            Falta para faturar: {situacao.cadastro.faltando.join(', ')}.
          </p>
        )}
      </Bloco>
      <Bloco titulo="Contatos">
        <Dados colunas={2}>
          <Dado rotulo="Telefone">{cadastro.phone}</Dado>
          <Dado rotulo="WhatsApp">{cadastro.whatsapp}</Dado>
          <Dado rotulo="E-mail" largo>
            {cadastro.email}
          </Dado>
        </Dados>
      </Bloco>
      <Bloco titulo="Endereço">
        {endereco.length ? (
          <p className="text-body-sm text-ink">{endereco.join(' · ')}</p>
        ) : (
          <p className="text-body-sm text-stone italic">Endereço não informado</p>
        )}
      </Bloco>
      <Bloco titulo="Comercial e observações">
        <Dados colunas={2}>
          <Dado rotulo="Vendedor responsável" vazio="Não informado no cadastro" />
          <Dado rotulo="Inscrição estadual">{cadastro.stateRegistration}</Dado>
          <Dado
            rotulo="Observações financeiras"
            largo
            vazio="O cadastro ainda não guarda observações financeiras"
          />
        </Dados>
      </Bloco>
    </>
  );
}

/** Gaveta lateral com o cadastro que ja veio na ficha: o analista confere
 *  contato, endereco e limite sem sair da analise. Editar abre o cadastro
 *  completo, que e o formulario real. */
// eslint-disable-next-line max-lines-per-function -- markup da gaveta inteira (cabeçalho, conteúdo, rodapé) mais os três efeitos de foco (§32-33); quebrar em sub-funções esconderia o fluxo em vez de simplificá-lo.
export function GavetaDoCliente({
  nome,
  cadastro,
  situacao,
  aoAbrirCompleto,
  aoFechar,
}: {
  readonly nome: string;
  readonly cadastro: CadastroDoCliente | null;
  readonly situacao: SituacaoDeCredito;
  readonly aoAbrirCompleto: () => void;
  readonly aoFechar: () => void;
}) {
  const painel = useRef<HTMLElement>(null);
  useEscParaFechar(aoFechar);

  // Precisa rodar ANTES do efeito que foca o painel abaixo: se captura
  // depois, "quem abriu" já seria o próprio painel (desmontado ao fechar),
  // e o foco largava em BODY em vez de voltar pra quem tinha foco de verdade.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    return () => anterior?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => painel.current?.focus(), []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Tab') return;
      const raiz = painel.current;
      if (!raiz) return;
      const focaveis = [...raiz.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (evento.shiftKey && (ativo === primeiro || ativo === raiz)) {
        evento.preventDefault();
        ultimo?.focus();
      } else if (!evento.shiftKey && (ativo === ultimo || ativo === raiz)) {
        evento.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Fechar o cadastro"
        onClick={aoFechar}
        className="bg-canvas-dark/20 animate-revelar absolute inset-0 motion-reduce:animate-none"
      />
      <aside
        ref={painel}
        tabIndex={-1}
        aria-label={`Cadastro de ${nome}`}
        className="bg-canvas-light shadow-janela animate-surgir relative flex h-full w-[min(440px,calc(100vw-24px))] flex-col outline-none motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-caption text-stone">Cadastro do cliente</p>
            <h2 className="font-display text-heading-sm text-ink truncate">
              {cadastro?.name || nome}
            </h2>
            <p className="text-body-sm text-charcoal tabular-nums">
              {formatarDocumento(cadastro?.taxId ?? null) || 'Sem CPF/CNPJ'}
              {cadastro?.codigo ? ` · código ${cadastro.codigo}` : ' · sem código interno'}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-charcoal hover:bg-surface-soft flex h-9 w-9 items-center justify-center rounded-full"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {cadastro ? (
            <Conteudo cadastro={cadastro} situacao={situacao} />
          ) : (
            <p className="text-body-sm text-stone px-5 py-4">
              Este cliente ainda não tem cadastro gravado. O cadastro completo abre com o que o
              último pedido trouxe.
            </p>
          )}
        </div>
        <footer className="border-hairline-light flex items-center gap-3 border-t px-5 py-3">
          <span className="text-caption text-stone flex-1">
            {cadastro?.updatedAt
              ? `Alterado em ${formatarDataHora(cadastro.updatedAt)} por ${cadastro.updatedByName ?? '—'}`
              : 'Sem alteração registrada'}
          </span>
          <button type="button" onClick={aoAbrirCompleto} className={BOTAO_ESCURO}>
            <ExternalLink size={14} aria-hidden="true" /> Abrir cadastro completo
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
