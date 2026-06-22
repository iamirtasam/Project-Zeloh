-- ============================================================================
-- Zeloh Security Hardening Migration
-- Run in the Supabase SQL Editor.  Idempotent: safe to re-run.
-- Verified against the live schema (supabase-schema.sql).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0 — PRE-FLIGHT.  Run this on its own first.
-- If it returns rows, dedupe them BEFORE running step 4.
-- ─────────────────────────────────────────────────────────────────────────────
--   SELECT transaction_hash, COUNT(*) AS dup_count
--   FROM   public.recharge_requests
--   GROUP  BY transaction_hash
--   HAVING COUNT(*) > 1
--   ORDER  BY dup_count DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — token_version columns (H5: invalidate every existing JWT)
-- After this, all old JWTs become invalid (they lack the `v` claim) and
-- every user / admin must re-login. This is the intended C7 mitigation.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — increment_token_version RPC
-- Called from /forgot-password/verify-otp to revoke all sessions on reset.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_token_version(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_v INTEGER;
BEGIN
  UPDATE public.users
     SET token_version = token_version + 1
   WHERE id = p_user_id
   RETURNING token_version INTO new_v;
  RETURN new_v;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_token_version(UUID) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_token_version(UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — deduct_balance RPC (C5: race-free balance debits)
-- Locks the user row, checks balance, debits atomically.
-- p_amount > 0 = debit.  p_amount < 0 = refund (used by rollback paths).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS TABLE(success BOOLEAN, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  updated_balance NUMERIC;
BEGIN
  -- Row lock: serializes concurrent debits on the same user.
  SELECT balance INTO current_balance
    FROM public.users
   WHERE id = p_user_id
   FOR UPDATE;

  IF current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC;
    RETURN;
  END IF;

  -- Insufficient funds: do not mutate, return false.
  IF p_amount > 0 AND current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, current_balance;
    RETURN;
  END IF;

  updated_balance := ROUND(current_balance - p_amount, 2);

  -- Hard floor at zero — never let a refund overshoot negative.
  IF updated_balance < 0 THEN
    RETURN QUERY SELECT FALSE, current_balance;
    RETURN;
  END IF;

  UPDATE public.users SET balance = updated_balance WHERE id = p_user_id;
  RETURN QUERY SELECT TRUE, updated_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_balance(UUID, NUMERIC) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.deduct_balance(UUID, NUMERIC) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — UNIQUE constraint on recharge_requests.transaction_hash (H13)
-- Only run AFTER step 0 returned 0 duplicate rows.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'recharge_requests_transaction_hash_unique'
  ) THEN
    ALTER TABLE public.recharge_requests
      ADD CONSTRAINT recharge_requests_transaction_hash_unique
      UNIQUE (transaction_hash);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — Performance indexes (used by admin search + per-user lookups)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS users_email_idx              ON public.users (email);
CREATE INDEX IF NOT EXISTS users_phone_idx              ON public.users (phone);
CREATE INDEX IF NOT EXISTS users_invite_code_idx        ON public.users (invite_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx        ON public.users (referred_by);
CREATE INDEX IF NOT EXISTS recharge_user_status_idx     ON public.recharge_requests (user_id, status);
CREATE INDEX IF NOT EXISTS withdrawals_user_status_idx  ON public.withdrawals (user_id, status);
CREATE INDEX IF NOT EXISTS investments_user_status_idx  ON public.investments (user_id, status);
CREATE INDEX IF NOT EXISTS transactions_user_idx        ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS login_logs_user_idx          ON public.login_logs (user_id, logged_in_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — (Optional) Smoke test the new RPC.
-- Replace the UUID with any existing user; calling with 0 is a safe no-op.
-- Expected output: success=true, new_balance=current_balance.
-- ─────────────────────────────────────────────────────────────────────────────
--   SELECT * FROM public.deduct_balance(
--     '00000000-0000-0000-0000-000000000000'::uuid, 0
--   );

-- ============================================================================
-- End of migration.
-- ============================================================================
