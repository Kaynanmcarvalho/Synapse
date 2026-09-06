/** Parser CSV minimo (RFC 4180): aspas duplas, aspas escapadas e virgula
 *  dentro de campo entre aspas. Sem dependencia externa para um caso de uso
 *  pequeno — a importacao de produtos so precisa disso. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const normalized = text.replace(/\r\n/g, '\n');
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"' && normalized[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
};

/** Linha 1 = cabecalho; devolve um objeto por linha, chaveado pelo cabecalho. */
export const csvToRecords = (text: string): Record<string, string>[] => {
  const [header, ...lines] = parseCsv(text);
  if (!header) return [];
  return lines.map((line) =>
    Object.fromEntries(header.map((key, index) => [key.trim(), (line[index] ?? '').trim()])),
  );
};
