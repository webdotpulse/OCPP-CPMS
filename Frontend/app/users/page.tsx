"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Building, User as UserIcon, Briefcase } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete user");
    }
  };

  const getUserTypeIcon = (type: string) => {
    if (type === 'company') return <Building className="h-4 w-4 text-blue-500" />;
    if (type === 'employee') return <Briefcase className="h-4 w-4 text-green-500" />;
    return <UserIcon className="h-4 w-4 text-orange-500" />;
  };

  if (user?.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Admin access required to view users.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers / Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage system access, companies, employees, and private users.
          </p>
        </div>
        <Link href="/users/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(users) && users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name && <div className="font-semibold">{u.name}</div>}
                    <div className={u.name ? "text-xs text-muted-foreground" : ""}>{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getUserTypeIcon(u.userType)}
                      <span className="capitalize">{u.userType || 'Private'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.companyName || '—'}</TableCell>
                  <TableCell>{u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'admin' ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/users/${u.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
