"use client";

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Zap } from 'lucide-react';

import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Open-Source OCPP CMS</h1>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
