-- ============================================================
-- ResQLink: Volunteer Assignments & Team Formation
-- ============================================================

-- junction table for multiple volunteers per request
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'on_site', 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, volunteer_id)
);

ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view assignments"
  ON public.volunteer_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Volunteers can join tasks"
  ON public.volunteer_assignments FOR INSERT TO authenticated
  WITH CHECK (volunteer_id IN (SELECT id FROM public.volunteers WHERE user_id = auth.uid()));

CREATE POLICY "Volunteers can update own assignment"
  ON public.volunteer_assignments FOR UPDATE TO authenticated
  USING (volunteer_id IN (SELECT id FROM public.volunteers WHERE user_id = auth.uid()));

-- Add current_task_id to volunteers for easier tracking
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS current_task_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_v_assign_request_id ON public.volunteer_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_v_assign_volunteer_id ON public.volunteer_assignments(volunteer_id);
