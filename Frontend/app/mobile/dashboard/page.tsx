"use client";

import React from "react";
import { Zap, BatteryCharging, AlertCircle, CheckCircle2 } from "lucide-react";

export default function MobileDashboard() {
  const kpis = [
    { label: "Active Sessions", value: "4", icon: BatteryCharging, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Available Chargers", value: "12", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
    { label: "Energy Today", value: "245 kWh", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50" },
    { label: "Alerts", value: "2", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  ];

  const liveSessions = [
    { id: "S-1042", charger: "Charger A1", progress: 45, power: "11 kW", duration: "1h 15m" },
    { id: "S-1043", charger: "Charger B2", progress: 82, power: "22 kW", duration: "0h 45m" },
    { id: "S-1044", charger: "Charger C1", progress: 12, power: "7.4 kW", duration: "2h 10m" },
    { id: "S-1045", charger: "Charger A3", progress: 95, power: "50 kW", duration: "0h 20m" },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* KPIs Grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-500 font-medium">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Sessions List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Live Sessions</h2>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{liveSessions.length} Active</span>
        </div>
        <div className="space-y-3">
          {liveSessions.map((session, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900">{session.charger}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Session {session.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{session.power}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{session.duration}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${session.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Charging</span>
                <span className="font-medium text-blue-600">{session.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
