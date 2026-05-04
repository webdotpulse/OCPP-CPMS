"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, ReceiptText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ChargerTransactionsTableProps {
  chargerId: number;
}

export function ChargerTransactionsTable({ chargerId }: ChargerTransactionsTableProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/transactions/charger/${chargerId}`);
      const payload = response.data;

      let allTxns: any[] = [];
      if (payload && payload.data) {
        // Handle payload like { data: { transactions, rfidSessions } }
        const basicTxns = Array.isArray(payload.data.transactions) ? payload.data.transactions.map((t: any) => ({ ...t, type: 'basic' })) : [];
        const rfidTxns = Array.isArray(payload.data.rfidSessions) ? payload.data.rfidSessions.map((s: any) => ({ ...s, type: 'rfid', idTag: s.rfidUser?.rfid_tag || s.idTag })) : [];

        // Deduplicate
        const basicTxnIds = new Set(basicTxns.map((t: any) => t.transactionId));
        const uniqueRfidTxns = rfidTxns.filter((s: any) => !basicTxnIds.has(s.transactionId));

        allTxns = [...basicTxns, ...uniqueRfidTxns];
      } else if (payload && (payload.transactions || payload.rfidSessions)) {
        // Fallback structure
        const basicTxns = Array.isArray(payload.transactions) ? payload.transactions.map((t: any) => ({ ...t, type: 'basic' })) : [];
        const rfidTxns = Array.isArray(payload.rfidSessions) ? payload.rfidSessions.map((s: any) => ({ ...s, type: 'rfid', idTag: s.rfidUser?.rfid_tag || s.idTag })) : [];

        const basicTxnIds = new Set(basicTxns.map((t: any) => t.transactionId));
        const uniqueRfidTxns = rfidTxns.filter((s: any) => !basicTxnIds.has(s.transactionId));

        allTxns = [...basicTxns, ...uniqueRfidTxns];
      }

      allTxns.sort((a, b) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime());
      setTransactions(allTxns);
    } catch (error) {
      logger.error("Failed to fetch charger transactions", error);
    } finally {
      setIsLoading(false);
    }
  }, [chargerId]);

  useEffect(() => {
    if (chargerId) {
      fetchTransactions();
    }
  }, [chargerId, fetchTransactions]);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed') return <Badge variant="outline" className="text-green-500 bg-green-500/10">COMPLETED</Badge>;
    if (s === 'charging' || s === 'initiated') return <Badge variant="outline" className="text-blue-500 bg-blue-500/10 animate-pulse">CHARGING</Badge>;
    if (s === 'faulted') return <Badge variant="outline" className="text-red-500 bg-red-500/10">FAULTED</Badge>;
    return <Badge variant="outline" className="text-muted-foreground bg-muted">{status?.toUpperCase() || ''}</Badge>;
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredTransactions = transactions.filter(txn => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(txn.transactionId || "").toLowerCase().includes(q) ||
      txn.status?.toLowerCase().includes(q) ||
      txn.idTag?.toLowerCase().includes(q) ||
      txn.connectorName?.toLowerCase().includes(q)
    );
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aVal: any = a[key];
    let bVal: any = b[key];

    if (key === 'startTime') {
      aVal = new Date(a.startTime || a.createdAt).getTime();
      bVal = new Date(b.startTime || b.createdAt).getTime();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search by ID, Status, Connector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={fetchTransactions} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('transactionId')}>
                <div className="flex items-center gap-1">Txn ID <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('startTime')}>
                <div className="flex items-center gap-1">Start Time <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('connectorName')}>
                <div className="flex items-center gap-1">Connector <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('idTag')}>
                <div className="flex items-center gap-1">RFID Tag <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('energyConsumed')}>
                <div className="flex items-center justify-end gap-1">Energy <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading transactions...</TableCell>
              </TableRow>
            ) : sortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? "No transactions match your search." : "No transactions recorded for this charger."}
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                      #{txn.transactionId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {format(new Date(txn.startTime || txn.createdAt), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(txn.startTime || txn.createdAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>{txn.connectorName}</TableCell>
                  <TableCell className="font-mono text-xs">{txn.idTag || 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono text-primary">
                    {(txn.energyConsumed / 1000).toFixed(2)} kWh
                  </TableCell>
                  <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/transactions/${txn.id}`}>
                       <Button variant="ghost" size="sm">
                         <Eye className="mr-2 h-4 w-4" /> View
                       </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
