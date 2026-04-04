-- ============================================================
-- ResQLink: NGO Full Flow Expansion
-- ============================================================

-- 1. Enhance ngos table with registration & verification fields
ALTER TABLE public.ngos
  ADD COLUMN IF NOT EXISTS registration_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coverage_radius_km INTEGER DEFAULT 25;

-- 2. Add NGO review layer to emergency_requests
ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS ngo_reviewed BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ngo_review_notes TEXT DEFAULT '';

-- 3. Broadcast messages table (NGO → Volunteers)
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'all',
  target_area TEXT DEFAULT NULL,
  target_request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can view own broadcasts"
  ON public.broadcast_messages FOR SELECT TO authenticated
  USING (
    ngo_id IN (SELECT n.id FROM public.ngos n WHERE n.user_id = auth.uid())
    OR TRUE  -- volunteers can also see broadcasts
  );

CREATE POLICY "NGOs can create broadcasts"
  ON public.broadcast_messages FOR INSERT TO authenticated
  WITH CHECK (
    ngo_id IN (SELECT n.id FROM public.ngos n WHERE n.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_broadcast_ngo_id ON public.broadcast_messages(ngo_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_created_at ON public.broadcast_messages(created_at DESC);
