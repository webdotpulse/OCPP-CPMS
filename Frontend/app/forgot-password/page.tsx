"use client";

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Zap } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">OCPP CMS</h1>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
