-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  token_version integer NOT NULL DEFAULT 1,
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_settings (
  key text NOT NULL,
  value text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  requirement numeric NOT NULL,
  voucher_reward integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_tasks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.investment_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  type text NOT NULL,
  funded_amount numeric DEFAULT 0,
  funding_goal numeric NOT NULL,
  roi_percent numeric NOT NULL,
  duration_days integer NOT NULL,
  min_investment numeric DEFAULT 100,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  global_start_time timestamp with time zone,
  global_end_time timestamp with time zone,
  is_funded boolean DEFAULT false,
  CONSTRAINT investment_products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_id uuid,
  product_name text NOT NULL,
  amount numeric NOT NULL,
  profit_amount numeric NOT NULL,
  total_return numeric NOT NULL,
  roi_percent numeric NOT NULL,
  duration_days integer NOT NULL,
  status text DEFAULT 'active'::text,
  completes_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  current_earnings numeric DEFAULT 0,
  last_credited_at timestamp with time zone,
  investment_type text DEFAULT 'movie_ticket'::text,
  earnings_start_time timestamp with time zone,
  CONSTRAINT investments_pkey PRIMARY KEY (id),
  CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT investments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.investment_products(id)
);
CREATE TABLE public.invitation_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  invite_code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitation_codes_pkey PRIMARY KEY (id),
  CONSTRAINT invitation_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.login_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text,
  user_agent text,
  logged_in_at timestamp with time zone DEFAULT now(),
  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.membership_levels (
  level integer NOT NULL,
  name text NOT NULL,
  min_deposit numeric NOT NULL,
  min_referrals integer DEFAULT 0,
  daily_profit_bonus numeric DEFAULT 0,
  description text,
  ticket_profit_percent numeric DEFAULT 3.00,
  max_tickets_per_day integer DEFAULT 2,
  min_referrals_at_level integer DEFAULT 0,
  CONSTRAINT membership_levels_pkey PRIMARY KEY (level)
);
CREATE TABLE public.movies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  poster_url text,
  profit_percent numeric NOT NULL,
  duration_hours integer NOT NULL,
  min_investment numeric DEFAULT 10,
  section text DEFAULT 'popular'::text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  introduction text,
  actor_images jsonb DEFAULT '[]'::jsonb,
  instructions text,
  income text,
  sheets_per_ticket integer DEFAULT 1,
  price numeric DEFAULT 10.00,
  CONSTRAINT movies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  image_url text,
  is_active boolean DEFAULT true,
  published_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  notification_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recharge_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  amount numeric NOT NULL,
  network text NOT NULL,
  transaction_hash text NOT NULL UNIQUE,
  screenshot_url text,
  status text DEFAULT 'pending'::text,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by text,
  note text,
  CONSTRAINT recharge_requests_pkey PRIMARY KEY (id),
  CONSTRAINT recharge_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid,
  referred_id uuid,
  referred_at timestamp with time zone DEFAULT now(),
  total_deposited numeric DEFAULT 0.00,
  bonus_earned numeric DEFAULT 0.00,
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contact text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  movie_id uuid,
  movie_title text NOT NULL,
  quantity integer DEFAULT 1,
  price numeric NOT NULL,
  profit_percent numeric DEFAULT 3.00,
  profit_amount numeric NOT NULL,
  total_return numeric NOT NULL,
  status text DEFAULT 'active'::text,
  booked_at timestamp with time zone DEFAULT now(),
  expiry_at timestamp with time zone NOT NULL,
  paid_at timestamp with time zone,
  poster_url text,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT tickets_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  reference text,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  balance_before numeric,
  balance_after numeric,
  reference_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_task_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  task_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  progress numeric DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  vouchers_awarded integer DEFAULT 0,
  CONSTRAINT user_task_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_task_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_task_progress_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(id)
);
CREATE TABLE public.user_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  vouchers integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT user_vouchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text UNIQUE,
  password_hash text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  referred_by text,
  balance numeric DEFAULT 0.00,
  total_deposited numeric DEFAULT 0.00,
  total_profit numeric DEFAULT 0.00,
  membership_level integer DEFAULT 0,
  profile_image text,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  funding_password text,
  total_withdrawn numeric DEFAULT 0.00,
  personal_gains numeric DEFAULT 0.00,
  team_earnings numeric DEFAULT 0.00,
  ticket_quota numeric DEFAULT 0.00,
  wallet_address text,
  wallet_type text,
  otp text,
  otp_expires_at timestamp with time zone,
  last_ip text,
  token_version integer NOT NULL DEFAULT 1,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallet_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  network text NOT NULL UNIQUE,
  address text NOT NULL,
  qr_code_url text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallet_addresses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  wallet_type text NOT NULL,
  status text DEFAULT 'pending'::text,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by text,
  note text,
  CONSTRAINT withdrawals_pkey PRIMARY KEY (id),
  CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);