"use client";

import React, { useState } from "react";
import { Search, MapPin } from "lucide-react";

export default function MobileChargers() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Available", "Charging", "Faulted"];

  const chargers = [
    { id: "CHG-001", name: "Front Entrance #1", status: "Available", type: "CCS2 - 50kW", location: "Main HQ" },
    { id: "CHG-002", name: "Front Entrance #2", status: "Charging", type: "CCS2 - 50kW", location: "Main HQ" },
    { id: "CHG-003", name: "Back Lot #1", status: "Faulted", type: "Type 2 - 22kW", location: "Main HQ" },
    { id: "CHG-004", name: "Back Lot #2", status: "Available", type: "Type 2 - 22kW", location: "Main HQ" },
    { id: "CHG-005", name: "Visitor Parking", status: "Charging", type: "CHAdeMO - 50kW", location: "Main HQ" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-500";
      case "Charging": return "bg-blue-500";
      case "Faulted": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredChargers = chargers.filter(c => activeFilter === "All" || c.status === activeFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar - Fixed at top of tab */}
      <div className="px-4 pt-4 pb-2 bg-gray-50 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chargers..."
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
        {filteredChargers.map((charger) => (
          <div key={charger.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{charger.name}</h3>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{charger.id}</div>
              </div>
              <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(charger.status)}`}></span>
                <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wider">{charger.status}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{charger.location}</span>
              </div>
              <div className="font-medium bg-gray-50 px-2 py-1 rounded text-gray-700">
                {charger.type}
              </div>
            </div>
          </div>
        ))}

        {filteredChargers.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No chargers found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
