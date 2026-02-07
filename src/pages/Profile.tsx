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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 turing-bg" />
        <div className="absolute inset-0 turing-grid opacity-35" />
        <div className="absolute inset-0 turing-lines turing-fade opacity-50" />
      </div>
      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <Card>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="ER Specialist"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-foreground text-background hover:bg-foreground/90" onClick={handleSave}>
                Save profile
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
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
