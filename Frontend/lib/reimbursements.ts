import { api } from './api';

export interface ReimbursementContract {
  id?: number;
  userId: number;
  rfidUserId: number;
  stationId: number;
  tariffId: number;
  iban: string;
  user?: any;
  rfidUser?: any;
  station?: any;
  tariff?: any;
}

export interface ReimbursementLedger {
  id: number;
  contractId: number;
  month: number;
  year: number;
  totalKwh: number;
  totalAmount: number;
  status: string;
  contract?: any;
}

export const getContracts = async (): Promise<ReimbursementContract[]> => {
  const response = await api.get('/reimbursements/contracts');
  return response.data || [];
};

export const createOrUpdateContract = async (data: Partial<ReimbursementContract>): Promise<ReimbursementContract> => {
  const response = await api.post('/reimbursements/contracts', data);
  return response.data;
};

export const getLedgers = async (): Promise<ReimbursementLedger[]> => {
  const response = await api.get('/reimbursements/ledgers');
  return response.data || [];
};

export const exportSepa = async (): Promise<void> => {
  const response = await api.get('/reimbursements/export/sepa', {
    responseType: 'blob', // Important for file download
  });

  // Create a blob link to download
  const url = window.URL.createObjectURL(new Blob([response.data as any]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'sepa-export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};
