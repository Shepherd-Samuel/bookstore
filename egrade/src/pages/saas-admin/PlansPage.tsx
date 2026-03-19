import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_students: number | null;
  max_teachers: number | null;
  features: string[];
  is_active: boolean;
  created_at: string;
};

const emptyPlan = {
  name: "", slug: "", description: "",
  price_monthly: 0, price_yearly: 0,
  max_students: 200, max_teachers: 20,
  features: "", is_active: true,
};

export default function PlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPlan);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("price_monthly");
    if (data) setPlans(data as Plan[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyPlan);
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_students: plan.max_students ?? 200,
      max_teachers: plan.max_teachers ?? 20,
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast({ title: "Missing fields", description: "Name and slug are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      price_monthly: Number(form.price_monthly),
      price_yearly: Number(form.price_yearly),
      max_students: Number(form.max_students),
      max_teachers: Number(form.max_teachers),
      features: form.features.split("\n").map(f => f.trim()).filter(Boolean),
      is_active: form.is_active,
    };

    const { error } = editingPlan
      ? await supabase.from("plans").update(payload).eq("id", editingPlan.id)
      : await supabase.from("plans").insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingPlan ? "Plan Updated" : "Plan Created", description: `${form.name} has been ${editingPlan ? "updated" : "created"}.` });
      setShowModal(false);
      fetch();
    }
    setSaving(false);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete plan "${plan.name}"? Schools on this plan won't be affected.`)) return;
    setDeleting(plan.id);
    const { error } = await supabase.from("plans").delete().eq("id", plan.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plan Deleted", description: `${plan.name} removed.` });
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{plans.length} plans configured</p>
        </div>
        <Button onClick={openCreate} className="font-bold gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div key={plan.id} className={`stat-card relative ${!plan.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-subtle">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-foreground">{plan.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{plan.slug}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-2xl font-black text-foreground">KES {plan.price_monthly.toLocaleString()}<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground">KES {plan.price_yearly.toLocaleString()}/yr</p>
              </div>

              <div className="flex gap-3 text-xs font-semibold text-muted-foreground mb-3">
                <span>👨‍🎓 {plan.max_students ?? "∞"} students</span>
                <span>👩‍🏫 {plan.max_teachers ?? "∞"} teachers</span>
              </div>

              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="space-y-1.5 mb-4">
                  {(plan.features as string[]).slice(0, 4).map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-xs text-muted-foreground pl-5">+{plan.features.length - 4} more</li>
                  )}
                </ul>
              )}

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => openEdit(plan)} className="flex-1 gap-1.5 text-xs font-semibold">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(plan)} disabled={deleting === plan.id} className="gap-1.5 text-xs font-semibold">
                  {deleting === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Plan Name *</Label>
                <Input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })); }} placeholder="Standard" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="standard" className="mt-1 font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Best for junior secondary schools" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Monthly Price (KES)</Label>
                <Input type="number" value={form.price_monthly} onChange={e => setForm(p => ({ ...p, price_monthly: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Yearly Price (KES)</Label>
                <Input type="number" value={form.price_yearly} onChange={e => setForm(p => ({ ...p, price_yearly: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Max Students</Label>
                <Input type="number" value={form.max_students} onChange={e => setForm(p => ({ ...p, max_students: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Max Teachers</Label>
                <Input type="number" value={form.max_teachers} onChange={e => setForm(p => ({ ...p, max_teachers: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Features (one per line)</Label>
              <Textarea value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} placeholder={"CBC Assessments\nNEMIS Export\nM-Pesa Integration"} className="mt-1 min-h-[100px] font-mono text-sm" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-semibold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Schools can subscribe to this plan</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
