import { Field, Select } from '@synapse/sdl';
import {
  AreaDeTexto,
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../../../components/formulario/Formulario';
import { escreverMoeda } from '../../formato';
import {
  OPCOES_DE_AUTORIZACAO,
  OPCOES_DE_INDICADOR_IE,
  OPCOES_DE_REGIME,
  OPCOES_DE_SITUACAO,
  type PropsDaAba,
} from '../aba';
import { CampoDeTexto } from '../CampoDoFormulario';

/** Aba Principal, segunda metade: fisco, comercial e crédito. Limite, dias para
 *  bloqueio, situação e autorização de pagamento são lidos pela análise de
 *  crédito — é por isso que ficam juntos.
 *
 *  Fase 6.2: migrado para `Secao`/`LinhaDeCampos` (mesma gramática das duas
 *  primeiras seções, Fase 6.1). Único obrigatório real do `clienteSchema`
 *  aqui é `creditLimit` — indicador de IE, regime, vendedores, praça/grupo,
 *  dias para bloqueio, situação e autorização têm todos default ou são
 *  opcionais. "Saldo em aberto" vira `ValoresDeLeitura` (calculado pelo
 *  financeiro, nunca editável — não é mais um input desabilitado fingindo
 *  ser consulta). "Limite a prazo" é o primeiro uso real de `MoneyInput`
 *  (via `CampoDeTexto moeda`): mesma string, mesma conversão por
 *  `lerMoeda`/`escreverMoeda` de sempre, só troca o desenho do campo. */

type Opcoes = ReadonlyArray<readonly [string, string]>;

const soNumeros = (valor: string) => valor.replace(/[^0-9]/g, '');

const CLASSIFICACOES = [
  ['ativo', 'Ativo'],
  ['inativo', 'Inativo'],
] as const;

export function Fiscal(props: PropsDaAba) {
  const { formulario, mudar } = props;
  return (
    <Secao titulo="Dados fiscais" descricao="Como a nota fiscal trata este cliente">
      <LinhaDeCampos>
        <Field label="Indicador da IE" span={1} className="w-56">
          <Select
            value={formulario.indicadorDeIe}
            onChange={(e) =>
              mudar('indicadorDeIe', e.target.value as typeof formulario.indicadorDeIe)
            }
          >
            {OPCOES_DE_INDICADOR_IE.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
        <CampoDeTexto
          aba={props}
          campo="inscricaoEstadual"
          rotulo="Inscrição estadual"
          inputMode="numeric"
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="inscricaoMunicipal"
          rotulo="Inscrição municipal"
          maxLength={20}
          larguraSemantica="medio"
        />
        <Field label="Regime tributário (CRT)" span={1} className="w-64">
          <Select
            value={formulario.regimeTributario}
            onChange={(e) =>
              mudar('regimeTributario', e.target.value as typeof formulario.regimeTributario)
            }
          >
            {OPCOES_DE_REGIME.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

/** Vendedor pela lista do cadastro de vendedores. Se o gravado não estiver mais
 *  na lista, ele aparece marcado assim — em vez de sumir calado do cadastro.
 *
 *  Fase 6.2 (auditoria §19-22): é uma seleção de entidade real, mas ligada —
 *  lista fechada (poucas dezenas de vendedores), sem criar/abrir cadastro
 *  relacionado. `CampoDeTabela` (`features/cadastros/comum`) é o lookup rico
 *  do sistema (código + lupa + busca + criar-novo, para universos grandes
 *  demais para uma lista). Os dois resolvem "escolher uma entidade" de
 *  formas genuinamente diferentes — não force unificação entre eles. */
function CampoDeVendedor({
  aba,
  campo,
  rotulo,
  vendedores,
}: {
  readonly aba: PropsDaAba;
  readonly campo: 'vendedor1' | 'vendedor2';
  readonly rotulo: string;
  readonly vendedores: Opcoes | null;
}) {
  if (!vendedores) {
    return (
      <CampoDeTexto
        aba={aba}
        campo={campo}
        rotulo={rotulo}
        dica="Cadastro de vendedores indisponível para este usuário"
        larguraSemantica="medio"
      />
    );
  }
  const atual = aba.formulario[campo];
  const opcoes: Opcoes =
    atual && !vendedores.some(([id]) => id === atual)
      ? [[atual, `${atual} (fora da lista)`], ...vendedores]
      : vendedores;
  return (
    <Field label={rotulo} span={1} className="w-64">
      <Select value={atual} onChange={(e) => aba.mudar(campo, e.target.value)}>
        {[['', 'Sem vendedor'], ...opcoes].map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function Comercial(props: PropsDaAba) {
  const { vendedores, sugestoes } = props;
  const lista: Opcoes | null = vendedores
    ? vendedores.map((vendedor) => [vendedor.id, vendedor.name] as const)
    : null;
  return (
    <Secao titulo="Classificação comercial" descricao="Carteira dos vendedores e agrupamentos">
      <LinhaDeCampos>
        <CampoDeVendedor aba={props} campo="vendedor1" rotulo="Vendedor (1)" vendedores={lista} />
        <CampoDeVendedor aba={props} campo="vendedor2" rotulo="Vendedor (2)" vendedores={lista} />
        <CampoDeTexto
          aba={props}
          campo="praca"
          rotulo="Praça / região"
          maxLength={80}
          sugestoes={sugestoes?.pracas}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="grupo"
          rotulo="Grupo"
          maxLength={80}
          sugestoes={sugestoes?.grupos}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="subGrupo"
          rotulo="Sub-grupo"
          maxLength={80}
          sugestoes={sugestoes?.subGrupos}
          larguraSemantica="medio"
        />
      </LinhaDeCampos>
    </Secao>
  );
}

/** Quem tira o cliente de inadimplente é o financeiro, e não o salvar do
 *  cadastro — a tela diz isso antes de a pessoa tentar. */
function AvisoDeInadimplencia() {
  return (
    <p className="text-caption mt-4 rounded-xl bg-[#fff3e0] px-3.5 py-2.5 text-[#8a4b00]">
      O financeiro aponta este cliente como inadimplente. Salvar o cadastro não muda isso — quem
      muda é o pagamento do título em aberto.
    </p>
  );
}

// eslint-disable-next-line max-lines-per-function -- 6 campos de crédito, cada um com seleção/máscara própria; quebrar em sub-funções esconderia a lista em vez de simplificá-la (mesmo raciocínio de `Endereco`, Fase 6.1).
export function Credito(props: PropsDaAba) {
  const { formulario, mudar, cliente } = props;
  return (
    <Secao
      titulo="Crédito e situação"
      descricao="O que a análise de crédito lê antes de liberar um pedido"
    >
      <ValoresDeLeitura
        itens={[
          {
            rotulo: 'Saldo em aberto',
            valor: `R$ ${escreverMoeda(cliente?.openCredit ?? 0)}`,
            dado: true,
          },
        ]}
      />
      <LinhaDeCampos>
        <CampoDeTexto
          aba={props}
          campo="limite"
          rotulo="Limite a prazo"
          moeda
          larguraSemantica="curto"
          obrigatorio
        />
        <Field label="Situação" span={1} className="w-56">
          <Select
            value={formulario.situacao}
            onChange={(e) => mudar('situacao', e.target.value as typeof formulario.situacao)}
          >
            {OPCOES_DE_SITUACAO.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Classificação" span={1} className="w-40">
          <Select
            value={formulario.ativo ? 'ativo' : 'inativo'}
            onChange={(e) => mudar('ativo', e.target.value === 'ativo')}
          >
            {CLASSIFICACOES.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
        <CampoDeTexto
          aba={props}
          campo="diasParaBloqueio"
          rotulo="Dias para bloqueio"
          dica="Vazio: vale a tolerância geral do financeiro."
          inputMode="numeric"
          alinharADireita
          mascara={soNumeros}
          larguraSemantica="curto"
        />
        <Field
          label="Autorização de pagamento"
          hint="Somente à vista: pedido a prazo pede aprovação excepcional."
          span={1}
          className="w-64"
        >
          <Select
            value={formulario.autorizacaoDePagamento}
            onChange={(e) =>
              mudar(
                'autorizacaoDePagamento',
                e.target.value as typeof formulario.autorizacaoDePagamento,
              )
            }
          >
            {OPCOES_DE_AUTORIZACAO.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
      </LinhaDeCampos>
      {cliente?.financialStatus === 'OVERDUE' ? <AvisoDeInadimplencia /> : null}
    </Secao>
  );
}

export function Observacao({ formulario, mudar }: PropsDaAba) {
  return (
    <Secao titulo="Observação" descricao="Aparece para quem atende este cliente">
      <Field
        label="Anotação que aparece no atendimento"
        hint="Inativo continua no histórico; a lista de clientes separa ativos e inativos."
      >
        <AreaDeTexto
          value={formulario.observacao}
          rows={3}
          onChange={(e) => mudar('observacao', e.target.value)}
        />
      </Field>
    </Secao>
  );
}
