import { Button, Field, Input, Select } from '@synapse/sdl';
import { LinhaDeCampos } from '../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO } from '../../components/formulario/larguras';

function CampoData({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  return (
    <Field label={label} className={LARGURA_DE_CAMPO.codigo}>
      <Input
        type="date"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-data"
      />
    </Field>
  );
}

/** Formulário de filtros — extraído do corpo de `DashboardScreen` só para
 *  ficar sob o limite de linhas/complexidade por função; nenhum estado ou
 *  comportamento muda, é a mesma `LinhaDeCampos` de sempre. */
export function FiltrosDoPainel({
  profile,
  setProfile,
  from,
  setFrom,
  to,
  setTo,
  branchId,
  setBranchId,
  sellerId,
  setSellerId,
  loading,
  onSubmit,
}: {
  readonly profile: string;
  readonly setProfile: (v: string) => void;
  readonly from: string;
  readonly setFrom: (v: string) => void;
  readonly to: string;
  readonly setTo: (v: string) => void;
  readonly branchId: string;
  readonly setBranchId: (v: string) => void;
  readonly sellerId: string;
  readonly setSellerId: (v: string) => void;
  readonly loading: boolean;
  readonly onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-label="Filtros do painel"
    >
      <LinhaDeCampos>
        <Field label="Perfil" className={LARGURA_DE_CAMPO.curto}>
          <Select value={profile} onChange={(e) => setProfile(e.target.value)}>
            <option value="admin">Administrador</option>
            <option value="stock">Estoque</option>
            <option value="seller">Minhas vendas</option>
          </Select>
        </Field>
        <CampoData label="De" value={from} onChange={setFrom} />
        <CampoData label="Até" value={to} onChange={setTo} />
        <Field label="Filial" className={LARGURA_DE_CAMPO.curto}>
          <Input
            value={branchId}
            placeholder="Todas as permitidas"
            onChange={(e) => setBranchId(e.target.value)}
          />
        </Field>
        {profile !== 'seller' && (
          <Field label="Vendedor" className={LARGURA_DE_CAMPO.curto}>
            <Input
              value={sellerId}
              placeholder="Todos"
              onChange={(e) => setSellerId(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" variant="primary" loading={loading}>
          Consultar
        </Button>
      </LinhaDeCampos>
    </form>
  );
}
