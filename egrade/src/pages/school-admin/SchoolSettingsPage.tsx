import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeFormData, sanitizeInput } from "@/lib/sanitize";
import {
  Save, Loader2, Upload, School, MapPin, Phone, Mail, Globe, Image,
  Package, ArrowUpCircle, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type SchoolData = {
  id: string; school_name: string; email: string | null; phone: string | null;
  moto: string | null; address: string | null; location: string | null;
  website: string | null; logo_url: string | null;
};

type Plan = { id: string; name: string; slug: string; description: string | null; price_monthly: number; price_yearly: number; max_students: number | null; max_teachers: number | null; features: any; is_active: boolean };
type Subscription = { id: string; plan_id: string; status: string; billing_cycle: string; starts_at: string; expires_at: string | null };
type UpgradeRequest = { id: string; requested_plan_id: string; status: string; requested_at: string; reviewed_at: string | null; admin_notes: string | null; school_notes: string | null; requested_billing_cycle: string };

export default function SchoolSettingsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    school_name: "", email: "", phone: "", moto: "",
    address: "", location: "", website: "",
  });

  // Subscription state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [upgradeNotes, setUpgradeNotes] = useState("");
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [schoolRes, plansRes, subRes, reqRes] = await Promise.all([
        supabase.from("schools").select("id, school_name, email, phone, moto, address, location, website, logo_url").eq("id", schoolId).single(),
        supabase.from("plans").select("*").eq("is_active", true).order("price_monthly"),
        supabase.from("school_subscriptions").select("*").eq("school_id", schoolId).eq("status", "active").order("created_at", { ascending: false }).limit(1),
        supabase.from("plan_upgrade_requests").select("*").eq("school_id", schoolId).order("requested_at", { ascending: false }),
      ]);
      if (schoolRes.data) {
        setSchool(schoolRes.data as SchoolData);
        setForm({
          school_name: schoolRes.data.school_name || "",
          email: schoolRes.data.email || "",
          phone: schoolRes.data.phone || "",
          moto: schoolRes.data.moto || "",
          address: schoolRes.data.address || "",
          location: schoolRes.data.location || "",
          website: schoolRes.data.website || "",
        });
      }
      if (plansRes.data) setPlans(plansRes.data as Plan[]);
      if (subRes.data?.[0]) setSubscription(subRes.data[0] as Subscription);
      if (reqRes.data) setUpgradeRequests(reqRes.data as UpgradeRequest[]);
      setLoading(false);
    };
    fetchAll();
  }, [schoolId]);

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);
  const hasPendingRequest = upgradeRequests.some(r => r.status === "pending");

  const handleSave = async () => {
    if (!schoolId || !form.school_name) return;
    setSaving(true);
    const sanitized = sanitizeFormData(form);
    const { error } = await supabase.from("schools").update({
      school_name: sanitized.school_name,
      email: sanitized.email || null, phone: sanitized.phone || null,
      moto: sanitized.moto || null, address: sanitized.address || null,
      location: sanitized.location || null, website: sanitized.website || null,
    }).eq("id", schoolId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "School Details Updated" });
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" }); return; }
    if (file.size > 2 * 1024 * 1024) { toast({ title: "File too large", description: "Maximum 2MB allowed.", variant: "destructive" }); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${schoolId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("school-logos").upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload Error", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("school-logos").getPublicUrl(path);
    const logoUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("schools").update({ logo_url: logoUrl }).eq("id", schoolId);
    if (updateError) toast({ title: "Error", description: updateError.message, variant: "destructive" });
    else { setSchool(prev => prev ? { ...prev, logo_url: logoUrl } : prev); toast({ title: "Logo Updated!" }); }
    setUploading(false);
  };

  const handleSubmitUpgrade = async () => {
    if (!schoolId || !selectedPlanId || !profile?.id) return;
    if (selectedPlanId === subscription?.plan_id) {
      toast({ title: "Same plan", description: "Please select a different plan.", variant: "destructive" });
      return;
    }
    setSubmittingUpgrade(true);
    const { error } = await supabase.from("plan_upgrade_requests").insert({
      school_id: schoolId,
      current_plan_id: subscription?.plan_id || null,
      requested_plan_id: selectedPlanId,
      requested_billing_cycle: selectedCycle,
      requested_by: profile.id,
      school_notes: upgradeNotes ? sanitizeInput(upgradeNotes, 500) : null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Upgrade Request Submitted", description: "The super admin will review your request after payment verification." });
      setShowUpgrade(false);
      setSelectedPlanId("");
      setUpgradeNotes("");
      // Refresh requests
      const { data } = await supabase.from("plan_upgrade_requests").select("*").eq("school_id", schoolId).order("requested_at", { ascending: false });
      if (data) setUpgradeRequests(data as UpgradeRequest[]);
    }
    setSubmittingUpgrade(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-foreground">School Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Update your school's details, logo, subscription, and contact information</p>
      </div>

      {/* Subscription & Plan */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Subscription & Plan
        </h3>

        {subscription && currentPlan ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Current Plan</p>
                <p className="font-bold text-foreground">{currentPlan.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Billing</p>
                <p className="font-bold text-foreground capitalize">{subscription.billing_cycle}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Price</p>
                <p className="font-bold text-foreground">
                  KES {subscription.billing_cycle === "yearly" ? currentPlan.price_yearly.toLocaleString() : currentPlan.price_monthly.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">/{subscription.billing_cycle === "yearly" ? "yr" : "mo"}</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Expires</p>
                <p className="font-bold text-foreground">
                  {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString("en-KE") : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>👨‍🎓 Max {currentPlan.max_students ?? "∞"} students</span>
              <span>👩‍🏫 Max {currentPlan.max_teachers ?? "∞"} teachers</span>
            </div>

            <Button variant="outline" onClick={() => { setShowUpgrade(true); setSelectedPlanId(""); }} disabled={hasPendingRequest} className="gap-2 font-semibold">
              <ArrowUpCircle className="w-4 h-4" />
              {hasPendingRequest ? "Upgrade Request Pending" : "Request Plan Change"}
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
            No active subscription found. Please contact the super admin.
          </div>
        )}

        {/* Upgrade request history */}
        {upgradeRequests.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase">Plan Change Requests</p>
            {upgradeRequests.slice(0, 5).map(req => {
              const reqPlan = plans.find(p => p.id === req.requested_plan_id);
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      → {reqPlan?.name || "Unknown"} ({req.requested_billing_cycle})
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(req.requested_at).toLocaleDateString("en-KE")}</p>
                  </div>
                  <Badge variant="outline" className={
                    req.status === "approved" ? "bg-green-500/10 text-green-700 border-green-200" :
                    req.status === "rejected" ? "bg-red-500/10 text-red-700 border-red-200" :
                    "bg-amber-500/10 text-amber-700 border-amber-200"
                  }>
                    {req.status === "approved" ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</> :
                     req.status === "rejected" ? <><XCircle className="w-3 h-3 mr-1" /> Rejected</> :
                     <><Clock className="w-3 h-3 mr-1" /> Pending</>}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logo Upload */}
      <div className="stat-card">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-primary" /> School Logo
        </h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {school?.logo_url ? (
              <img src={school.logo_url} alt="School logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <School className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 font-semibold">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload Logo"}
            </Button>
            <p className="text-[10px] text-muted-foreground">PNG, JPG up to 2MB. Recommended: 200×200px square.</p>
          </div>
        </div>
      </div>

      {/* School Details */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <School className="w-4 h-4 text-primary" /> School Information
        </h3>
        <div>
          <Label className="text-xs font-semibold">School Name *</Label>
          <Input value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-semibold">School Motto</Label>
          <Input value={form.moto} onChange={e => setForm(p => ({ ...p, moto: e.target.value }))} placeholder="e.g. Excellence in Education" className="mt-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="school@example.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 700 000000" className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Location / County</Label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Nairobi County" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
            <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://school.co.ke" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Postal Address</Label>
          <Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="P.O. Box 12345 — 00100, Nairobi" className="mt-1" rows={2} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save School Details
        </Button>
      </div>

      {/* Upgrade Request Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" /> Request Plan Change
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {currentPlan && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-xs text-muted-foreground font-semibold">Current Plan</p>
                <p className="font-bold text-foreground">{currentPlan.name} — KES {currentPlan.price_monthly.toLocaleString()}/mo</p>
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold">New Plan *</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.id !== subscription?.plan_id).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — KES {p.price_monthly.toLocaleString()}/mo (KES {p.price_yearly.toLocaleString()}/yr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Billing Cycle</Label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Notes (optional)</Label>
              <Textarea value={upgradeNotes} onChange={e => setUpgradeNotes(e.target.value)} placeholder="e.g. Payment reference, reason for upgrade..." className="mt-1" rows={3} />
            </div>
            <div className="rounded-xl border border-dashed border-primary/30 p-3 bg-primary/5 text-xs text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> Your request will be sent to the super admin.
              Once payment is verified, they will approve the change and your subscription will be updated.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Cancel</Button>
            <Button onClick={handleSubmitUpgrade} disabled={submittingUpgrade || !selectedPlanId} className="font-bold gap-2">
              {submittingUpgrade ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
