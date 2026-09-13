import { CircleAlert, RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly falhou: boolean;
}

/** Segura o erro de uma tela dentro dela: o cabecalho e o menu continuam de pe
 *  e o usuario pode trocar de rotina, em vez de ficar com a pagina em branco.
 *  O AppShell troca a `key` a cada rota, o que zera o estado ao navegar. */
export class LimiteDeFalha extends Component<Props, State> {
  override state: State = { falhou: false };

  static getDerivedStateFromError(): State {
    return { falhou: true };
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Falha ao exibir a tela', erro, info.componentStack);
  }

  override render() {
    if (!this.state.falhou) return this.props.children;

    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section
          role="alert"
          className="border-hairline-light max-w-2xl rounded-2xl border p-8 sm:p-10"
        >
          <span className="bg-surface-soft text-accent-danger flex h-12 w-12 items-center justify-center rounded-full">
            <CircleAlert size={22} aria-hidden="true" />
          </span>
          <h1 className="font-display text-heading-lg text-ink mt-6">
            Não foi possível abrir esta tela
          </h1>
          <p className="text-body-md text-mute mt-3">
            Ocorreu um erro inesperado. As outras rotinas do menu continuam disponíveis.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-canvas-dark text-button-md hover:bg-charcoal mt-8 inline-flex h-12 items-center gap-2 rounded-full px-7 text-white transition"
          >
            <RotateCw size={17} aria-hidden="true" /> Recarregar
          </button>
        </section>
      </main>
    );
  }
}
