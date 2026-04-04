-- Add category-specific columns to emergency_requests
ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS people_affected integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS volunteers_needed text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS disaster_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS severity_level text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS immediate_danger boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS landmark text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_type_needed text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sanitization_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS area_size text DEFAULT NULL;

-- Create storage bucket for emergency media
INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-media', 'emergency-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view all media
CREATE POLICY "Anyone can view emergency media"
ON storage.objects FOR SELECT
USING (bucket_id = 'emergency-media');

-- Users can upload to their own folder
CREATE POLICY "Users can upload emergency media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'emergency-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own emergency media"
ON storage.objects FOR DELETE
USING (bucket_id = 'emergency-media' AND auth.uid()::text = (storage.foldername(name))[1]);