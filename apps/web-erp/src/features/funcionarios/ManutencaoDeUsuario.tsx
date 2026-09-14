/* eslint-disable max-lines-per-function */
import type { Funcionario } from '@synapse/types';
import { Modal } from '@synapse/ui';
import { Link2, Link2Off, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BOTAO_CLARO, BOTAO_PEQUENO } from '../cadastros/comum/estilos';
import { definirUsuario, listarUsuarios, type UsuarioDoTenant } from './funcionarios.api';

/** "Manutenção de Usuário": liga um login do sistema a este funcionário. É por
 *  esse vínculo que o PDV sabe quem vende quando o próprio vendedor está logado.
 *  Um login serve a um funcionário só. Cargos e senha continuam em Ferramentas ›
 *  Manutenção de Usuários. */
export function ManutencaoDeUsuario({
  funcionario,
  aoAlterar,
  aoFechar,
}: {
  readonly funcionario: Funcionario;
  readonly aoAlterar: (funcionario: Funcionario) => void;
  readonly aoFechar: () => void;
}) {
  const [usuarios, setUsuarios] = useState<readonly UsuarioDoTenant[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    listarUsuarios()
      .then((lista) => ativo && setUsuarios(lista))
      .catch(
        (falha: unknown) =>
          ativo &&
          setErro(falha instanceof Error ? falha.message : 'Falha ao carregar os usuários'),
      );
    return () => {
      ativo = false;
    };
  }, []);

  const ligar = async (uid: string | null) => {
    setGravando(uid ?? 'desligar');
    setErro(null);
    try {
      const alterado = await definirUsuario(funcionario.id, uid);
      aoAlterar(alterado);
      setUsuarios(
        (lista) =>
          lista?.map((usuario) => ({
            ...usuario,
            funcionario:
              usuario.uid === uid
                ? { id: alterado.id, codigo: alterado.codigo, nome: alterado.nome }
                : usuario.funcionario?.id === alterado.id
                  ? null
                  : usuario.funcionario,
          })) ?? null,
      );
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível alterar o usuário');
    } finally {
      setGravando(null);
    }
  };

  return (
    <Modal
      onClose={aoFechar}
      title="Manutenção de Usuário"
      description={`${funcionario.codigo} - ${funcionario.nome}`}
      size="lg"
      footer={
        <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
          Fechar
        </button>
      }
    >
      <p className="text-body-sm text-charcoal">
        {funcionario.usuario ? (
          <>
            Ligado a <strong>{funcionario.usuario.email || funcionario.usuario.nome}</strong>.
          </>
        ) : (
          'Nenhum login ligado a este funcionário.'
        )}
      </p>
      {funcionario.usuario ? (
        <button
          type="button"
          onClick={() => void ligar(null)}
          disabled={gravando !== null}
          className={`${BOTAO_PEQUENO} mt-2`}
        >
          <Link2Off size={14} aria-hidden="true" /> Desligar login
        </button>
      ) : null}
      {erro ? <p className="text-body-sm mt-3 text-[#b3242f]">{erro}</p> : null}
      <div className="border-hairline-light mt-4 max-h-[50vh] overflow-y-auto rounded-xl border">
        {!erro && usuarios === null ? (
          <p className="text-body-sm text-stone flex items-center gap-2 p-4">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Carregando…
          </p>
        ) : null}
        {usuarios?.map((usuario) => {
          const deste = usuario.uid === funcionario.usuario?.uid;
          const deOutro = usuario.funcionario && usuario.funcionario.id !== funcionario.id;
          return (
            <div
              key={usuario.uid}
              className="border-hairline-light text-body-sm flex items-center gap-3 border-b px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate font-medium">
                  {usuario.nome || usuario.email || usuario.uid}
                </p>
                <p className="text-caption text-stone truncate">
                  {usuario.email} · {usuario.cargos.join(', ') || 'sem cargo'}
                  {usuario.situacao === 'blocked' ? ' · bloqueado' : ''}
                </p>
                {deOutro ? (
                  <p className="text-caption text-[#8a4b00]">
                    Ligado a {usuario.funcionario?.codigo} - {usuario.funcionario?.nome}
                  </p>
                ) : null}
              </div>
              {deste ? (
                <span className="text-caption text-[#00664d]">Ligado</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void ligar(usuario.uid)}
                  disabled={gravando !== null || Boolean(deOutro)}
                  className={BOTAO_PEQUENO}
                >
                  {gravando === usuario.uid ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Link2 size={14} aria-hidden="true" />
                  )}
                  Ligar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
