import { Field, Input, Select } from '@synapse/sdl';
import { LoaderCircle, Search } from 'lucide-react';
import { useState } from 'react';
import {
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../../../components/formulario/Formulario';
import { BuscaDeMunicipio } from '../../../cadastros/comum/BuscaDeMunicipio';
import { buscarMunicipio, type MunicipioIbge } from '../../../cadastros/comum/cadastros.api';
import { BOTAO_ICONE } from '../../../cadastros/comum/estilos';
import { LARGURA_DE_CAMPO } from '../../../../components/formulario/larguras';
import type { FormularioDoCliente } from '../../formulario';
import { formatarData, mascararCep, mascararDocumento, mascararTelefone } from '../../formato';
import { OPCOES_DE_TIPO, type PropsDaAba } from '../aba';
import { CampoDeTexto } from '../CampoDoFormulario';

/** Aba Principal, primeira metade: quem é o cliente, onde está e como falar
 *  com ele.
 *
 *  Fase 6.1 — Form Grammar (Fase 6) provada no terceiro piloto: `Secao` em
 *  vez de cartão dentro de cartão, largura por forma do dado em vez de grade
 *  de 4/6 colunas, `ValoresDeLeitura` para código e data (nunca mais input
 *  desabilitado fingindo ser consultivo). Obrigatório vem do mesmo
 *  `clienteSchema` que valida o envio — não é um "*" solto: documento, nome,
 *  logradouro, número, bairro, cidade, UF e CEP são os únicos campos que o
 *  schema não aceita vazios.
 *
 *  Fase 6.2 (§19-25): "Código IBGE" ganha a lupa de cidade que
 *  `EnderecoDaFicha` (Funcionário/Fornecedor) já provou — mesma API
 *  (`buscarMunicipio`), mesmo `BuscaDeMunicipio` (Modal com UF + busca por
 *  nome/código), segundo consumidor real. Não é `CampoDeTabela` (não cria
 *  cidade nova, não resolve por código de tabela auxiliar) nem `Selecao`
 *  (universo grande demais para uma lista) — é o caso que já existe para
 *  esta forma exata de dado, agora também em Cliente. */

const maiusculas = (valor: string) => valor.toUpperCase();
const soNumeros = (valor: string) => valor.replace(/[^0-9]/g, '');

export function Identificacao(props: PropsDaAba) {
  const { formulario, mudar, cliente } = props;
  const pessoaFisica = formulario.tipo === 'PF';
  return (
    <Secao
      titulo="Identificação"
      descricao="Documento e nomes que o sistema usa para achar o cliente"
    >
      <ValoresDeLeitura
        itens={[
          {
            rotulo: 'Código',
            valor: cliente?.codigo ?? 'Novo cadastro',
            dado: true,
          },
          {
            rotulo: 'Data da ficha',
            // Cadastro antigo não guardou a criação: não inventa a data de hoje.
            valor:
              cliente && !cliente.createdAt
                ? 'Não registrada'
                : formatarData(cliente?.createdAt ?? new Date().toISOString()),
            dado: true,
          },
        ]}
      />
      <LinhaDeCampos>
        <Field label="Tipo de pessoa" span={1} className="w-40">
          <Select
            value={formulario.tipo}
            onChange={(e) => mudar('tipo', e.target.value as FormularioDoCliente['tipo'])}
          >
            {OPCOES_DE_TIPO.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </Field>
        <CampoDeTexto
          aba={props}
          campo="documento"
          rotulo={pessoaFisica ? 'CPF' : 'CNPJ'}
          inputMode="numeric"
          mascara={mascararDocumento}
          larguraSemantica="medio"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="razaoSocial"
          rotulo={pessoaFisica ? 'Nome completo' : 'Razão social'}
          maxLength={160}
          larguraSemantica="resto"
        />
        <CampoDeTexto
          aba={props}
          campo="nomeFantasia"
          rotulo={pessoaFisica ? 'Como chamar' : 'Nome fantasia'}
          dica="É o nome que aparece na fila, no pedido e na busca."
          maxLength={160}
          larguraSemantica="resto"
          obrigatorio
        />
      </LinhaDeCampos>
    </Secao>
  );
}

// eslint-disable-next-line max-lines-per-function -- 9 campos de endereço, cada um com máscara/obrigatoriedade próprias, mais a lupa de cidade (§19-25); quebrar em sub-funções esconderia a lista em vez de simplificá-la.
export function Endereco(props: PropsDaAba) {
  const { formulario, mudar } = props;
  const [buscaDeCidade, setBuscaDeCidade] = useState(false);
  const [avisoIbge, setAvisoIbge] = useState<string | null>(null);
  const [procurando, setProcurando] = useState(false);

  const escolherMunicipio = (municipio: MunicipioIbge) => {
    mudar('codigoIbge', municipio.codigo);
    mudar('cidade', municipio.nome.toLocaleUpperCase('pt-BR'));
    mudar('uf', municipio.uf);
    setBuscaDeCidade(false);
    setAvisoIbge(null);
  };

  const procurarPorCodigo = async () => {
    const codigo = formulario.codigoIbge.replace(/\D/g, '');
    if (codigo.length !== 7) return;
    setProcurando(true);
    try {
      escolherMunicipio(await buscarMunicipio(codigo));
    } catch (falha: unknown) {
      setAvisoIbge(falha instanceof Error ? falha.message : 'Código IBGE não encontrado');
    } finally {
      setProcurando(false);
    }
  };

  return (
    <Secao titulo="Endereço" descricao="Onde o cliente recebe a mercadoria e a nota">
      <LinhaDeCampos>
        <CampoDeTexto
          aba={props}
          campo="cep"
          rotulo="CEP"
          inputMode="numeric"
          mascara={mascararCep}
          larguraSemantica="codigo"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="logradouro"
          rotulo="Logradouro"
          maxLength={200}
          larguraSemantica="resto"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="numero"
          rotulo="Número"
          maxLength={20}
          larguraSemantica="codigo"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="complemento"
          rotulo="Complemento"
          maxLength={120}
          larguraSemantica="medio"
        />
        <CampoDeTexto
          aba={props}
          campo="bairro"
          rotulo="Bairro"
          maxLength={120}
          larguraSemantica="medio"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="cidade"
          rotulo="Cidade"
          maxLength={120}
          larguraSemantica="medio"
          obrigatorio
        />
        <CampoDeTexto
          aba={props}
          campo="uf"
          rotulo="UF"
          maxLength={2}
          mascara={maiusculas}
          larguraSemantica="codigo"
          obrigatorio
        />
        <Field
          label="Código IBGE"
          hint={avisoIbge ? undefined : 'Exigido pela NF-e — ou procure pela lupa'}
          error={avisoIbge}
          className={LARGURA_DE_CAMPO.curto}
        >
          <div className="flex gap-2">
            <Input
              value={formulario.codigoIbge}
              inputMode="numeric"
              maxLength={7}
              onChange={(e) => mudar('codigoIbge', soNumeros(e.target.value))}
              onBlur={() => void procurarPorCodigo()}
            />
            <button
              type="button"
              onClick={() => setBuscaDeCidade(true)}
              disabled={procurando}
              aria-label="Procurar cidade pelo IBGE"
              title="Procurar cidade"
              className={BOTAO_ICONE}
            >
              {procurando ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Search size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>
        <CampoDeTexto
          aba={props}
          campo="pais"
          rotulo="País"
          maxLength={60}
          larguraSemantica="curto"
        />
      </LinhaDeCampos>
      {buscaDeCidade ? (
        <BuscaDeMunicipio
          ufInicial={formulario.uf || 'GO'}
          aoEscolher={escolherMunicipio}
          aoFechar={() => setBuscaDeCidade(false)}
        />
      ) : null}
    </Secao>
  );
}

export function Contato(props: PropsDaAba) {
  const telefone = { inputMode: 'tel' as const, mascara: mascararTelefone };
  return (
    <Secao titulo="Contato" descricao="Telefones e e-mails do atendimento e da NF-e">
      <LinhaDeCampos>
        <CampoDeTexto
          aba={props}
          campo="telefone1"
          rotulo="Telefone 1"
          larguraSemantica="curto"
          {...telefone}
        />
        <CampoDeTexto
          aba={props}
          campo="telefone2"
          rotulo="Telefone 2"
          larguraSemantica="curto"
          {...telefone}
        />
        <CampoDeTexto
          aba={props}
          campo="celular"
          rotulo="Celular"
          larguraSemantica="curto"
          {...telefone}
        />
        <CampoDeTexto
          aba={props}
          campo="whatsapp"
          rotulo="WhatsApp"
          dica="Onde o cliente responde"
          larguraSemantica="curto"
          {...telefone}
        />
        <CampoDeTexto
          aba={props}
          campo="email"
          rotulo="E-mail"
          type="email"
          larguraSemantica="resto"
        />
        <CampoDeTexto
          aba={props}
          campo="emailNfe"
          rotulo="E-mail da NF-e"
          dica="Para onde vai o XML"
          type="email"
          larguraSemantica="resto"
        />
      </LinhaDeCampos>
    </Secao>
  );
}
