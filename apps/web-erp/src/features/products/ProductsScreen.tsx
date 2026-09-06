import { useEffect, useState } from 'react';
import { Button, Card, CardHeader, CardTitle, Input, Spinner } from '@synapse/ui';
import {
  createProduct,
  devSignIn,
  isSignedIn,
  listProducts,
  resolvePrice,
  uploadProductPhoto,
  type ProductListItem,
  type ResolvedPrice,
} from './products.api';

const SOURCE_LABEL: Record<string, string> = {
  GLOBAL: 'Preço global',
  FILIAL: 'Preço da filial',
  TABELA_PRECO: 'Tabela de preço',
  CLIENTE_ESPECIFICO: 'Preço do cliente',
  PROMOCAO: 'Promoção',
  NEGOCIACAO_AUTORIZADA: 'Negociação autorizada',
};

function LoginPanel({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const [email, setEmail] = useState('teste.rbac@synapse.dev');
  const [password, setPassword] = useState('Senha123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await devSignIn(email, password);
      onSignedIn();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-full items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar (emulador local)</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={submit} disabled={loading}>
            {loading ? <Spinner /> : 'Entrar'}
          </Button>
        </div>
      </Card>
    </main>
  );
}

function PriceBadge({ productId }: { readonly productId: string }) {
  const [price, setPrice] = useState<ResolvedPrice | null>(null);
  const [branchId, setBranchId] = useState('');

  const check = async () => {
    setPrice(await resolvePrice(productId, branchId || null));
  };

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <Input
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
        placeholder="id da filial (opcional)"
        className="h-7 w-40 text-xs"
      />
      <Button onClick={check} variant="ghost" size="sm">
        Resolver preço
      </Button>
      {price && (
        <span className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200 rounded-full px-2 py-0.5 font-medium">
          R$ {price.price.toFixed(2)} · {SOURCE_LABEL[price.source] ?? price.source}
          {price.requiresApproval ? ' · precisa de aprovação' : ''}
        </span>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onChanged,
}: {
  readonly product: ProductListItem;
  readonly onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadProductPhoto(product.id, file);
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="flex items-start gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
        {product.photoUrl ? (
          <img
            src={`http://localhost:3333${product.photoUrl}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl">🌾</span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-slate-500">
              SKU {product.sku} · {product.status} · R$ {product.pricing.salePrice.toFixed(2)}
            </p>
          </div>
          <label className="text-brand-600 cursor-pointer text-xs hover:underline">
            {uploading ? 'Enviando…' : 'Trocar foto'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
        </div>
        <PriceBadge productId={product.id} />
      </div>
    </Card>
  );
}

function CreateProductForm({ onCreated }: { readonly onCreated: () => void }) {
  const [form, setForm] = useState({
    sku: '',
    name: '',
    unit: 'KG',
    ncm: '23099090',
    defaultCfop: '5102',
    cost: '',
    salePrice: '',
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await createProduct({
        ...form,
        cost: Number(form.cost),
        salePrice: Number(form.salePrice),
      });
      setForm({ ...form, sku: '', name: '', cost: '', salePrice: '' });
      onCreated();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo produto</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Input
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <Input
          placeholder="Nome"
          className="col-span-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Unidade"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <Input
          placeholder="NCM"
          value={form.ncm}
          onChange={(e) => setForm({ ...form, ncm: e.target.value })}
        />
        <Input
          placeholder="CFOP"
          value={form.defaultCfop}
          onChange={(e) => setForm({ ...form, defaultCfop: e.target.value })}
        />
        <Input
          placeholder="Custo"
          type="number"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
        />
        <Input
          placeholder="Preço de venda"
          type="number"
          value={form.salePrice}
          onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <Button className="mt-3" onClick={submit}>
        Cadastrar
      </Button>
    </Card>
  );
}

export function ProductsScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const page = await listProducts(query);
      setProducts(page.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (signedIn) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  useEffect(() => {
    setSignedIn(isSignedIn());
  }, []);

  if (!signedIn) return <LoginPanel onSignedIn={() => setSignedIn(true)} />;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="text-sm text-slate-500">Cadastro, foto e resolução de preço (§5 e §6).</p>
      </header>

      <CreateProductForm onCreated={refresh} />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por SKU, código de barras ou descrição"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && refresh()}
        />
        <Button variant="secondary" onClick={refresh}>
          Buscar
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-3">
          {products.length === 0 && <p className="text-sm text-slate-500">Nenhum produto ainda.</p>}
          {products.map((product) => (
            <ProductRow key={product.id} product={product} onChanged={refresh} />
          ))}
        </div>
      )}
    </main>
  );
}
