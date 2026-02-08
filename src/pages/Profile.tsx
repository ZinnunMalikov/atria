import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setDisplayName(localStorage.getItem("atria:displayName") ?? "");
    setRole(localStorage.getItem("atria:role") ?? "ER Specialist");
    setEmail(localStorage.getItem("atria:email") ?? "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("atria:displayName", displayName.trim());
    localStorage.setItem("atria:role", role.trim());
    navigate("/dashboard");
  };

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hospital-landing" />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <Card className="border-white/10 bg-slate-900/80">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                placeholder="Morgan Lee"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="ER Specialist"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="border-white/15 bg-slate-950/60 text-white placeholder:text-white/30 focus-visible:ring-emerald-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="border-white/10 bg-slate-950/40 text-white/60"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-emerald-300 text-slate-900 hover:bg-emerald-200"
                onClick={handleSave}
              >
                Save profile
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:border-white/60 hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Profile;
