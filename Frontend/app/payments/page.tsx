"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Initialize Stripe. Uses placeholder if env variable is missing for safe compilation, but will fail gracefully in UI.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

export default function PaymentsPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("10.00");
  const [transactionId, setTransactionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Generate a test transaction ID on load
    setTransactionId(uuidv4());
  }, []);

  const initiatePayment = async () => {
    try {
      setLoading(true);
      const res = await api.post("/payments/intent", {
        amount: parseFloat(amount),
        currency: "EUR",
        transactionId: transactionId,
      });

      if (res.data?.success && res.data?.data?.clientSecret) {
         setClientSecret(res.data.data.clientSecret);
      } else {
         toast.error(res.data?.message || "Failed to initialize payment");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
          <CardDescription>
            Test the Stripe integration by generating a Payment Intent and completing the checkout flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!clientSecret ? (
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
                 {loading ? "Generating..." : "Generate Payment Intent"}
               </Button>
             </div>
          ) : (
            <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md text-sm mb-4">
                  Testing with Transaction ID: <span className="font-mono">{transactionId}</span>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm />
                </Elements>
                <Button variant="outline" className="w-full mt-4" onClick={() => {
                   setClientSecret(null);
                   setTransactionId(uuidv4());
                }}>
                   Cancel & Start Over
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
