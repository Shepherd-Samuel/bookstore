import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img src={logoImg} alt="eGrade" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">eGrade M|S</h1>
            <p className="text-muted-foreground text-xs">Password Recovery</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="font-bold text-foreground text-sm">Check your email</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/auth")}>
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-black text-foreground">Forgot your password?</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="admin@school.ac.ke"
                    required
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate("/auth")}>
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
