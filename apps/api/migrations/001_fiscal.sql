CREATE TABLE IF NOT EXISTS fiscal_company_configs (
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('MOCK','SANDBOX','HOMOLOGACAO','PRODUCAO')),
  provider text NOT NULL CHECK (provider IN ('MOCK','GYN_FISCAL')),
  config jsonb NOT NULL,
  secret_refs jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, company_id)
);

CREATE TABLE IF NOT EXISTS fiscal_sequences (
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('NFE','NFCE')),
  series integer NOT NULL CHECK (series BETWEEN 1 AND 999),
  last_number bigint NOT NULL CHECK (last_number > 0),
  PRIMARY KEY (tenant_id, company_id, kind, series)
);

CREATE TABLE IF NOT EXISTS fiscal_documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('NFE','NFCE','MDFE','DFE')),
  environment text NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT','PROCESSING','AUTHORIZED','REJECTED','DENIED','CANCELLED','CONTINGENCY')),
  series integer NOT NULL,
  number bigint NOT NULL,
  access_key char(44),
  protocol text,
  provider_job_id text,
  xml text,
  sefaz_code text,
  sefaz_message text,
  attempts integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, company_id, kind, series, number)
);

CREATE INDEX IF NOT EXISTS fiscal_documents_access_key_idx ON fiscal_documents (tenant_id, access_key);

CREATE TABLE IF NOT EXISTS nfce_contingency_queue (
  document_id uuid PRIMARY KEY REFERENCES fiscal_documents(id),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

ALTER TABLE fiscal_company_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfce_contingency_queue ENABLE ROW LEVEL SECURITY;

-- Executar dentro da mesma transação que cria fiscal_documents. O UPSERT
-- serializa concorrentes pela chave primária e devolve um único próximo número:
-- INSERT INTO fiscal_sequences (tenant_id, company_id, kind, series, last_number)
-- VALUES ($1, $2, $3, $4, $5)
-- ON CONFLICT (tenant_id, company_id, kind, series)
-- DO UPDATE SET last_number = fiscal_sequences.last_number + 1
-- RETURNING last_number;
