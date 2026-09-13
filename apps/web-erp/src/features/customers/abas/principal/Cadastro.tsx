import { Bloco, Campo, Grade, Selecao, Texto } from '../../campos';
import { formatarData, mascararCep, mascararDocumento, mascararTelefone } from '../../formato';
import { OPCOES_DE_TIPO, type PropsDaAba } from '../aba';
import { CampoDeTexto } from '../CampoDoFormulario';

/** Aba Principal, primeira metade: quem é o cliente, onde está e como falar
 *  com ele. */

const maiusculas = (valor: string) => valor.toUpperCase();
const soNumeros = (valor: string) => valor.replace(/[^0-9]/g, '');

export function Identificacao(props: PropsDaAba) {
  const { formulario, mudar, cliente } = props;
  const pessoaFisica = formulario.tipo === 'PF';
  return (
    <Bloco titulo="Identificação">
      <Grade colunas={4}>
        <Campo rotulo="Código" dica={cliente ? 'Gerado pelo sistema' : 'Gerado ao salvar'}>
          {({ id }) => (
            <Texto
              id={id}
              valor={cliente?.codigo ?? 'Novo cadastro'}
              aoMudar={() => undefined}
              disabled
            />
          )}
        </Campo>
        <Campo rotulo="Data da ficha">
          {({ id }) => (
            <Texto
              id={id}
              valor={
                // Cadastro antigo não guardou a criação: não inventa a data de hoje.
                cliente && !cliente.createdAt
                  ? 'Não registrada'
                  : formatarData(cliente?.createdAt ?? new Date().toISOString())
              }
              aoMudar={() => undefined}
              disabled
            />
          )}
        </Campo>
        <Campo rotulo="Tipo de pessoa">
          {({ id }) => (
            <Selecao
              id={id}
              valor={formulario.tipo}
              aoMudar={(valor) => mudar('tipo', valor)}
              opcoes={OPCOES_DE_TIPO}
            />
          )}
        </Campo>
        <CampoDeTexto
          aba={props}
          campo="documento"
          rotulo={pessoaFisica ? 'CPF' : 'CNPJ'}
          inputMode="numeric"
          mascara={mascararDocumento}
        />
        <CampoDeTexto
          aba={props}
          campo="razaoSocial"
          rotulo={pessoaFisica ? 'Nome completo' : 'Razão social'}
          largura={2}
          maxLength={160}
        />
        <CampoDeTexto
          aba={props}
          campo="nomeFantasia"
          rotulo={pessoaFisica ? 'Como chamar' : 'Nome fantasia'}
          dica="É o nome que aparece na fila, no pedido e na busca."
          largura={2}
          maxLength={160}
        />
      </Grade>
    </Bloco>
  );
}

export function Endereco(props: PropsDaAba) {
  return (
    <Bloco titulo="Endereço">
      <Grade colunas={6}>
        <CampoDeTexto
          aba={props}
          campo="cep"
          rotulo="CEP"
          inputMode="numeric"
          mascara={mascararCep}
        />
        <CampoDeTexto
          aba={props}
          campo="logradouro"
          rotulo="Logradouro"
          largura={3}
          maxLength={200}
        />
        <CampoDeTexto aba={props} campo="numero" rotulo="Número" maxLength={20} />
        <CampoDeTexto aba={props} campo="complemento" rotulo="Complemento" maxLength={120} />
        <CampoDeTexto aba={props} campo="bairro" rotulo="Bairro" largura={2} maxLength={120} />
        <CampoDeTexto aba={props} campo="cidade" rotulo="Cidade" largura={2} maxLength={120} />
        <CampoDeTexto aba={props} campo="uf" rotulo="UF" maxLength={2} mascara={maiusculas} />
        <CampoDeTexto
          aba={props}
          campo="codigoIbge"
          rotulo="Código IBGE"
          dica="Exigido pela NF-e"
          inputMode="numeric"
          maxLength={7}
          mascara={soNumeros}
        />
        <CampoDeTexto aba={props} campo="pais" rotulo="País" maxLength={60} />
      </Grade>
    </Bloco>
  );
}

export function Contato(props: PropsDaAba) {
  const telefone = { inputMode: 'tel' as const, mascara: mascararTelefone };
  return (
    <Bloco titulo="Contato">
      <Grade colunas={3}>
        <CampoDeTexto aba={props} campo="telefone1" rotulo="Telefone 1" {...telefone} />
        <CampoDeTexto aba={props} campo="telefone2" rotulo="Telefone 2" {...telefone} />
        <CampoDeTexto aba={props} campo="celular" rotulo="Celular" {...telefone} />
        <CampoDeTexto
          aba={props}
          campo="whatsapp"
          rotulo="WhatsApp"
          dica="Onde o cliente responde"
          {...telefone}
        />
        <CampoDeTexto aba={props} campo="email" rotulo="E-mail" type="email" />
        <CampoDeTexto
          aba={props}
          campo="emailNfe"
          rotulo="E-mail da NF-e"
          dica="Para onde vai o XML"
          type="email"
        />
      </Grade>
    </Bloco>
  );
}
