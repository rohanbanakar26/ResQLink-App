
-- Drop existing FKs that point to auth.users
ALTER TABLE public.volunteers DROP CONSTRAINT IF EXISTS volunteers_user_id_fkey;
ALTER TABLE public.ngos DROP CONSTRAINT IF EXISTS ngos_user_id_fkey;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_ngo_id_fkey;
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_assigned_volunteer_id_fkey;

-- Add unique constraint on profiles.user_id so it can be referenced
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Recreate FKs pointing to profiles
ALTER TABLE public.volunteers
  ADD CONSTRAINT volunteers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.ngos
  ADD CONSTRAINT ngos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- FK for emergency_requests -> ngos and volunteers
ALTER TABLE public.emergency_requests
  ADD CONSTRAINT emergency_requests_ngo_id_fkey
  FOREIGN KEY (ngo_id) REFERENCES public.ngos(id);

ALTER TABLE public.emergency_requests
  ADD CONSTRAINT emergency_requests_assigned_volunteer_id_fkey
  FOREIGN KEY (assigned_volunteer_id) REFERENCES public.volunteers(id);
