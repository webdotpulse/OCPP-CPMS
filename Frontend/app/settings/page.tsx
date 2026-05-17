"use client";
import { logger } from "@/lib/logger";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Loader2, User, KeyRound, ShieldAlert, ShieldCheck, Settings, WalletCards, Mail, Globe, Activity } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  userType: z.enum(["private", "company", "employee"]),
  companyName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<string | null>(null);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [setupMethod, setSetupMethod] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [mailConfig, setMailConfig] = useState<{ fromAddress: string; isActive: boolean } | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      userType: "private",
      companyName: "",
      address: "",
      phone: "",
      taxNumber: "",
    }
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema)
  });

  useEffect(() => {
    if (user) {
      api.get(`/auth/me`)
        .then(res => {
          const fetchedUser = res.data || res.data;

          profileForm.reset({
            name: fetchedUser.name || user.name || "",
            email: fetchedUser.email || user.email,
            userType: fetchedUser.userType || user.userType || "private",
            companyName: fetchedUser.companyName || user.companyName || "",
            address: fetchedUser.address || user.address || "",
            phone: fetchedUser.phone || user.phone || "",
            taxNumber: fetchedUser.taxNumber || user.taxNumber || "",
          });

          if (fetchedUser?.createdAt) {
            setCreatedAt(fetchedUser.createdAt);
          }
          setTwoFactorEnabled(fetchedUser?.twoFactorEnabled || false);
          setTwoFactorMethod(fetchedUser?.twoFactorMethod || null);
        })
        .catch(err => {
          logger.error("Failed to fetch full user profile for settings", err);
          // Fallback to basic user data if fetch fails
          profileForm.reset({
            name: user.name || "",
            email: user.email,
            userType: user.userType || "private",
            companyName: user.companyName || "",
            address: user.address || "",
            phone: user.phone || "",
            taxNumber: user.taxNumber || "",
          });
        });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: ProfileValues) => {
    setIsSavingProfile(true);
    try {
      await api.put('/auth/me', data);
      toast.success("Profile updated successfully!");
    } catch (error) {
      logger.error("Failed to update profile", error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordValues) => {
    setIsSavingPassword(true);
    try {
      await api.put('/auth/password', data);
      toast.success("Password updated successfully!");
      passwordForm.reset();
    } catch (error) {
      logger.error("Failed to update password", error);
      toast.error("Failed to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const start2FASetup = async (method: string) => {
    setSetupMethod(method);
    setIs2FALoading(true);
    try {
      if (method === 'authenticator') {
        const res = await api.get('/auth/2fa/generate');
        setQrCodeUrl(res.data.qrCodeUrl || res.data?.qrCodeUrl);
        setSetupSecret(res.data.secret || res.data?.secret);
      } else if (method === 'email') {
        await api.post('/auth/2fa/send-email-code');
        toast.success('Setup code sent to your email.');
      }
      setIsSettingUp2FA(true);
    } catch (error) {
      logger.error('Failed to start 2FA setup', error);
      toast.error('Failed to start 2FA setup.');
      setSetupMethod(null);
    } finally {
      setIs2FALoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchMailConfig = async () => {
        try {
          const res = await api.get('/settings/mail');
          if (res.data !== undefined && res.data) {
            setMailConfig(res.data);
          }
        } catch (err) {
          console.error("Failed to fetch mail config:", err);
        }
      };
      fetchMailConfig();
    }
  }, [user]);

  const confirm2FASetup = async () => {
    setIs2FALoading(true);
    try {
      await api.post('/auth/2fa/enable', {
        method: setupMethod,
        secret: setupSecret,
        code: setupCode
      });
      setTwoFactorEnabled(true);
      setTwoFactorMethod(setupMethod);
      setIsSettingUp2FA(false);
      setSetupCode("");
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error: any) {
      logger.error('Failed to enable 2FA', error);
      toast.error(error.response?.data?.error || 'Failed to verify code.');
    } finally {
      setIs2FALoading(false);
    }
  };

  const disable2FA = async () => {
    setIs2FALoading(true);
    try {
      await api.post('/auth/2fa/disable');
      setTwoFactorEnabled(false);
      setTwoFactorMethod(null);
      setIsSettingUp2FA(false);
      toast.success('Two-factor authentication disabled.');
    } catch (error) {
      logger.error('Failed to disable 2FA', error);
      toast.error('Failed to disable 2FA.');
    } finally {
      setIs2FALoading(false);
    }
  };

  if (authLoading) return <AppShell><div className="p-8">Loading profile...</div></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings & Profile</h1>
        <p className="text-muted-foreground">Manage your account preferences and security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Public Profile
            </CardTitle>
            <CardDescription>
              Update your basic information.
            </CardDescription>
          </CardHeader>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...profileForm.register('name')} />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="userType">User Type</Label>
                <Select
                  value={profileForm.watch('userType')}
                  onValueChange={(val: any) => profileForm.setValue('userType', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
                {profileForm.formState.errors.userType && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.userType.message}</p>
                )}
              </div>

              {profileForm.watch('userType') !== 'private' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" {...profileForm.register('companyName')} />
                  {profileForm.formState.errors.companyName && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.companyName.message}</p>
                  )}
                </div>
              )}
              {profileForm.watch('userType') !== 'private' && (
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Tax Number</Label>
                  <Input id="taxNumber" {...profileForm.register('taxNumber')} />
                  {profileForm.formState.errors.taxNumber && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.taxNumber.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" {...profileForm.register('phone')} />
                {profileForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...profileForm.register('address')} />
                {profileForm.formState.errors.address && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.address.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>System Role</Label>
                  <Input value={user?.role === 'admin' ? 'Administrator' : 'Standard User'} readOnly className="bg-muted text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input value={createdAt ? new Date(createdAt).toLocaleDateString() : 'Loading...'} readOnly className="bg-muted text-muted-foreground" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-8">
          {/* Security Settings */}
          <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Security
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white" disabled={isSavingPassword}>
                {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 2FA Settings */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              {twoFactorEnabled ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {!twoFactorEnabled && !isSettingUp2FA && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Choose a method to set up 2FA:</p>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => start2FASetup('authenticator')} disabled={is2FALoading}>
                    {is2FALoading && setupMethod === 'authenticator' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Authenticator App
                  </Button>
                  <Button variant="outline" onClick={() => start2FASetup('email')} disabled={is2FALoading}>
                    {is2FALoading && setupMethod === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Email Codes
                  </Button>
                </div>
              </div>
            )}

            {isSettingUp2FA && (
              <div className="space-y-4">
                {setupMethod === 'authenticator' && qrCodeUrl && (
                  <div className="flex flex-col items-center gap-2 p-4 border rounded-md bg-white">
                    <p className="text-sm text-gray-800 font-medium">Scan this QR code with your Authenticator app</p>
                    <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} />
                  </div>
                )}
                {setupMethod === 'email' && (
                  <Alert>
                    <AlertDescription>We have sent a verification code to your email.</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="setupCode">Verification Code</Label>
                  <Input
                    id="setupCode"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirm2FASetup} disabled={is2FALoading || setupCode.length < 6}>
                    {is2FALoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Enable
                  </Button>
                  <Button variant="ghost" onClick={() => { setIsSettingUp2FA(false); setSetupMethod(null); }} disabled={is2FALoading}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {twoFactorEnabled && (
              <div className="space-y-4">
                <Alert className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                  <AlertDescription>
                    2FA is currently enabled via <strong>{twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'Email'}</strong>.
                  </AlertDescription>
                </Alert>
                <Button variant="destructive" onClick={disable2FA} disabled={is2FALoading}>
                  {is2FALoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Admin Settings */}
        {user?.role === 'admin' && (
          <Card className="shadow-sm md:col-span-2">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> System Configuration
              </CardTitle>
              <CardDescription>
                Manage global settings and integrations for the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <WalletCards className="h-4 w-4" /> Dynamic Tariffs
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure API keys for EPEX Spot day-ahead pricing integrations (e.g., ENTSO-E).
                  </p>
                  <Link href="/settings/tariffs">
                    <Button variant="outline" size="sm" className="w-full">
                      Configure Tariffs Integration
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Mail Server
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Configure SMTP settings for outgoing system emails.
                  </p>
                  {mailConfig ? (
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${mailConfig.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {mailConfig.isActive ? 'Active' : 'Inactive'} • {mailConfig.fromAddress}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mb-3">
                      Not configured
                    </div>
                  )}
                  <Link href="/settings/mail">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Mail Settings
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Roaming
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage OCPI and OICP roaming integrations and network settings.
                  </p>
                  <Link href="/roaming">
                    <Button variant="outline" size="sm" className="w-full">
                      Configure Roaming
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Config Profiles
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage standard OCPP configuration profiles applied to charging stations.
                  </p>
                  <Link href="/config-profiles">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Config Profiles
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Quirk Profiles
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage custom quirk profiles to handle specific charger model behaviors.
                  </p>
                  <Link href="/quirk-profiles">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Quirk Profiles
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" /> EMS Gateways
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure and monitor Energy Management System gateways.
                  </p>
                  <Link href="/ems-gateways">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage EMS Gateways
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );

}

