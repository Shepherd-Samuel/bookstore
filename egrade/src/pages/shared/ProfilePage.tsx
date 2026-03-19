import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CameraCapture from "@/components/CameraCapture";
import {
  User, Lock, Save, Loader2, CheckCircle2, Eye, EyeOff, Camera, Upload,
} from "lucide-react";

export default function ProfilePage() {
  const { profile, user, effectiveRole, refreshProfile } = useAuth();
  const { toast } = useToast();
  const isSaasAdmin = effectiveRole === "saas_admin";
  const isStudent = effectiveRole === "student";

  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // SaaS admin profile state
  const [saasEmail, setSaasEmail] = useState(user?.email || "");
  const [saasFirstName, setSaasFirstName] = useState("");
  const [saasLastName, setSaasLastName] = useState("");
  const [saasPhone, setSaasPhone] = useState("");
  const [saasAvatarUrl, setSaasAvatarUrl] = useState("");
  const [savingSaas, setSavingSaas] = useState(false);
  const [saasLoading, setSaasLoading] = useState(true);
  const saasFileRef = useRef<HTMLInputElement>(null);
  const [uploadingSaas, setUploadingSaas] = useState(false);

  // Load SaaS admin profile
  useEffect(() => {
    if (!isSaasAdmin || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("saas_admin_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSaasFirstName(data.first_name || "");
        setSaasLastName(data.last_name || "");
        setSaasPhone(data.phone || "");
        setSaasAvatarUrl(data.avatar_url || "");
      }
      setSaasLoading(false);
    };
    load();
  }, [isSaasAdmin, user]);

  const handleSaasProfileSave = async () => {
    if (!user) return;
    setSavingSaas(true);

    // Upsert saas_admin_profiles
    const { error: profileErr } = await supabase
      .from("saas_admin_profiles")
      .upsert({
        user_id: user.id,
        first_name: saasFirstName.trim(),
        last_name: saasLastName.trim(),
        phone: saasPhone.trim(),
        avatar_url: saasAvatarUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (profileErr) {
      toast({ title: "Error", description: profileErr.message, variant: "destructive" });
      setSavingSaas(false);
      return;
    }

    // Update email if changed
    if (saasEmail && saasEmail !== user.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: saasEmail });
      if (emailErr) {
        toast({ title: "Profile saved, but email update failed", description: emailErr.message, variant: "destructive" });
      } else {
        toast({ title: "Profile Saved", description: "Check your new email for a confirmation link." });
      }
    } else {
      toast({ title: "Profile Saved" });
    }
    setSavingSaas(false);
  };

  const handleSaasAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    setUploadingSaas(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("saas-avatars").upload(filePath, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingSaas(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("saas-avatars").getPublicUrl(filePath);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setSaasAvatarUrl(url);
    // Save to DB immediately
    await supabase.from("saas_admin_profiles").upsert({
      user_id: user.id,
      avatar_url: url,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Photo Updated" });
    setUploadingSaas(false);
  };

  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canChangePhoto = !isStudent;

  const handleSaveProfile = async () => {
    if (isSaasAdmin) {
      toast({ title: "Profile Updated", description: "SaaS admin details saved." });
      return;
    }
    if (!profile?.id) return;
    setSaving(true);
    const updates: any = {};
    if (!isStudent) {
      updates.first_name = firstName;
      updates.last_name = lastName;
    }
    updates.phone = phone;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated" });
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password Changed", description: "Your password has been updated." });
      setNewPwd("");
      setConfirmPwd("");
    }
    setChangingPwd(false);
  };

  const uploadPhoto = async (file: File) => {
    if (!profile?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${profile.school_id}/${profile.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("passports")
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload Failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("passports").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ passport_url: publicUrl })
      .eq("id", profile.id);

    if (updateErr) {
      toast({ title: "Error", description: updateErr.message, variant: "destructive" });
    } else {
      toast({ title: "Photo Updated" });
      await refreshProfile();
    }
    setUploading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file);
  };

  const handleCameraCapture = (file: File) => {
    uploadPhoto(file);
  };

  const photoUrl = profile?.passport_url;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your personal details and password
        </p>
      </div>

      {/* Photo Section */}
      {isSaasAdmin ? (
        <div className="stat-card">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-primary" /> Profile Photo
          </h3>
          <div className="flex items-center gap-5">
            <div className="relative group">
              {saasAvatarUrl ? (
                <img src={saasAvatarUrl} alt="Profile" className="w-24 h-24 rounded-xl object-cover border-2 border-border shadow-sm" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <User className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <button
                onClick={() => saasFileRef.current?.click()}
                disabled={uploadingSaas}
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingSaas ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
              </button>
            </div>
            <div className="space-y-1.5">
              <Button size="sm" variant="outline" onClick={() => saasFileRef.current?.click()} disabled={uploadingSaas} className="gap-2 text-xs font-bold">
                {uploadingSaas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {saasAvatarUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-[10px] text-muted-foreground">JPG, PNG. Max 5MB.</p>
            </div>
            <input ref={saasFileRef} type="file" accept="image/*" className="hidden" onChange={handleSaasAvatarUpload} />
          </div>
        </div>
      ) : (
        <div className="stat-card">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-primary" /> Profile Photo
          </h3>
          <div className="flex items-center gap-5">
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-xl object-cover border-2 border-border shadow-sm" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <User className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              {canChangePhoto && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {canChangePhoto ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 text-xs font-bold">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {photoUrl ? "Change Photo" : "Upload Photo"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCameraOpen(true)} disabled={uploading} className="gap-2 text-xs font-bold">
                      <Camera className="w-3.5 h-3.5" /> Use Camera
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG. Max 5MB. Used in reports.</p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {isStudent ? "Your photo can only be updated by your class teacher or school admin." : "Photo displayed in reports and records."}
                </p>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>
      )}

      {/* Profile Details */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Personal Details
        </h3>

        {isSaasAdmin ? (
          <div className="space-y-4">
            {saasLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">First Name</Label>
                    <Input value={saasFirstName} onChange={e => setSaasFirstName(e.target.value)} className="mt-1" placeholder="Enter first name" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Last Name</Label>
                    <Input value={saasLastName} onChange={e => setSaasLastName(e.target.value)} className="mt-1" placeholder="Enter last name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Email</Label>
                    <Input value={saasEmail} onChange={e => setSaasEmail(e.target.value)} type="email" className="mt-1" placeholder="admin@egrade.ke" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Phone</Label>
                    <Input value={saasPhone} onChange={e => setSaasPhone(e.target.value)} className="mt-1" placeholder="+254 700 000000" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                  <Input value="Platform Administrator" disabled className="mt-1" />
                </div>
                <p className="text-xs text-muted-foreground">Platform admin account — not linked to any school.</p>
                <Button onClick={handleSaasProfileSave} disabled={savingSaas} className="font-bold gap-2">
                  {savingSaas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">First Name</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  disabled={isStudent}
                  className="mt-1"
                />
                {isStudent && <p className="text-[10px] text-muted-foreground mt-1">Contact admin to change name</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  disabled={isStudent}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 700 000000" className="mt-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                <Input value={effectiveRole.replace("_", " ")} disabled className="mt-1 capitalize" />
              </div>
            </div>

            {profile?.adm_no && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Admission No.</Label>
                <Input value={profile.adm_no} disabled className="mt-1" />
              </div>
            )}

            <Button onClick={handleSaveProfile} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </>
        )}
      </div>

      {/* Password Change */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" /> Change Password
        </h3>

        <div>
          <Label className="text-xs font-semibold">New Password</Label>
          <div className="relative mt-1">
            <Input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Minimum 6 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold">Confirm Password</Label>
          <Input
            type="password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Re-enter new password"
            className="mt-1"
          />
        </div>

        <Button onClick={handleChangePassword} disabled={changingPwd} variant="outline" className="font-bold gap-2">
          {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Update Password
        </Button>
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
