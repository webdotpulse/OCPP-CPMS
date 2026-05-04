"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Building, User as UserIcon, Briefcase, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { user } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users', { params: { search: searchQuery || undefined } });
      setUsers(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...(Array.isArray(users) ? users : [])].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aVal: any = a[key];
    let bVal: any = b[key];

    if (key === 'createdAt') {
      aVal = new Date(a.createdAt || 0).getTime();
      bVal = new Date(b.createdAt || 0).getTime();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers / Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage system access, companies, employees, and private users.
          </p>
        </div>
        {user?.role === "admin" && (
          <Link href="/users/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name / Email <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('userType')}>
                  <div className="flex items-center gap-1">Type <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('companyName')}>
                  <div className="flex items-center gap-1">Company <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">Role <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((u) => (
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
                  {user?.role === "admin" && (
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
                  )}
                </TableRow>
              ))}
              {!isLoading && sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {isLoading && sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    Loading users...
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
