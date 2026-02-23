-- ===========================================
-- MediaEditor Platform - Database Schema
-- ===========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENUM TYPES
-- ===========================================

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'unpaid');
CREATE TYPE media_type AS ENUM ('video', 'image', 'audio');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ===========================================
-- USERS TABLE
-- ===========================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier subscription_tier DEFAULT 'free' NOT NULL,
    subscription_status subscription_status,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    usage_count_today INTEGER DEFAULT 0 NOT NULL,
    usage_reset_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    total_files_processed INTEGER DEFAULT 0 NOT NULL,
    storage_used_bytes BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);

-- ===========================================
-- PROJECTS TABLE
-- ===========================================

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type media_type NOT NULL,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_type ON public.projects(type);
CREATE INDEX idx_projects_public ON public.projects(is_public) WHERE is_public = TRUE;

-- ===========================================
-- MEDIA FILES TABLE
-- ===========================================

CREATE TABLE public.media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_media_files_project ON public.media_files(project_id);
CREATE INDEX idx_media_files_user ON public.media_files(user_id);

-- ===========================================
-- PROCESSING JOBS TABLE
-- ===========================================

CREATE TABLE public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status job_status DEFAULT 'pending' NOT NULL,
    input_file_id UUID REFERENCES public.media_files(id) ON DELETE SET NULL,
    output_file_id UUID REFERENCES public.media_files(id) ON DELETE SET NULL,
    parameters JSONB DEFAULT '{}' NOT NULL,
    error_message TEXT,
    progress INTEGER DEFAULT 0 NOT NULL CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_jobs_user ON public.processing_jobs(user_id);
CREATE INDEX idx_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_jobs_type ON public.processing_jobs(type);

-- ===========================================
-- SUBSCRIPTION PLANS TABLE
-- ===========================================

CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tier subscription_tier NOT NULL UNIQUE,
    price_monthly INTEGER NOT NULL,
    price_yearly INTEGER NOT NULL,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    features JSONB DEFAULT '[]' NOT NULL,
    limits JSONB DEFAULT '{}' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- ===========================================

INSERT INTO public.subscription_plans (name, tier, price_monthly, price_yearly, features, limits) VALUES
(
    'Free',
    'free',
    0,
    0,
    '["基本的な編集機能", "1日5回まで処理", "最大50MBファイル", "標準画質出力", "透かしあり"]'::jsonb,
    '{"daily_processing_limit": 5, "max_file_size_mb": 50, "max_storage_gb": 1, "watermark": true, "ai_features": false}'::jsonb
),
(
    'Pro',
    'pro',
    980,
    9800,
    '["すべての編集機能", "1日100回まで処理", "最大500MBファイル", "高画質出力", "透かしなし", "AI機能（ベータ）", "優先サポート"]'::jsonb,
    '{"daily_processing_limit": 100, "max_file_size_mb": 500, "max_storage_gb": 50, "watermark": false, "ai_features": true}'::jsonb
),
(
    'Business',
    'business',
    2980,
    29800,
    '["すべての編集機能", "無制限処理", "最大2GBファイル", "最高画質出力", "透かしなし", "全AI機能", "API アクセス", "優先サポート", "チーム機能"]'::jsonb,
    '{"daily_processing_limit": -1, "max_file_size_mb": 2048, "max_storage_gb": 500, "watermark": false, "ai_features": true, "api_access": true}'::jsonb
),
(
    'Enterprise',
    'enterprise',
    0,
    0,
    '["カスタム機能", "無制限すべて", "専用サポート", "SLA保証", "オンプレミス対応可"]'::jsonb,
    '{"daily_processing_limit": -1, "max_file_size_mb": -1, "max_storage_gb": -1, "watermark": false, "ai_features": true, "api_access": true, "custom": true}'::jsonb
);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public projects" ON public.projects
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Media files policies
CREATE POLICY "Users can view own media files" ON public.media_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own media files" ON public.media_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media files" ON public.media_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media files" ON public.media_files
    FOR DELETE USING (auth.uid() = user_id);

-- Processing jobs policies
CREATE POLICY "Users can view own jobs" ON public.processing_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON public.processing_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.processing_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscription plans - everyone can view
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = TRUE);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily usage
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.usage_reset_at < NOW() - INTERVAL '1 day' THEN
        NEW.usage_count_today = 0;
        NEW.usage_reset_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_usage_reset
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION reset_daily_usage();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    FALSE,
    2147483648, -- 2GB
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
