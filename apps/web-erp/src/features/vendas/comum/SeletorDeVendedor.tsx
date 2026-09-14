import { useEffect, useId, useState } from 'react';
import { listarVendedores, type VendedorNaLista } from '../../funcionarios/funcionarios.api';

/** O vendedor da venda, do Cadastro de Funcionários (só quem pode vender). O
 *  último escolhido fica lembrado neste computador. */

const lerGuardado = (chave: string): string => {
  try {
    return window.localStorage.getItem(chave) ?? '';
  } catch {
    return '';
  }
};

export function SeletorDeVendedor({
  chave,
  valor,
  aoMudar,
  obrigatorio = true,
}: {
  readonly chave: string;
  readonly valor: VendedorNaLista | null;
  readonly aoMudar: (vendedor: VendedorNaLista | null) => void;
  readonly obrigatorio?: boolean;
}) {
  const id = useId();
  const [vendedores, setVendedores] = useState<readonly VendedorNaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarVendedores()
      .then((lista) => {
        if (!vivo) return;
        const ativos = lista.filter((vendedor) => !vendedor.bloqueado && !vendedor.demitido);
        setVendedores(ativos);
        const guardado = ativos.find((vendedor) => vendedor.id === lerGuardado(chave));
        if (guardado) aoMudar(guardado);
      })
      .catch((falha: unknown) => {
        if (!vivo) return;
        setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os vendedores');
        setVendedores([]);
      });
    return () => {
      vivo = false;
    };
    // Carrega uma vez; a escolha guardada entra só na abertura da tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const escolher = (idDoVendedor: string) => {
    const vendedor = vendedores?.find((item) => item.id === idDoVendedor) ?? null;
    try {
      window.localStorage.setItem(chave, vendedor?.id ?? '');
    } catch {
      // Sem armazenamento, vale para esta venda.
    }
    aoMudar(vendedor);
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-caption text-charcoal mb-1 block font-medium">
        Vendedor
      </label>
      <select
        id={id}
        value={valor?.id ?? ''}
        onChange={(evento) => escolher(evento.target.value)}
        className="border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 h-11 w-full rounded-xl border bg-white px-3 outline-none focus:ring-4"
      >
        <option value="">
          {vendedores === null
            ? 'Carregando…'
            : obrigatorio
              ? 'Escolha o vendedor'
              : 'Sem vendedor'}
        </option>
        {vendedores?.map((vendedor) => (
          <option key={vendedor.id} value={vendedor.id}>
            {vendedor.codigo} - {vendedor.nome}
          </option>
        ))}
      </select>
      {erro ? <p className="text-caption mt-1 text-[#b3242f]">{erro}</p> : null}
      {vendedores?.length === 0 && !erro ? (
        <p className="text-caption text-stone mt-1">
          Nenhum vendedor: marque &quot;Vendedor&quot; no Cadastro de Funcionários.
        </p>
      ) : null}
    </div>
  );
}
