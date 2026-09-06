import type { IOfflineStorageDriver } from "../driver/types";
import type { ReceiptDocument } from "@inventra/print";

export interface PrintJobRecord {
  jobId: string;
  businessId: string;
  storeId: string;
  deviceId: string;
  documentType: string;
  sourceEntityId: string;
  receiptData: ReceiptDocument;
  printerName?: string;
  status: "QUEUED" | "PRINTING" | "PRINTED" | "FAILED";
  attempts: number;
  errorMessage?: string;
  createdAt: number;
  lastAttemptAt?: number;
}

export class PrintJobRepository {
  constructor(private driver: IOfflineStorageDriver) {}

  public async enqueuePrintJob(
    job: Omit<PrintJobRecord, "jobId" | "status" | "attempts" | "createdAt">
  ): Promise<PrintJobRecord> {
    const jobId = "PJ-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const createdAt = Date.now();

    const fullJob: PrintJobRecord = {
      ...job,
      jobId,
      status: "QUEUED",
      attempts: 0,
      createdAt,
    };

    await this.driver.execute(
      `INSERT INTO print_jobs (
        job_id, business_id, store_id, device_id, document_type,
        source_entity_id, receipt_data_json, printer_name, status,
        attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?)`,
      [
        fullJob.jobId,
        fullJob.businessId,
        fullJob.storeId,
        fullJob.deviceId,
        fullJob.documentType,
        fullJob.sourceEntityId,
        JSON.stringify(fullJob.receiptData),
        fullJob.printerName || null,
        createdAt,
      ]
    );

    return fullJob;
  }

  public async getPendingPrintJobs(businessId: string): Promise<PrintJobRecord[]> {
    const rows = await this.driver.query(
      `SELECT * FROM print_jobs
       WHERE business_id = ? AND status IN ('QUEUED', 'FAILED')
       ORDER BY created_at ASC`,
      [businessId]
    );

    return rows.map((r: any) => ({
      jobId: r.job_id,
      businessId: r.business_id,
      storeId: r.store_id,
      deviceId: r.device_id,
      documentType: r.document_type,
      sourceEntityId: r.source_entity_id,
      receiptData: typeof r.receipt_data_json === "string" ? JSON.parse(r.receipt_data_json) : r.receipt_data_json,
      printerName: r.printer_name,
      status: r.status,
      attempts: r.attempts,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      lastAttemptAt: r.last_attempt_at,
    }));
  }

  public async markPrinted(jobId: string): Promise<void> {
    await this.driver.execute(
      `UPDATE print_jobs
       SET status = 'PRINTED', error_message = NULL, last_attempt_at = ?
       WHERE job_id = ?`,
      [Date.now(), jobId]
    );
  }

  public async markFailed(jobId: string, error: string): Promise<void> {
    await this.driver.execute(
      `UPDATE print_jobs
       SET status = 'FAILED', error_message = ?, attempts = attempts + 1, last_attempt_at = ?
       WHERE job_id = ?`,
      [error, Date.now(), jobId]
    );
  }
}
