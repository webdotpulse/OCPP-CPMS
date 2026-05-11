"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function MobileChargers() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [chargers, setChargers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchChargers = useCallback(async () => {
    try {
      const response = await api.get('/chargers', { params: { search: searchQuery || undefined } });
      setChargers(response.data?.data || response.data);
    } catch (error) {
      logger.error("Failed to fetch chargers", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChargers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchChargers]);

  const filters = ["All", "Available", "Charging", "Faulted"];

  const getDisplayStatus = (charger: any) => {
    const s = charger.status?.toLowerCase() || '';
    if (charger.active_sessions > 0) return "Charging";
    if (s === 'online' || s === 'active') return "Available";
    if (s === 'faulted') return "Faulted";
    return "Offline";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-500";
      case "Charging": return "bg-blue-500";
      case "Faulted": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredChargers = chargers.filter(c => {
      const status = getDisplayStatus(c);
      return activeFilter === "All" || status === activeFilter;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar - Fixed at top of tab */}
      <div className="px-4 pt-4 pb-2 bg-gray-50 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chargers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* Filter Chips - Scrollable */}
      <div className="px-4 py-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-2 bg-gray-50">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFilter === filter
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Charger List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
            <div className="text-center py-10 text-gray-500 text-sm">Loading chargers...</div>
        ) : filteredChargers.map((charger) => {
            const displayStatus = getDisplayStatus(charger);
            return (
          <div key={charger.charger_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{charger.name}</h3>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{charger.charger_id}</div>
              </div>
              <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(displayStatus)}`}></span>
                <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wider">{displayStatus}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{charger.chargingStation?.station_name || 'Unassigned'}</span>
              </div>
              <div className="font-medium bg-gray-50 px-2 py-1 rounded text-gray-700">
                {charger.manufacturer} / {charger.model}
              </div>
            </div>
          </div>
        )})}

        {!isLoading && filteredChargers.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No chargers found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
