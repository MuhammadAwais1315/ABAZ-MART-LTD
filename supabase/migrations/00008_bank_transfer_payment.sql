-- ============================================================================
-- 00008_bank_transfer_payment.sql
-- ADD BANK TRANSFER TO PAYMENT_METHOD ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.payment_method'::regtype 
      AND enumlabel = 'bank_transfer'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'bank_transfer';
  END IF;
END $$;
