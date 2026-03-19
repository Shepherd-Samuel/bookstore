import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, School, CheckCircle2, XCircle, Search, RefreshCw,
  Loader2, Power, PowerOff, AlertTriangle, ArrowUpCircle, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SchoolRow = {
  id: string; school_name: string; location: string; email: string; phone: string;
  is_active: boolean; is_setup_complete: boolean; registration_date: string;
  subscription?: { id: string; status: string; expires_at: string | null; plan_id: string; billing_cycle: string; plan?: { name: string; id: string } };
};

type Plan = { id: string; name: string; price_monthly: number; price_yearly: number };

type UpgradeRequest = {
  id: string; school_id: string; current_plan_id: string | null; requested_plan_id: string;
  requested_billing_cycle: string; status: string; requested_at: string;
  reviewed_at: string | null; admin_notes: string | null; school_notes: string | null;
  requested_by: string;
};

const emptyForm = {
  school_name: "", location: "", address: "", phone: "", email: "", website: "", moto: "",
  plan_id: "", billing_cycle: "monthly",
  admin_email: "", admin_first_name: "", admin_last_name: "", admin_phone: "",
};

export default function SchoolsPage() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<{ email: string; password: string } | null>(null);

  // Upgrade requests
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processingRequest, setProcessingRequest] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [schoolsRes, plansRes, reqRes] = await Promise.all([
      supabase.from("schools").select(`*, school_subscriptions(id, status, expires_at, plan_id, billing_cycle, plans(id, name))`).order("registration_date", { ascending: false }),
      supabase.from("plans").select("*").eq("is_active", true).order("price_monthly"),
      supabase.from("plan_upgrade_requests").select("*").order("requested_at", { ascending: false }),
    ]);
    if (schoolsRes.data) {
      setSchools(schoolsRes.data.map((s: any) => ({
        ...s,
        subscription: s.school_subscriptions?.[0]
          ? { ...s.school_subscriptions[0], plan: s.school_subscriptions[0].plans }
          : undefined,
      })));
    }
    if (plansRes.data) setPlans(plansRes.data);
    if (reqRes.data) setUpgradeRequests(reqRes.data as UpgradeRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleSchoolStatus = async (school: SchoolRow) => {
    setActionLoading(school.id);
    const newStatus = !school.is_active;
    const { error } = await supabase.from("schools").update({ is_active: newStatus }).eq("id", school.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: newStatus ? "School Activated" : "School Suspended", description: `${school.school_name} has been ${newStatus ? "activated" : "suspended"}.` });
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, is_active: newStatus } : s));
    }
    setActionLoading(null);
  };

  const handleCreate = async () => {
    if (!form.school_name || !form.admin_email || !form.admin_first_name) {
      toast({ title: "Missing fields", description: "School name, admin email and first name are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-school-with-admin", { body: form });
    if (error || data?.error) {
      toast({ title: "Creation Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCreatedAdmin({ email: data.admin_email, password: data.temp_password });
      setShowCreate(false);
      setForm(emptyForm);
      fetchData();
      toast({ title: "School Created!", description: `${form.school_name} and admin account created successfully.` });
    }
    setCreating(false);
  };

  const handleApproveRequest = async (approve: boolean) => {
    if (!selectedRequest) return;
    setProcessingRequest(true);
    
    // Update the request status
    const { error: reqError } = await supabase.from("plan_upgrade_requests")
      .update({
        status: approve ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      } as any)
      .eq("id", selectedRequest.id);

    if (reqError) {
      toast({ title: "Error", description: reqError.message, variant: "destructive" });
      setProcessingRequest(false);
      return;
    }

    // If approved, update the school subscription
    if (approve) {
      const school = schools.find(s => s.id === selectedRequest.school_id);
      if (school?.subscription?.id) {
        await supabase.from("school_subscriptions").update({
          plan_id: selectedRequest.requested_plan_id,
          billing_cycle: selectedRequest.requested_billing_cycle,
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", school.subscription.id);
      } else {
        // Create new subscription
        await supabase.from("school_subscriptions").insert({
          school_id: selectedRequest.school_id,
          plan_id: selectedRequest.requested_plan_id,
          billing_cycle: selectedRequest.requested_billing_cycle,
          status: "active",
        });
      }
      // Ensure school is active
      await supabase.from("schools").update({ is_active: true }).eq("id", selectedRequest.school_id);
    }

    toast({ title: approve ? "Request Approved" : "Request Rejected", description: approve ? "Subscription updated successfully." : "The school has been notified." });
    setSelectedRequest(null);
    setAdminNotes("");
    fetchData();
    setProcessingRequest(false);
  };

  const filtered = schools.filter(s =>
    s.school_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingRequests = upgradeRequests.filter(r => r.status === "pending");

  const statusBadge = (school: SchoolRow) => {
    if (!school.is_active) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Suspended</span>;
    const sub = school.subscription;
    if (!sub) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">No Plan</span>;
    if (sub.status === "suspended") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Plan Expired</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">Active</span>;
  };

  const getSchoolName = (schoolId: string) => schools.find(s => s.id === schoolId)?.school_name || "Unknown School";
  const getPlanName = (planId: string | null) => plans.find(p => p.id === planId)?.name || "—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">School Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{schools.length} schools · {schools.filter(s => s.is_active).length} active</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2 font-bold">
          <Plus className="w-4 h-4" /> New School
        </Button>
      </div>

      <Tabs defaultValue="schools">
        <TabsList>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            Upgrade Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">{pendingRequests.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schools" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schools..." className="pl-9" />
            </div>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <School className="w-10 h-10" />
                <p className="font-semibold">No schools found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["School", "Location", "Contact", "Plan", "Expiry", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(school => (
                      <tr key={school.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
                              <School className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{school.school_name}</p>
                              <p className="text-[10px] text-muted-foreground">{school.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{school.location || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{school.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-foreground">{school.subscription?.plan?.name || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {school.subscription?.expires_at ? new Date(school.subscription.expires_at).toLocaleDateString("en-KE") : "—"}
                        </td>
                        <td className="px-4 py-3">{statusBadge(school)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant={school.is_active ? "destructive" : "default"} onClick={() => toggleSchoolStatus(school)}
                            disabled={actionLoading === school.id} className="flex items-center gap-1.5 h-7 text-xs font-bold">
                            {actionLoading === school.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                              school.is_active ? <><PowerOff className="w-3 h-3" /> Suspend</> : <><Power className="w-3 h-3" /> Activate</>}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {upgradeRequests.length === 0 ? (
            <div className="stat-card text-center py-12">
              <ArrowUpCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">No upgrade requests</p>
              <p className="text-xs text-muted-foreground mt-1">Schools will appear here when they request a plan change.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upgradeRequests.map(req => (
                <div key={req.id} className="stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{getSchoolName(req.school_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getPlanName(req.current_plan_id)} → <strong>{getPlanName(req.requested_plan_id)}</strong> ({req.requested_billing_cycle})
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(req.requested_at).toLocaleString("en-KE")}</p>
                      {req.school_notes && <p className="text-xs text-muted-foreground mt-1 italic">"{req.school_notes}"</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        req.status === "approved" ? "bg-green-500/10 text-green-700 border-green-200" :
                        req.status === "rejected" ? "bg-red-500/10 text-red-700 border-red-200" :
                        "bg-amber-500/10 text-amber-700 border-amber-200"
                      }>
                        {req.status === "approved" ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</> :
                         req.status === "rejected" ? <><XCircle className="w-3 h-3 mr-1" /> Rejected</> :
                         <><Clock className="w-3 h-3 mr-1" /> Pending</>}
                      </Badge>
                      {req.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(req); setAdminNotes(""); }}>
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black">Review Upgrade Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold">School</p>
                  <p className="font-bold text-foreground">{getSchoolName(selectedRequest.school_id)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold">Billing</p>
                  <p className="font-bold text-foreground capitalize">{selectedRequest.requested_billing_cycle}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold">Current Plan</p>
                  <p className="font-bold text-foreground">{getPlanName(selectedRequest.current_plan_id)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-primary font-semibold">Requested Plan</p>
                  <p className="font-bold text-foreground">{getPlanName(selectedRequest.requested_plan_id)}</p>
                </div>
              </div>
              {selectedRequest.school_notes && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold">School Notes</p>
                  <p className="text-sm text-foreground">{selectedRequest.school_notes}</p>
                </div>
              )}
              <div>
                <Label className="text-xs font-semibold">Admin Notes (optional)</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="e.g. Payment verified via M-Pesa ref XYZ..." className="mt-1" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleApproveRequest(false)} disabled={processingRequest} className="gap-1.5">
              {processingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
            </Button>
            <Button onClick={() => handleApproveRequest(true)} disabled={processingRequest} className="gap-1.5 font-bold">
              {processingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve & Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create School Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Create New School</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">School Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "school_name", label: "School Name *", placeholder: "Nairobi JSS" },
                  { key: "location", label: "Location", placeholder: "Nairobi" },
                  { key: "address", label: "Address", placeholder: "P.O. Box 123, Nairobi" },
                  { key: "phone", label: "Phone", placeholder: "+254 700 000000" },
                  { key: "email", label: "School Email", placeholder: "info@school.ac.ke" },
                  { key: "website", label: "Website", placeholder: "https://school.ac.ke" },
                  { key: "moto", label: "School Motto", placeholder: "Knowledge is Power" },
                ].map(f => (
                  <div key={f.key} className={f.key === "school_name" ? "sm:col-span-2" : ""}>
                    <Label className="text-xs font-semibold">{f.label}</Label>
                    <Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Subscription Plan</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Plan</Label>
                  <Select value={form.plan_id} onValueChange={v => setForm(p => ({ ...p, plan_id: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — KES {p.price_monthly.toLocaleString()}/mo</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Billing Cycle</Label>
                  <Select value={form.billing_cycle} onValueChange={v => setForm(p => ({ ...p, billing_cycle: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">First Admin Account</p>
              <div className="rounded-xl border border-dashed border-accent/40 p-4 bg-accent/5 mb-3">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>A temporary password will be generated and shown once. The admin should change it on first login.</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "admin_first_name", label: "First Name *", placeholder: "John" },
                  { key: "admin_last_name", label: "Last Name", placeholder: "Kamau" },
                  { key: "admin_email", label: "Admin Email *", placeholder: "admin@school.ac.ke" },
                  { key: "admin_phone", label: "Admin Phone", placeholder: "+254 700 000000" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs font-semibold">{f.label}</Label>
                    <Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} type={f.key === "admin_email" ? "email" : "text"} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="font-bold gap-2">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create School</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Admin Credentials Modal */}
      <Dialog open={!!createdAdmin} onOpenChange={() => setCreatedAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> School Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/20 p-4">
              <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-3">Admin Login Credentials</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono font-semibold text-foreground">{createdAdmin?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temp Password:</span>
                  <span className="font-mono font-bold text-primary">{createdAdmin?.password}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Share these credentials securely with the school admin. They must change their password on first login.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedAdmin(null)} className="font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
