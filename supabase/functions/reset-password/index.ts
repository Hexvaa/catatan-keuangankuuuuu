import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { username, newPassword } = await req.json()

    if (!username || !newPassword) {
      return new Response(JSON.stringify({ error: "Username dan password wajib diisi." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password minimal 6 karakter." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Cari user berdasarkan username
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username.trim())
      .maybeSingle()

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Username tidak ditemukan." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Update password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    )

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Gagal mengubah password." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch {
    return new Response(JSON.stringify({ error: "Terjadi kesalahan." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
