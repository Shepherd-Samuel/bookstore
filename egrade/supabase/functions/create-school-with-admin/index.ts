import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the calling user is a SaaS admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check saas_admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "saas_admin")
      .maybeSingle();

    if (!roleData) throw new Error("Forbidden: SaaS admin role required");

    const body = await req.json();
    const {
      school_name, location, address, phone, email, website, moto,
      plan_id, billing_cycle,
      admin_email, admin_first_name, admin_last_name, admin_phone,
    } = body;

    // Use service role client for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Create the school
    const { data: school, error: schoolError } = await adminClient
      .from("schools")
      .insert({
        school_name,
        location: location || "",
        address: address || "",
        phone: phone || "",
        email: email || "",
        website: website || "",
        moto: moto || "",
        is_active: true,
        is_setup_complete: false,
      })
      .select()
      .single();

    if (schoolError) throw new Error(`School creation failed: ${schoolError.message}`);

    // 2. Create auth user for the school admin
    const tempPassword = admin_email.split("@")[0] + "Eg2026!"; // Temp password
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email: admin_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: admin_first_name, last_name: admin_last_name },
    });

    if (userError) {
      // Rollback school creation
      await adminClient.from("schools").delete().eq("id", school.id);
      throw new Error(`Admin user creation failed: ${userError.message}`);
    }

    // 3. Create profile for the admin
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user!.id,
        school_id: school.id,
        first_name: admin_first_name,
        last_name: admin_last_name,
        role: "school_admin",
        phone: admin_phone || "",
        is_active: true,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // 4. Assign school_admin role in user_roles
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user!.id,
        role: "school_admin",
        school_id: school.id,
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    // 5. Create subscription if plan_id provided
    if (plan_id) {
      const starts_at = new Date();
      const expires_at = new Date();
      if (billing_cycle === "yearly") {
        expires_at.setFullYear(expires_at.getFullYear() + 1);
      } else {
        expires_at.setMonth(expires_at.getMonth() + 1);
      }

      await adminClient.from("school_subscriptions").insert({
        school_id: school.id,
        plan_id,
        status: "active",
        billing_cycle: billing_cycle || "monthly",
        starts_at: starts_at.toISOString(),
        expires_at: expires_at.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        school,
        admin_email,
        temp_password: tempPassword,
        message: "School and admin created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-school-with-admin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
