import { Area, Bloco, Campo, Grade, Selecao, Texto } from '../../campos';
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
 *  crédito — é por isso que ficam juntos. */

type Opcoes = ReadonlyArray<readonly [string, string]>;

const soNumeros = (valor: string) => valor.replace(/[^0-9]/g, '');

const CLASSIFICACOES = [
  ['ativo', 'Ativo'],
  ['inativo', 'Inativo'],
] as const;

export function Fiscal(props: PropsDaAba) {
  const { formulario, mudar } = props;
  return (
    <Bloco titulo="Dados fiscais">
      <Grade colunas={4}>
        <Campo rotulo="Indicador da IE">
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.indicadorDeIe}
              aoMudar={(valor) => mudar('indicadorDeIe', valor)}
              opcoes={OPCOES_DE_INDICADOR_IE}
            />
          )}
        </Campo>
        <CampoDeTexto
          aba={props}
          campo="inscricaoEstadual"
          rotulo="Inscrição estadual"
          inputMode="numeric"
        />
        <CampoDeTexto
          aba={props}
          campo="inscricaoMunicipal"
          rotulo="Inscrição municipal"
          maxLength={20}
        />
        <Campo rotulo="Regime tributário (CRT)">
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.regimeTributario}
              aoMudar={(valor) => mudar('regimeTributario', valor)}
              opcoes={OPCOES_DE_REGIME}
            />
          )}
        </Campo>
      </Grade>
    </Bloco>
  );
}

/** Vendedor pela lista do cadastro de vendedores. Se o gravado não estiver mais
 *  na lista, ele aparece marcado assim — em vez de sumir calado do cadastro. */
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
      />
    );
  }
  const atual = aba.formulario[campo];
  const opcoes: Opcoes =
    atual && !vendedores.some(([id]) => id === atual)
      ? [[atual, `${atual} (fora da lista)`], ...vendedores]
      : vendedores;
  return (
    <Campo rotulo={rotulo}>
      {({ id }) => (
        <Selecao
          id={id}
          valor={atual}
          aoMudar={(valor) => aba.mudar(campo, valor)}
          opcoes={[['', 'Sem vendedor'], ...opcoes]}
        />
      )}
    </Campo>
  );
}

export function Comercial(props: PropsDaAba) {
  const { vendedores, sugestoes } = props;
  const lista: Opcoes | null = vendedores
    ? vendedores.map((vendedor) => [vendedor.id, vendedor.name] as const)
    : null;
  return (
    <Bloco titulo="Classificação comercial">
      <Grade colunas={3}>
        <CampoDeVendedor aba={props} campo="vendedor1" rotulo="Vendedor (1)" vendedores={lista} />
        <CampoDeVendedor aba={props} campo="vendedor2" rotulo="Vendedor (2)" vendedores={lista} />
        <CampoDeTexto
          aba={props}
          campo="praca"
          rotulo="Praça / região"
          maxLength={80}
          sugestoes={sugestoes?.pracas}
        />
        <CampoDeTexto
          aba={props}
          campo="grupo"
          rotulo="Grupo"
          maxLength={80}
          sugestoes={sugestoes?.grupos}
        />
        <CampoDeTexto
          aba={props}
          campo="subGrupo"
          rotulo="Sub-grupo"
          maxLength={80}
          sugestoes={sugestoes?.subGrupos}
        />
      </Grade>
    </Bloco>
  );
}

export function Credito(props: PropsDaAba) {
  const { formulario, mudar, cliente } = props;
  return (
    <Bloco titulo="Crédito e situação">
      <Grade colunas={3}>
        <CampoDeTexto
          aba={props}
          campo="limite"
          rotulo="Limite a prazo (R$)"
          inputMode="decimal"
          alinharADireita
        />
        <Campo
          rotulo="Saldo em aberto (R$)"
          dica={cliente ? 'Calculado pelo financeiro' : 'Só depois do primeiro pedido'}
        >
          {({ id }) => (
            <Texto
              id={id}
              valor={escreverMoeda(cliente?.openCredit ?? 0)}
              aoMudar={() => undefined}
              alinharADireita
              disabled
            />
          )}
        </Campo>
        <CampoDeTexto
          aba={props}
          campo="diasParaBloqueio"
          rotulo="Dias para bloqueio"
          dica="Vazio: vale a tolerância geral do financeiro."
          inputMode="numeric"
          alinharADireita
          mascara={soNumeros}
        />
        <Campo rotulo="Situação">
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.situacao}
              aoMudar={(valor) => mudar('situacao', valor)}
              opcoes={OPCOES_DE_SITUACAO}
            />
          )}
        </Campo>
        <Campo rotulo="Classificação">
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.ativo ? 'ativo' : 'inativo'}
              aoMudar={(valor) => mudar('ativo', valor === 'ativo')}
              opcoes={CLASSIFICACOES}
            />
          )}
        </Campo>
        <Campo
          rotulo="Autorização de pagamento"
          dica="Somente à vista: pedido a prazo pede aprovação excepcional."
        >
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.autorizacaoDePagamento}
              aoMudar={(valor) => mudar('autorizacaoDePagamento', valor)}
              opcoes={OPCOES_DE_AUTORIZACAO}
            />
          )}
        </Campo>
      </Grade>
      {cliente?.financialStatus === 'OVERDUE' ? (
        <p className="text-caption mt-3 text-[#8a4b00]">
          O financeiro aponta este cliente como inadimplente. Salvar o cadastro não muda isso — quem
          muda é o pagamento do título em aberto.
        </p>
      ) : null}
    </Bloco>
  );
}

export function Observacao({ formulario, mudar }: PropsDaAba) {
  return (
    <Bloco titulo="Observação">
      <Campo
        rotulo="Anotação que aparece no atendimento"
        dica="Inativo continua no histórico; a lista de clientes separa ativos e inativos."
        largura="tudo"
      >
        {({ id }) => (
          <Area
            id={id}
            valor={formulario.observacao}
            linhas={3}
            aoMudar={(valor) => mudar('observacao', valor)}
          />
        )}
      </Campo>
    </Bloco>
  );
}
