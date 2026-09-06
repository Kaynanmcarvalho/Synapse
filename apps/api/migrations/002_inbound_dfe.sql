CREATE TABLE IF NOT EXISTS inbound_dfe (
  tenant_id uuid NOT NULL,
  access_key char(44) NOT NULL,
  company_id uuid,
  supplier_tax_id char(14) NOT NULL,
  supplier_name text NOT NULL,
  invoice_number text NOT NULL,
  xml text NOT NULL,
  note jsonb NOT NULL,
  conference jsonb NOT NULL,
  manifestation text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, access_key)
);

CREATE TABLE IF NOT EXISTS supplier_product_mappings (
  tenant_id uuid NOT NULL,
  supplier_tax_id char(14) NOT NULL,
  supplier_product_code text NOT NULL,
  product_id uuid NOT NULL,
  conversion_factor numeric(18,6) NOT NULL CHECK (conversion_factor > 0),
  PRIMARY KEY (tenant_id, supplier_tax_id, supplier_product_code)
);

CREATE TABLE IF NOT EXISTS dfe_distribution_cursors (
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  last_nsu numeric(20,0) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, company_id)
);

ALTER TABLE inbound_dfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfe_distribution_cursors ENABLE ROW LEVEL SECURITY;
