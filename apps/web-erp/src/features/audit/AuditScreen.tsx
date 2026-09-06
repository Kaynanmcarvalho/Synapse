import { useState } from 'react';

export function AuditScreen() {
  const [filters, setFilters] = useState({ userId: '', entity: '', from: '', to: '' });
  const field = (key: keyof typeof filters, label: string, type = 'text') => (
    <label>
      {label}
      <input
        type={type}
        className="ml-2 rounded border p-2"
        value={filters[key]}
        onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
      />
    </label>
  );
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Auditoria</h1>
      <form className="mt-6 flex flex-wrap gap-4">
        {field('userId', 'Usuário')}
        {field('entity', 'Entidade')}
        {field('from', 'De', 'date')}
        {field('to', 'Até', 'date')}
      </form>
    </main>
  );
}
