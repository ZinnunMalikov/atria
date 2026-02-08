import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

const TwoFactorSetup = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleEnroll = async () => {
    setErrorMessage(null);
    setIsEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
      issuer: "Atria",
    });
    setIsEnrolling(false);
    if (error || !data) {
      setErrorMessage(error?.message ?? "Unable to start 2FA setup.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!factorId) {
      setErrorMessage("Start setup before verifying.");
      return;
    }
    if (!code.trim()) {
      setErrorMessage("Enter the code from your authenticator app.");
      return;
    }
    setIsVerifying(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setIsVerifying(false);
      setErrorMessage(challengeError?.message ?? "Unable to create challenge.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setIsVerifying(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setIsComplete(true);
  };

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-white/60">Security</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Enable Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Add an extra layer of protection with a 6-digit code from your
            authenticator app.
          </p>
        </div>

        <Card className="border-white/10 bg-slate-900/80">
          <CardHeader>
            <CardTitle>Authenticator app setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!factorId ? (
              <Button
                className="bg-emerald-300 text-slate-900 hover:bg-emerald-200"
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? "Starting..." : "Generate QR code"}
              </Button>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    {qrCode ? (
                      <img src={qrCode} alt="2FA QR code" className="w-full" />
                    ) : (
                      <p className="text-sm text-white/60">
                        QR code unavailable.
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-white/60">
                      Scan the QR code with your authenticator app or enter the
                      secret key manually.
                    </p>
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white">
                      {secret ?? "Secret unavailable"}
                    </div>
                    <p className="text-xs text-white/50">
                      Keep this secret safe. You can use it to recover access if
                      you lose your device.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totp-code">Verification code</Label>
                    <Input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="123 456"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      required
                      className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
                    />
                  </div>

                  {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  ) : null}

                  {isComplete ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-medium text-white">
                        2FA is now enabled for your account.
                      </p>
                      <Button
                        variant="outline"
                        className="border-white/30 text-white hover:border-white/60 hover:bg-white/10"
                        onClick={() => navigate("/dashboard")}
                      >
                        Back to dashboard
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="bg-emerald-300 text-slate-900 hover:bg-emerald-200"
                      disabled={isVerifying}
                    >
                      {isVerifying ? "Verifying..." : "Verify and enable 2FA"}
                    </Button>
                  )}
                </form>
              </>
            )}

            {!isComplete && !errorMessage ? null : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default TwoFactorSetup;
