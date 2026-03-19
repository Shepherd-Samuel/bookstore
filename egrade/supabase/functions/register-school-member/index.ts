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

    // Get calling user's school_id
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.school_id) throw new Error("No school associated with your account");

    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "register") {
      const {
        email, first_name, last_name, role, phone, gender, dob,
        adm_no, class_id, stream_id,
      } = body;

      if (!email || !first_name || !role) {
        throw new Error("Email, first name, and role are required");
      }

      // For students, password is their DOB (YYYY-MM-DD format)
      // For teachers, generate a temp password
      let password: string;
      if (role === "student" && dob) {
        // DOB as password e.g. "2012-05-15" (10 chars, meets min 6)
        password = dob;
      } else {
        password = email.split("@")[0] + "Eg2026!";
      }

      // Create auth user
      const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      });

      if (userError) throw new Error(`User creation failed: ${userError.message}`);

      // Create profile
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: newUser.user!.id,
          school_id: callerProfile.school_id,
          first_name,
          last_name: last_name || "",
          role,
          phone: phone || "",
          gender: gender || null,
          dob: dob || null,
          adm_no: adm_no || null,
          class_id: class_id || null,
          stream_id: stream_id || null,
          is_active: true,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Try to clean up auth user
        await adminClient.auth.admin.deleteUser(newUser.user!.id);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Assign role in user_roles
      await adminClient.from("user_roles").insert({
        user_id: newUser.user!.id,
        role,
        school_id: callerProfile.school_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUser.user!.id,
          email,
          temp_password: password,
          message: `${role} registered successfully`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id) throw new Error("user_id is required");

      // Verify the target user belongs to the same school
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("school_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.school_id !== callerProfile.school_id) {
        throw new Error("User not found in your school");
      }

      // If new_password not provided, look up DOB for students
      let pwd = new_password;
      if (!pwd) {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("dob, role")
          .eq("id", user_id)
          .single();
        if (prof?.role === "student" && prof.dob) {
          pwd = prof.dob;
        } else {
          pwd = "Reset2026!";
        }
      }

      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: pwd });
      if (error) throw new Error(`Password reset failed: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true, new_password: pwd, message: "Password reset successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("register-school-member error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
