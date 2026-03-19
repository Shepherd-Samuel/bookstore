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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check school_admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "school_admin")
      .maybeSingle();

    if (!roleData) throw new Error("Forbidden: School admin role required");

    // Get caller's school_id
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.school_id) throw new Error("No school associated with your account");

    const body = await req.json();
    const { first_name, last_name, email, phone, national_id, relationship } = body;

    if (!email || !first_name) {
      throw new Error("Email and first name are required");
    }

    const trimmedEmail = email.trim().toLowerCase();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if parent with this email already exists in this school
    const { data: existingParent } = await adminClient
      .from("parents")
      .select("id, first_name, last_name")
      .eq("school_id", callerProfile.school_id)
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (existingParent) {
      throw new Error(`Parent already exists: ${existingParent.first_name} ${existingParent.last_name}`);
    }

    // Try to create auth user - if email already exists, look them up
    let userId: string;
    let isExistingUser = false;
    const tempPassword = `eG${first_name.charAt(0).toUpperCase()}${Date.now().toString(36).slice(-4)}!`;

    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email: trimmedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name: last_name || "",
        role: "parent",
        temp_password: tempPassword,
      },
    });

    if (userError) {
      // If user already exists, find them
      if (userError.message?.includes("already been registered") || userError.message?.includes("already exists")) {
        const { data: listData } = await adminClient.auth.admin.listUsers({ filter: trimmedEmail, page: 1, perPage: 1 });
        const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === trimmedEmail);
        if (!existing) throw new Error(`Account creation failed: ${userError.message}`);
        userId = existing.id;
        isExistingUser = true;
      } else {
        throw new Error(`Account creation failed: ${userError.message}`);
      }
    } else {
      userId = newUser.user!.id;
    }

    // Create parent record with user_id linked
    const { data: parentData, error: parentError } = await adminClient
      .from("parents")
      .insert({
        school_id: callerProfile.school_id,
        first_name: first_name.trim(),
        last_name: (last_name || "").trim(),
        email: trimmedEmail,
        phone: phone || null,
        national_id: national_id || null,
        relationship: relationship || "parent",
        user_id: userId,
      })
      .select("id")
      .single();

    if (parentError) {
      // Clean up auth user if we just created it and parent insert fails
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(userId);
      }
      throw new Error(`Parent record creation failed: ${parentError.message}`);
    }

    // Create a profile for the parent so they can log in and access the system
    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminClient.from("profiles").insert({
        id: userId,
        school_id: callerProfile.school_id,
        first_name: first_name.trim(),
        last_name: (last_name || "").trim(),
        role: "parent",
        phone: phone || "",
        is_active: true,
      });
    }

    // Assign parent role in user_roles (if not already assigned)
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "parent")
      .maybeSingle();

    if (!existingRole) {
      await adminClient.from("user_roles").insert({
        user_id: userId,
        role: "parent",
        school_id: callerProfile.school_id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        parent_id: parentData.id,
        user_id: userId,
        email: trimmedEmail,
        temp_password: isExistingUser ? null : tempPassword,
        is_existing_user: isExistingUser,
        message: isExistingUser
          ? "Parent linked to existing account. They can log in with their current credentials."
          : `Parent account created. A verification email has been sent to ${trimmedEmail}. Temporary password: ${tempPassword}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("register-parent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
