import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { ROLE_OPTIONS, NGO_SERVICE_CATEGORIES } from "../data/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogIn, UserPlus, Loader2 } from "lucide-react";

const defaultRegister = {
  role: "citizen",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  ngoName: "",
  skills: "",
  registrationId: "",
  categories: [] as string[],
  ngoIds: [] as string[],
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, ngos, location } = useAppData();
  const [loginState, setLoginState] = useState({ email: "", password: "" });
  const [registerState, setRegisterState] = useState(defaultRegister);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleMeta = useMemo(
    () => ROLE_OPTIONS.find((r) => r.id === registerState.role) ?? ROLE_OPTIONS[0],
    [registerState.role],
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/emergency");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginState.email || !loginState.password) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      await login(loginState.email, loginState.password);
      navigate("/emergency");
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (registerState.password !== registerState.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!registerState.email || !registerState.password) {
      setError("Please fill in required fields.");
      return;
    }
    if (registerState.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register(registerState);
      setSuccess("Account created! You can now sign in.");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Res<span className="text-emergency">Q</span>Link
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Join the emergency network</p>
        </div>

        {error && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-4 border-success/50 bg-success/5">
            <CardContent className="p-3 text-sm text-success">{success}</CardContent>
          </Card>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="register">
              <UserPlus className="w-4 h-4 mr-2" /> Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={loginState.email}
                      onChange={(e) => setLoginState({ ...loginState, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginState.password}
                      onChange={(e) => setLoginState({ ...loginState, password: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emergency hover:bg-emergency/90 text-emergency-foreground" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label>I am a...</Label>
                    <Select value={registerState.role} onValueChange={(v) => setRegisterState({ ...registerState, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{roleMeta.description}</p>
                  </div>

                  {registerState.role === "ngo" ? (
                    <>
                      <div className="space-y-2">
                        <Label>NGO Name</Label>
                        <Input placeholder="Organisation name" value={registerState.ngoName} onChange={(e) => setRegisterState({ ...registerState, ngoName: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Registration ID (DARPAN / Govt.)</Label>
                        <Input placeholder="e.g. DL/2024/0012345" value={registerState.registrationId} onChange={(e) => setRegisterState({ ...registerState, registrationId: e.target.value })} />
                        <p className="text-[10px] text-muted-foreground">Official registration number for verification</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Service Categories</Label>
                        <div className="flex flex-wrap gap-2">
                          {NGO_SERVICE_CATEGORIES.map((cat) => (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => {
                                const has = registerState.categories.includes(cat.id);
                                setRegisterState({
                                  ...registerState,
                                  categories: has
                                    ? registerState.categories.filter((c) => c !== cat.id)
                                    : [...registerState.categories, cat.id],
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                registerState.categories.includes(cat.id)
                                  ? "border-emergency bg-emergency/10 text-emergency"
                                  : "border-border bg-card text-muted-foreground hover:border-emergency/30"
                              }`}
                            >
                              {cat.emoji} {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Your full name" value={registerState.fullName} onChange={(e) => setRegisterState({ ...registerState, fullName: e.target.value })} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="you@example.com" value={registerState.email} onChange={(e) => setRegisterState({ ...registerState, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+91..." value={registerState.phone} onChange={(e) => setRegisterState({ ...registerState, phone: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={registerState.password} onChange={(e) => setRegisterState({ ...registerState, password: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm</Label>
                      <Input type="password" value={registerState.confirmPassword} onChange={(e) => setRegisterState({ ...registerState, confirmPassword: e.target.value })} />
                    </div>
                  </div>

                  {registerState.role === "volunteer" && (
                    <>
                      <div className="space-y-2">
                        <Label>Skills (comma-separated)</Label>
                        <Input placeholder="medical, logistics, rescue" value={registerState.skills} onChange={(e) => setRegisterState({ ...registerState, skills: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Join Nearby NGOs (Select multiple)</Label>
                        <div className="flex flex-wrap gap-2">
                          {ngos.map((ngo) => (
                            <button
                              type="button"
                              key={ngo.id}
                              onClick={() => {
                                const has = registerState.ngoIds.includes(ngo.id);
                                setRegisterState({
                                  ...registerState,
                                  ngoIds: has
                                    ? registerState.ngoIds.filter((id) => id !== ngo.id)
                                    : [...registerState.ngoIds, ngo.id],
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                registerState.ngoIds.includes(ngo.id)
                                  ? "border-info bg-info/10 text-info"
                                  : "border-border bg-card text-muted-foreground hover:border-info/30"
                              }`}
                            >
                              🏢 {ngo.ngoName}
                            </button>
                          ))}
                          {ngos.length === 0 && <p className="text-[10px] text-muted-foreground italic">No nearby NGOs currently active.</p>}
                        </div>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full bg-emergency hover:bg-emergency/90 text-emergency-foreground" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
