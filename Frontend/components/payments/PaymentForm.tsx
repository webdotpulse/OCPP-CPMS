"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is required, redirecting back to current page for demo
        return_url: window.location.origin + "/payments?success=true",
      },
      redirect: "if_required", // Prevent redirect if possible
    });

    if (error) {
      toast.error(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast.success("Payment succeeded!");
    } else {
      toast.success("Payment processing...");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={isProcessing || !stripe || !elements} className="w-full">
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Pay Now
      </Button>
    </form>
  );
}
