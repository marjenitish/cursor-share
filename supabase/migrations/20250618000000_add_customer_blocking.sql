-- Add blocking functionality to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS block_note TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when querying blocked customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_blocked_at ON customers(blocked_at);

-- Add comment to explain the blocking functionality
COMMENT ON COLUMN customers.block_note IS 'Reason for blocking the customer';
COMMENT ON COLUMN customers.blocked_at IS 'Timestamp when the customer was blocked'; 