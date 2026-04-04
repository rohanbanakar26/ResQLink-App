-- ============================================================
-- ResQLink Phase 1: Full Feature Expansion Migration
-- ============================================================

-- ============================================================
-- 1. Enhance profiles table
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS people_helped INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- ============================================================
-- 2. Enhance emergency_requests table
-- ============================================================
ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS completion_proof_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS citizen_approved BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS citizen_feedback TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS team_leader_volunteer_id UUID REFERENCES public.volunteers(id) DEFAULT NULL;

-- ============================================================
-- 3. Enhance volunteers table
-- ============================================================
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS avg_response_time INTEGER DEFAULT NULL;

-- ============================================================
-- 4. Messages table (real-time chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their requests"
  ON public.messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR request_id IN (
      SELECT id FROM public.emergency_requests
      WHERE user_id = auth.uid()
        OR assigned_volunteer_id IN (SELECT v.id FROM public.volunteers v WHERE v.user_id = auth.uid())
        OR ngo_id IN (SELECT n.id FROM public.ngos n WHERE n.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_request_id ON public.messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================================
-- 5. Campaigns table (NGO posts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "NGOs can create campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (
    ngo_id IN (SELECT n.id FROM public.ngos n WHERE n.user_id = auth.uid())
  );

CREATE POLICY "NGOs can update own campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (
    ngo_id IN (SELECT n.id FROM public.ngos n WHERE n.user_id = auth.uid())
  );

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_campaigns_ngo_id ON public.campaigns(ngo_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);

-- ============================================================
-- 6. Campaign likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.campaign_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like campaigns"
  ON public.campaign_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike"
  ON public.campaign_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 7. Campaign comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.campaign_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add comments"
  ON public.campaign_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.campaign_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON public.campaign_comments(campaign_id);

-- ============================================================
-- 8. Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================
-- 9. User badges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.user_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can assign badges"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 10. NGO follows
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ngo_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ngo_id)
);

ALTER TABLE public.ngo_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON public.ngo_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow"
  ON public.ngo_follows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow"
  ON public.ngo_follows FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 11. Request reports (misuse)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.request_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.request_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.request_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can submit reports"
  ON public.request_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ============================================================
-- 12. Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-proofs', 'completion-proofs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for campaign-media
CREATE POLICY "Anyone can view campaign media"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-media');

CREATE POLICY "NGOs can upload campaign media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for completion-proofs
CREATE POLICY "Anyone can view completion proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'completion-proofs');

CREATE POLICY "Users can upload completion proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'completion-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for profile-avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
