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
import { useState, useEffect } from "react";
import { Loader2, User, KeyRound } from "lucide-react";
import { api } from "@/lib/api";

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
      profileForm.reset({
        name: user.name || "",
        email: user.email,
        userType: user.userType || "private",
        companyName: user.companyName || "",
        address: user.address || "",
        phone: user.phone || "",
        taxNumber: user.taxNumber || "",
      });

      api.get(`/users/${user.id}`)
        .then(res => {
          const fetchedUser = res.data?.data || res.data;
          if (fetchedUser?.createdAt) {
            setCreatedAt(fetchedUser.createdAt);
          }
        })
        .catch(err => {
          logger.error("Failed to fetch full user profile for settings", err);
        });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: ProfileValues) => {
    setIsSavingProfile(true);
    try {
      // Assuming a PUT /auth/me or similar exists. We'll simulate if needed.
      await api.put('/auth/me', data);
      alert("Profile updated successfully!");
    } catch (error) {
      logger.error("Failed to update profile", error);
      alert("Failed to update profile. API might be missing.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordValues) => {
    setIsSavingPassword(true);
    try {
      await api.put('/auth/password', data);
      alert("Password updated successfully!");
      passwordForm.reset();
    } catch (error) {
      logger.error("Failed to update password", error);
      alert("Failed to update password. API might be missing.");
    } finally {
      setIsSavingPassword(false);
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
      </div>
    </AppShell>
  );
}

