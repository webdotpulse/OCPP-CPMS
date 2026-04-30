// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Charger Status Types
export type ChargerStatus = "active" | "offline" | "disabled";
export type ConnectorStatus = "Available" | "Occupied" | "Reserved" | "Unavailable" | "Faulted";

// OCPP Message Types
export type OcppDirection = "in" | "out";

export interface OcppMessage {
  timestamp: Date;
  direction: OcppDirection;
  chargerId: number;
  transactionId?: number;
  message: string;
}

// WebSocket Client Types
export interface ChargerConnection {
  chargerId: number;
  ws: any; // WebSocket connection
  chargerName: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  transactions: Map<number, ActiveTransaction>;
}

export interface ActiveTransaction {
  transactionId: number;
  connectorName: string;
  idTag?: string;
  startTime: Date;
  initialMeterValue: number;
}

// API Request Types
export interface CreateChargerDto {
  model: string;
  name: string;
  manufacturer: string;
  serial_number: string;
  manufacturing_date: Date;
  power_capacity: number;
  power_consumption: number;
  firmware_version: string;
  warranty_period: string;
  service_contacts: string;
  latitude?: number;
  longitude?: number;
  charging_station_id: number;
  owner_id: number;
  tariffId?: number;
}

export interface UpdateChargerDto {
  model?: string;
  name?: string;
  manufacturer?: string;
  serial_number?: string;
  manufacturing_date?: Date;
  power_capacity?: number;
  power_consumption?: number;
  status?: ChargerStatus;
  firmware_version?: string;
  warranty_period?: string;
  service_contacts?: string;
  latitude?: number;
  longitude?: number;
  tariffId?: number;
}

export interface CreateStationDto {
  station_name: string;
  street_name: string;
  state: string;
  city: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  on_site_person_name: string;
  on_site_contact_details: string;
  emergency_contact: string;
  status?: string;
  owner_id: number;
}

export interface CreateConnectorDto {
  connector_name?: string;
  status: string;
  current_type: string;
  max_current?: number;
  max_power?: number;
  mac_address?: string;
  charger_id: number;
}

export interface CreateRfidUserDto {
  rfid_tag: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  address?: string;
  type?: string;
  active?: boolean;
  owner_id: number;
}

export interface UpdateRfidUserDto {
  rfid_tag?: string;
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  address?: string;
  type?: string;
  active?: boolean;
}

export interface RemoteStartRequest {
  chargerId: number;
  connectorId: number;
  idTag: string;
}

export interface RemoteStopRequest {
  chargerId: number;
  transactionId: number;
}

// Smart Charging Requests
export interface SetChargingProfileRequest {
  chargerId: number;
  connectorId: number;
  csChargingProfiles: {
    chargingProfileId: number;
    transactionId?: number;
    stackLevel: number;
    chargingProfilePurpose: "ChargePointMaxProfile" | "TxDefaultProfile" | "TxProfile";
    chargingProfileKind: "Absolute" | "Recurring" | "Relative";
    recurrencyKind?: "Daily" | "Weekly";
    validFrom?: string; // ISO 8601 Date
    validTo?: string; // ISO 8601 Date
    chargingSchedule: {
      duration?: number;
      startSchedule?: string; // ISO 8601 Date
      chargingRateUnit: "W" | "A";
      chargingSchedulePeriod: Array<{
        startPeriod: number;
        limit: number;
        numberPhases?: number;
      }>;
      minChargingRate?: number;
    };
  };
}

export interface ClearChargingProfileRequest {
  chargerId: number;
  id?: number;
  connectorId?: number;
  chargingProfilePurpose?: "ChargePointMaxProfile" | "TxDefaultProfile" | "TxProfile";
  stackLevel?: number;
}

// Tariff DTOs
export interface CreateTariffDto {
  tariff_name: string;
  charge: number;
  electricity_rate: number;
}

export interface UpdateTariffDto {
  tariff_name?: string;
  charge?: number;
  electricity_rate?: number;
}
