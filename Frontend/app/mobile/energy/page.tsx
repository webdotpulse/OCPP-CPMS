"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { EmsDashboard } from "@/components/dashboard/ems/EmsDashboard";

export default function MobileEnergyDashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t("nav.energyDashboard", "Energy Dashboard")}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t("dashboard.energyOverviewDesc", "Monitor and manage your building's energy flow and optimization.")}
        </p>
      </div>
      <EmsDashboard />
    </div>
  );
}
