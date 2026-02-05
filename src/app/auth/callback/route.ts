import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent(error_description || error)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${origin}/auth/signin?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // Get the user to create/update their profile
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser) {
        // Create new user profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            subscription_tier: 'free',
            usage_count_today: 0,
            usage_reset_at: new Date().toISOString(),
            total_files_processed: 0,
            storage_used_bytes: 0,
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code present, redirect to sign in
  return NextResponse.redirect(`${origin}/auth/signin`);
}
