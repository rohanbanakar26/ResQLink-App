
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('citizen', 'volunteer', 'ngo');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role app_role NOT NULL DEFAULT 'citizen',
  avatar_url TEXT DEFAULT '',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  trust_score DOUBLE PRECISION DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'citizen')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Volunteers table
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT true,
  completed_tasks INTEGER DEFAULT 0,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view volunteers" ON public.volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Volunteers can insert own record" ON public.volunteers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Volunteers can update own record" ON public.volunteers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON public.volunteers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NGOs table
CREATE TABLE public.ngos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ngo_name TEXT NOT NULL,
  services TEXT[] DEFAULT '{}',
  capacity INTEGER DEFAULT 10,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view NGOs" ON public.ngos FOR SELECT TO authenticated USING (true);
CREATE POLICY "NGOs can insert own record" ON public.ngos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "NGOs can update own record" ON public.ngos FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_ngos_updated_at BEFORE UPDATE ON public.ngos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Emergency requests table
CREATE TABLE public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL DEFAULT '',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'Requested',
  citizen_name TEXT DEFAULT '',
  ngo_id UUID REFERENCES public.ngos(id),
  assigned_volunteer_id UUID REFERENCES public.volunteers(id),
  eta INTEGER,
  priority_score DOUBLE PRECISION DEFAULT 0,
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view requests" ON public.emergency_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create requests" ON public.emergency_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Request owner or assigned can update" ON public.emergency_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT v.user_id FROM public.volunteers v WHERE v.id = assigned_volunteer_id)
    OR auth.uid() IN (SELECT n.user_id FROM public.ngos n WHERE n.id = ngo_id)
  );

CREATE TRIGGER update_emergency_requests_updated_at BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_emergency_requests_user_id ON public.emergency_requests(user_id);
CREATE INDEX idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX idx_emergency_requests_urgency ON public.emergency_requests(urgency);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_volunteers_user_id ON public.volunteers(user_id);
CREATE INDEX idx_ngos_user_id ON public.ngos(user_id);
