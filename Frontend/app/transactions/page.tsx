"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      const payload = response.data;
      if (payload) {
        // Merge both basic transactions and RFID sessions, deduplicating by transactionId
        const basicTxns = Array.isArray(payload.transactions) ? payload.transactions.map((t: any) => ({ ...t, type: 'basic' })) : [];
        const rfidTxns = Array.isArray(payload.rfidSessions) ? payload.rfidSessions.map((s: any) => ({ ...s, type: 'rfid', idTag: s.rfidUser?.rfid_tag || s.idTag })) : [];
        
        // Deduplicate: if a Transaction and RfidSession share the same transactionId, keep only the Transaction (it has more data)
        const basicTxnIds = new Set(basicTxns.map((t: any) => t.transactionId));
        const uniqueRfidTxns = rfidTxns.filter((s: any) => !basicTxnIds.has(s.transactionId));
        
        const allTxns = [...basicTxns, ...uniqueRfidTxns];
        allTxns.sort((a, b) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime());
        setTransactions(allTxns);
      } else if (Array.isArray(payload)) {
        setTransactions(payload);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      logger.error("Failed to fetch transactions", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed') return <Badge variant="outline" className="text-green-500 bg-green-500/10">COMPLETED</Badge>;
    if (s === 'charging' || s === 'initiated') return <Badge variant="outline" className="text-blue-500 bg-blue-500/10 animate-pulse">CHARGING</Badge>;
    if (s === 'faulted') return <Badge variant="outline" className="text-red-500 bg-red-500/10">FAULTED</Badge>;
    return <Badge variant="outline" className="text-muted-foreground bg-muted">{status?.toUpperCase() || ''}</Badge>;
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Transactions</h1>
          <p className="text-muted-foreground">Historical charging sessions across all stations.</p>
        </div>
        <Link href="/transactions/active">
          <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10">
            View Active Sessions
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Txn ID</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Charger / Connector</TableHead>
              <TableHead>RFID Tag</TableHead>
              <TableHead className="text-right">Energy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading transactions...</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No transactions recorded.</TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                      #{txn.transactionId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {format(new Date(txn.startTime), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(txn.startTime), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {txn.charger?.name || `Charger ID: ${txn.charger_id}`} 
                    <span className="text-muted-foreground text-xs ml-1">({txn.connectorName})</span>
                  </TableCell>
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
    </AppShell>
  );
}
