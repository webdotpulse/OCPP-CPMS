import { createMollieClient, MollieClient } from '@mollie/api-client';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class MollieService {
  /**
   * Retrieves the initialized Mollie client for a specific company or the default config.
   */
  static async getClient(companyId?: number | null): Promise<MollieClient> {
    const config = await prisma.mollieConfig.findFirst({
      where: { companyId: companyId || null }
    });

    if (!config || !config.apiKey) {
      throw new Error("Mollie configuration is not set up.");
    }

    // In a real application, consider caching the client instance per company ID
    // instead of creating a new one on every request.
    return createMollieClient({ apiKey: config.apiKey });
  }

  /**
   * Checks if a Mollie configuration exists for a specific company or globally.
   */
  static async isConfigured(companyId?: number | null): Promise<boolean> {
     const count = await prisma.mollieConfig.count({
        where: { companyId: companyId || null }
     });
     return count > 0;
  }

  /**
   * Generates a refund for a payment.
   */
  static async generateRefund(paymentId: string, amountStr: string, companyId?: number | null): Promise<any> {
    const client = await this.getClient(companyId);

    try {
      const refund = await client.paymentRefunds.create({
        paymentId: paymentId,
        amount: {
          value: amountStr, // Must be exactly 2 decimal places, e.g. "5.00"
          currency: 'EUR'
        }
      });
      return refund;
    } catch (error: any) {
      logger.error(`Failed to generate refund for payment ${paymentId}: ${error.message}`);
      throw error;
    }
  }
}
