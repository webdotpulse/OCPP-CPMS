"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function PaymentsContent() {
  const [amount, setAmount] = useState<string>("10.00");
  const [transactionId, setTransactionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (isSuccess) {
       toast.success("Payment completed successfully!");
    }
    // Generate a test transaction ID on load
    setTransactionId(uuidv4());
  }, [isSuccess]);

  const initiatePayment = async () => {
    try {
      setLoading(true);
      const res = await api.post("/payments/intent", {
        amount: parseFloat(amount),
        currency: "EUR",
        transactionId: transactionId,
      });

      if (res.data?.success && res.data?.data?.checkoutUrl) {
         // Redirect to Mollie checkout page
         window.location.href = res.data.data.checkoutUrl;
      } else {
         toast.error(res.data?.message || "Failed to initialize payment");
         setLoading(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to initialize payment");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>
          Test the Mollie integration by generating a Payment Intent and redirecting to checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction ID (Test)</Label>
              <Input
                type="text"
                value={transactionId}
                readOnly
                className="bg-muted"
              />
            </div>
            <Button onClick={initiatePayment} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...
                </>
              ) : "Checkout with Mollie"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsPage() {
  return (
    <div className="container py-10 max-w-lg mx-auto">
      <Suspense fallback={<div>Loading...</div>}>
         <PaymentsContent />
      </Suspense>
    </div>
  );
}
