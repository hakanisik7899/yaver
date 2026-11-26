import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_SCOPES_LABEL } from "@/lib/google/scopes";
import { TRIAL_DAYS } from "@/lib/plans/plans";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Supabase does not persist Google's provider tokens; keep the refresh
  // token server-side so Yaver can call the Calendar API later.
  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    const admin = createAdminClient();
    const row = {
      user_id: data.session.user.id,
      refresh_token: refreshToken,
      scopes: GOOGLE_SCOPES_LABEL,
      updated_at: new Date().toISOString(),
    };
    // A fresh token: any earlier "connection broken" state is over.
    let { error: saveError } = await admin.from("google_connections").upsert({ ...row, broken_at: null });
    if (saveError?.code === "PGRST204") {
      // broken_at column missing (migration 0010 not run yet): save the token anyway.
      ({ error: saveError } = await admin.from("google_connections").upsert(row));
    }
    if (saveError) {
      console.error("Failed to store Google refresh token", saveError);
    }
  }

  // First sign-in: a Pro trial. Users who already have a plan row (an
  // earlier trial, or a plan set by the admin) are left alone.
  const { error: trialError } = await createAdminClient()
    .from("user_plans")
    .upsert(
      {
        user_id: data.session.user.id,
        plan: "pro",
        pro_until: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
        note: "trial",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (trialError) console.error("Failed to start Pro trial", trialError);

  return NextResponse.redirect(`${origin}/`);
}
