import { Building2, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROTAS } from '../../../app/rotas';
import { BOTAO_ESCURO } from '../../cadastros/comum/estilos';

/** Enquanto as filiais carregam, ou quando o tenant ainda não tem nenhuma. */
export function SemFilial({
  carregando,
  erro,
}: {
  readonly carregando: boolean;
  readonly erro: string | null;
}) {
  if (carregando) {
    return (
      <main className="text-body-sm text-stone flex min-h-[60vh] items-center justify-center gap-2">
        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Carregando…
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Building2 size={30} aria-hidden="true" className="text-faint" />
      <h1 className="font-display text-heading-sm text-ink">Nenhuma filial para vender</h1>
      <p className="text-body-sm text-stone">
        {erro ??
          'A venda acontece numa filial. Cadastre em Cadastros › Parâmetros da Empresa › Configuração por Filial.'}
      </p>
      <Link to={ROTAS.filiais} className={BOTAO_ESCURO}>
        Abrir Filiais
      </Link>
    </main>
  );
}
