import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { AuthRequest } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";

export const getContracts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, userRole } = req;

    let whereClause = {};
    if (userRole !== 'admin') {
       whereClause = { userId: userId };
    }

    const contracts = await prisma.reimbursementContract.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        rfidUser: { select: { rfid_user_id: true, rfid_tag: true, name: true } },
        station: { select: { id: true, station_name: true } },
        tariff: { select: { tariff_id: true, tariff_name: true, electricity_rate: true, tariffType: true } },
      }
    });

    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error("Error fetching reimbursement contracts:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const createOrUpdateContract = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, userRole } = req;
    const { rfidUserId, stationId, tariffId, iban } = req.body;

    let targetUserId = userId;
    // Allow admin to specify userId in body, otherwise default to self
    if (userRole === 'admin' && req.body.userId) {
       targetUserId = req.body.userId;
    }

    if (!targetUserId || !rfidUserId || !stationId || !tariffId || !iban) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const contract = await prisma.reimbursementContract.upsert({
      where: {
        userId_rfidUserId_stationId: {
          userId: targetUserId as number,
          rfidUserId: Number(rfidUserId),
          stationId: Number(stationId),
        }
      },
      update: {
        tariffId: Number(tariffId),
        iban,
      },
      create: {
        userId: targetUserId as number,
        rfidUserId: Number(rfidUserId),
        stationId: Number(stationId),
        tariffId: Number(tariffId),
        iban,
      }
    });

    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error("Error saving reimbursement contract:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getLedgers = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, userRole } = req;

    let whereClause = {};
    if (userRole !== 'admin') {
       whereClause = { contract: { userId: userId } };
    }

    const ledgers = await prisma.reimbursementLedger.findMany({
      where: whereClause,
      include: {
        contract: {
          include: {
            user: { select: { name: true, email: true } },
            rfidUser: { select: { rfid_tag: true } },
            station: { select: { station_name: true } },
            tariff: { select: { tariff_name: true } },
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ]
    });

    res.json({ success: true, data: ledgers });
  } catch (error) {
    logger.error("Error fetching reimbursement ledgers:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const exportSepa = async (req: AuthRequest, res: Response) => {
  try {
    const { userRole } = req;

    if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const pendingLedgers = await prisma.reimbursementLedger.findMany({
      where: { status: 'pending' },
      include: {
        contract: {
          include: {
            user: { select: { name: true } },
          }
        }
      }
    });

    if (pendingLedgers.length === 0) {
      return res.status(404).json({ success: false, error: "No pending reimbursements found" });
    }

    // Generate actual SEPA pain.001.001.03 XML
    const messageId = `MSG-${Date.now()}`;
    const creationDtTm = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    let totalSepsAmount = 0;
    let transactionsXml = '';

    pendingLedgers.forEach((ledger, index) => {
      totalSepsAmount += ledger.totalAmount;
      const txId = `TX-${ledger.id}-${Date.now()}`;
      const e2eId = `E2E-${ledger.id}-${Date.now()}`;
      const desc = `Reimbursement for ${ledger.month}/${ledger.year}`;

      transactionsXml += `
        <CdtTrfTxInf>
          <PmtId>
            <InstrId>${txId}</InstrId>
            <EndToEndId>${e2eId}</EndToEndId>
          </PmtId>
          <Amt>
            <InstdAmt Ccy="EUR">${ledger.totalAmount.toFixed(2)}</InstdAmt>
          </Amt>
          <Cdtr>
            <Nm>${(ledger.contract.user.name || 'Unknown User').substring(0, 70)}</Nm>
          </Cdtr>
          <CdtrAcct>
            <Id>
              <IBAN>${ledger.contract.iban}</IBAN>
            </Id>
          </CdtrAcct>
          <RmtInf>
            <Ustrd>${desc.substring(0, 140)}</Ustrd>
          </RmtInf>
        </CdtTrfTxInf>`;
    });

    const numberOfTxs = pendingLedgers.length;

    const sepaXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${creationDtTm}</CreDtTm>
      <NbOfTxs>${numberOfTxs}</NbOfTxs>
      <CtrlSum>${totalSepsAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>Company Fleet Manager</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${messageId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${numberOfTxs}</NbOfTxs>
      <CtrlSum>${totalSepsAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr>
        <Nm>${process.env.COMPANY_NAME || 'Company Name'}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${process.env.COMPANY_IBAN || 'NL99BANK0123456789'}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${process.env.COMPANY_BIC || 'BANKNL2A'}</BIC>
        </FinInstnId>
      </DbtrAgt>
${transactionsXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    res.header('Content-Type', 'application/xml');
    res.attachment('sepa-export.xml');
    return res.send(sepaXml.trim());

  } catch (error) {
    logger.error("Error exporting SEPA:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
