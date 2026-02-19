-- Store WhatsApp (Baileys) auth state in Supabase so sessions survive Railway redeployments

CREATE TABLE public.whatsapp_auth_creds (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  creds JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_auth_keys (
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  value JSONB NOT NULL,
  PRIMARY KEY (type, id)
);

-- RLS: service role only (Railway uses service role key)
ALTER TABLE public.whatsapp_auth_creds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auth_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_auth_creds" ON public.whatsapp_auth_creds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage whatsapp_auth_keys" ON public.whatsapp_auth_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
