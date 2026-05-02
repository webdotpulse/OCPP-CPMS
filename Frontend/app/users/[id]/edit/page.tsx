"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    userType: "private",
    companyName: "",
    address: "",
    phone: "",
    taxNumber: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${id}`);
        // The API interceptor already unwraps `{ success, data }` into `response.data`.
        // We still fall back to `response.data?.data` just in case.
        const u = response.data?.data || response.data;
        if (u) {
          setFormData({
            name: u.name || "",
            email: u.email || "",
            role: u.role || "user",
            userType: u.userType || "private",
            companyName: u.companyName || "",
            address: u.address || "",
            phone: u.phone || "",
            taxNumber: u.taxNumber || "",
          });
        }
      } catch (error) {
        logger.error("Failed to fetch user", error);
        toast.error("Failed to load user details");
        router.push("/users");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchUser();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await api.put(`/users/${id}`, formData);
      toast.success("User updated successfully");
      router.push("/users");
      router.refresh();
    } catch (error: any) {
      logger.error("Failed to update user", error);
      toast.error(error.response?.data?.error || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 space-y-4">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">Update customer details and permissions.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="max-w-2xl shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b pb-4">
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) => handleSelectChange('role', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType">Account Type</Label>
                  <Select
                    value={formData.userType}
                    onValueChange={(val) => handleSelectChange('userType', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {(formData.userType === 'company' || formData.userType === 'employee') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                  {formData.userType === 'company' && (
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax Number / VAT</Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/users")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </AppShell>
  );
}
