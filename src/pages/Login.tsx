import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!hasSupabaseEnv) {
      setErrorMessage("Missing Supabase config. Check your .env file.");
      return;
    }
    if (!organization) {
      setErrorMessage("Please select a hospital or medical group.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    localStorage.setItem("atria:org", organization);
    localStorage.setItem("atria:email", email);
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setErrorMessage("Unable to check 2FA status. Please try again.");
      return;
    }
    const totpFactor = factors?.totp?.[0];
    if (totpFactor) {
      setNeedsMfa(true);
      setMfaFactorId(totpFactor.id);
      return;
    }
    navigate("/dashboard");
  };

  const handleVerifyMfa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!hasSupabaseEnv) {
      setErrorMessage("Missing Supabase config. Check your .env file.");
      return;
    }
    if (!mfaFactorId) {
      setErrorMessage("No MFA factor found for this account.");
      return;
    }
    if (!mfaCode.trim()) {
      setErrorMessage("Enter the 2FA code from your authenticator app.");
      return;
    }
    setIsVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });
    setIsVerifying(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/60" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mb-8">
            <img src="/atria-logo.png" alt="Atria logo" className="mb-4 h-12 w-12" />
            <p className="text-sm font-medium text-white/60">Client Access</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Sign in to your Atria workspace
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Enter your credentials to view live operational dashboards and
              analytics.
            </p>
          </div>

          <form onSubmit={needsMfa ? handleVerifyMfa : handleSubmit} className="space-y-6">
            {needsMfa ? (
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Two-factor code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123 456"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                  className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
                />
                <p className="text-xs text-white/50">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@hospital.org"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Hospital or Medical Group</Label>
                  <Select value={organization} onValueChange={setOrganization}>
                    <SelectTrigger
                      id="organization"
                      className="border-white/15 bg-slate-950/60 text-white focus:ring-emerald-300/60"
                    >
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="northside">Northside Hospital</SelectItem>
                      <SelectItem value="mount-sinai">Mount Sinai</SelectItem>
                      <SelectItem value="johns-hopkins">Johns Hopkins</SelectItem>
                      <SelectItem value="cleveland-clinic">Cleveland Clinic</SelectItem>
                      <SelectItem value="mass-general">Mass General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <Button
              className="w-full bg-emerald-300 text-slate-900 hover:bg-emerald-200"
              disabled={needsMfa ? isVerifying : isSubmitting}
            >
              {needsMfa
                ? isVerifying
                  ? "Verifying..."
                  : "Verify code"
                : isSubmitting
                ? "Signing in..."
                : "Sign in"}
            </Button>
            <p className="text-xs text-white/40 text-center">
              Powered by Supabase Authentication
            </p>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Login;
