"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Zap, Trash2, Edit, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ChargeGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await api.get('/charge-groups', { params: { search: searchQuery || undefined } });
      setGroups(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch charge groups", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchGroups]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this charge group?")) return;
    try {
      await api.delete(`/charge-groups/${id}`);
      toast.success("Charge group deleted");
      fetchGroups();
    } catch {
      toast.error("Failed to delete charge group");
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedGroups = [...groups].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aVal: any = a[key];
    let bVal: any = b[key];

    if (key === 'chargers') {
      aVal = a.chargers?.length || 0;
      bVal = b.chargers?.length || 0;
    } else if (key === 'users') {
      aVal = a.users?.length || 0;
      bVal = b.users?.length || 0;
    } else if (key === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charge Groups</h1>
          <p className="text-muted-foreground mt-2">
            Manage groups of chargers, users, and specific tariffs.
          </p>
        </div>
        {user?.role === "admin" && (
          <Link href="/charge-groups/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search groups by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Charge Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1">Description <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('chargers')}>
                  <div className="flex items-center gap-1">Chargers <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('users')}>
                  <div className="flex items-center gap-1">Users <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground">{group.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                      <Zap className="h-3 w-3" /> {group.chargers?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex w-fit items-center gap-1">
                      <Users className="h-3 w-3" /> {group.users?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(group.createdAt), 'MMM d, yyyy')}</TableCell>
                  {user?.role === "admin" && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/charge-groups/${group.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(group.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!isLoading && groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No charge groups found.
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
