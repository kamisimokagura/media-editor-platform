-- ===========================================
-- Analytics Events (Funnel Tracking)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id TEXT,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_params JSONB DEFAULT '{}'::jsonb NOT NULL,
    page_path TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
    ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time
    ON public.analytics_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_time
    ON public.analytics_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path_time
    ON public.analytics_events (page_path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_params_gin
    ON public.analytics_events USING gin (event_params);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'analytics_events'
          AND policyname = 'Users can view own analytics events'
    ) THEN
        CREATE POLICY "Users can view own analytics events"
            ON public.analytics_events
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'analytics_events'
          AND policyname = 'Users can insert analytics events'
    ) THEN
        CREATE POLICY "Users can insert analytics events"
            ON public.analytics_events
            FOR INSERT
            WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
    END IF;
END $$;
