/* eslint-disable max-lines-per-function */
import { useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { buscarCliente } from '../../customers/clientes.api';
import { digitos, documentoCompleto, mascararDocumento } from '../../customers/formato';
import { BuscaDeCliente } from '../comum/BuscaDeCliente';
import { CONSUMIDOR_FINAL, enderecoDoCliente, type ClienteDoPdv } from './clienteDoPdv';

/** F10 Informar Cliente: do cadastro, só o CPF/CNPJ na nota, ou de volta para
 *  o consumidor final. */
export function InformarCliente({
  atual,
  aoInformar,
  aoFechar,
}: {
  readonly atual: ClienteDoPdv;
  readonly aoInformar: (cliente: ClienteDoPdv) => void;
  readonly aoFechar: () => void;
}) {
  const [documento, setDocumento] = useState(
    atual.customerId ? '' : mascararDocumento(atual.documento ?? ''),
  );
  const [nome, setNome] = useState(
    atual.customerId || atual === CONSUMIDOR_FINAL ? '' : atual.nome,
  );
  const [erro, setErro] = useState<string | null>(null);

  const soDocumento = () => {
    if (!documentoCompleto(documento)) {
      setErro('CPF com 11 ou CNPJ com 14 dígitos');
      return;
    }
    aoInformar({
      customerId: null,
      codigo: null,
      nome: nome.trim().toUpperCase() || CONSUMIDOR_FINAL.nome,
      documento: digitos(documento),
      endereco: null,
    });
  };

  return (
    <BuscaDeCliente
      titulo="Informar Cliente"
      aoFechar={aoFechar}
      aoEscolher={(escolhido) => {
        buscarCliente(escolhido.id)
          .then((cadastro) =>
            aoInformar({
              customerId: escolhido.id,
              codigo: escolhido.codigo,
              nome: escolhido.nome,
              documento: escolhido.documento || null,
              endereco: enderecoDoCliente(cadastro),
            }),
          )
          .catch((falha: unknown) =>
            setErro(falha instanceof Error ? falha.message : 'Não foi possível ler o cliente'),
          );
      }}
    >
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          soDocumento();
        }}
        className="bg-surface-soft grid gap-2 rounded-2xl p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto_auto]"
      >
        <input
          value={documento}
          onChange={(evento) => setDocumento(mascararDocumento(evento.target.value))}
          placeholder="CPF/CNPJ na nota"
          aria-label="CPF ou CNPJ na nota"
          inputMode="numeric"
          className={`${INPUT_DE_BUSCA} tabular-nums`}
        />
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Nome (opcional)"
          aria-label="Nome do consumidor"
          maxLength={160}
          className={INPUT_DE_BUSCA}
        />
        <button type="submit" className={BOTAO_ESCURO}>
          Usar na nota
        </button>
        <button type="button" onClick={() => aoInformar(CONSUMIDOR_FINAL)} className={BOTAO_CLARO}>
          Consumidor final
        </button>
        {erro ? <p className="text-caption col-span-full text-[#b3242f]">{erro}</p> : null}
      </form>
    </BuscaDeCliente>
  );
}
