-- Sale: add source field and storefront_order_id link

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS source               VARCHAR(20) NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS storefront_order_id  UUID REFERENCES storefront_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_storefront_order ON sales(storefront_order_id) WHERE storefront_order_id IS NOT NULL;
