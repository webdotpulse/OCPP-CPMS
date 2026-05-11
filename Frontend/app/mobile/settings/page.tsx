"use client";

import React, { useEffect, useState } from "react";
import { User, Bell, LogOut, ChevronRight, Shield, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function MobileSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setProfileData(response.data);
      } catch (error) {
        logger.error('Failed to fetch user profile', error);
      }
    };
    if (user) {
        fetchProfile();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const settingsGroups = [
    {
      title: "Preferences",
      items: [
        { label: "Account Settings", icon: User, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Notifications", icon: Bell, color: "text-purple-500", bg: "bg-purple-50" },
        { label: "Privacy & Security", icon: Shield, color: "text-green-500", bg: "bg-green-50" },
      ]
    },
    {
      title: "Support",
      items: [
        { label: "Help Center", icon: HelpCircle, color: "text-orange-500", bg: "bg-orange-50" },
      ]
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Profile Header */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {profileData?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
              <h2 className="font-bold text-gray-900 text-lg">{profileData?.name || 'User'}</h2>
              <p className="text-sm text-gray-500">{profileData?.email || user?.email}</p>
              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                  {profileData?.role || user?.role || 'User'}
              </div>
          </div>
      </section>

      {settingsGroups.map((group, groupIdx) => (
        <section key={groupIdx}>
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider pl-1">{group.title}</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {group.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <div key={itemIdx}>
                  <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.bg}`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  {itemIdx < group.items.length - 1 && (
                    <div className="h-px bg-gray-100 ml-14"></div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="pt-4">
        <button
            onClick={handleLogout}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-center space-x-2 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </section>

      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-gray-400">OCPP-CPMS App v1.0.0</p>
      </div>
    </div>
  );
}
