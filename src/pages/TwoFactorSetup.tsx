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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Security</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Enable Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add an extra layer of protection with a 6-digit code from your
            authenticator app.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authenticator app setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!factorId ? (
              <Button
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? "Starting..." : "Generate QR code"}
              </Button>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start">
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                    {qrCode ? (
                      <img src={qrCode} alt="2FA QR code" className="w-full" />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        QR code unavailable.
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Scan the QR code with your authenticator app or enter the
                      secret key manually.
                    </p>
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-foreground">
                      {secret ?? "Secret unavailable"}
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                    />
                  </div>

                  {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  ) : null}

                  {isComplete ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        2FA is now enabled for your account.
                      </p>
                      <Button variant="outline" onClick={() => navigate("/dashboard")}>
                        Back to dashboard
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="bg-foreground text-background hover:bg-foreground/90"
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
