import type { IOfflineStorageDriver } from "../driver/types";
import type { SyncEventType, SyncStatus } from "@inventra/api-types";
import { computePayloadChecksum } from "@inventra/shared";

export interface OfflineOperation {
  operationId: string;
  businessId: string;
  storeId: string;
  deviceId: string;
  userId: string;
  deviceSequenceNumber: number;
  eventType: SyncEventType;
  eventVersion: number;
  payload: Record<string, unknown>;
  payloadChecksum: string;
  idempotencyKey: string;
  status: SyncStatus | "SYNCING" | "CONFLICT" | "CANCELLED";
  retryCount: number;
  lastAttemptAt?: number;
  serverEntityId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: number;
}

export interface SyncConflictRecord {
  conflictId: string;
  operationId: string;
  eventType: string;
  errorCode: string;
  errorMessage: string;
  conflictDetails?: Record<string, unknown>;
  resolutionStatus: "UNRESOLVED" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: number;
}

export class OfflineQueueRepository {
  constructor(private driver: IOfflineStorageDriver) {}

  public async getNextSequenceNumber(businessId: string, deviceId: string): Promise<number> {
    const rows = await this.driver.query(
      `SELECT MAX(device_sequence_number) as max_seq
       FROM offline_operations
       WHERE business_id = ? AND device_id = ?`,
      [businessId, deviceId]
    );

    const maxSeq = rows.length > 0 && rows[0]?.max_seq != null ? Number(rows[0].max_seq) : 0;
    return maxSeq + 1;
  }

  public async enqueueOperation(
    op: Omit<OfflineOperation, "payloadChecksum" | "deviceSequenceNumber" | "status" | "retryCount" | "createdAt">,
    overrideSequenceNumber?: number
  ): Promise<OfflineOperation> {
    const seq = overrideSequenceNumber ?? (await this.getNextSequenceNumber(op.businessId, op.deviceId));
    const checksum = await computePayloadChecksum(op.payload);
    const createdAt = Date.now();

    const fullOp: OfflineOperation = {
      ...op,
      deviceSequenceNumber: seq,
      payloadChecksum: checksum,
      status: "PENDING",
      retryCount: 0,
      createdAt,
    };

    await this.driver.execute(
      `INSERT INTO offline_operations (
        operation_id, business_id, store_id, device_id, user_id,
        device_sequence_number, event_type, event_version, payload_json,
        payload_checksum, idempotency_key, status, retry_count,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullOp.operationId,
        fullOp.businessId,
        fullOp.storeId,
        fullOp.deviceId,
        fullOp.userId,
        fullOp.deviceSequenceNumber,
        fullOp.eventType,
        fullOp.eventVersion || 1,
        JSON.stringify(fullOp.payload),
        fullOp.payloadChecksum,
        fullOp.idempotencyKey,
        fullOp.status,
        0,
        createdAt,
      ]
    );

    return fullOp;
  }

  public async getPendingOperations(businessId: string, limit = 50): Promise<OfflineOperation[]> {
    const rows = await this.driver.query(
      `SELECT * FROM offline_operations
       WHERE business_id = ? AND status IN ('PENDING', 'FAILED')
       ORDER BY device_sequence_number ASC
       LIMIT ?`,
      [businessId, limit]
    );

    return rows.map(this.mapRowToOperation);
  }

  public async markSyncing(operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;
    const now = Date.now();
    for (const id of operationIds) {
      await this.driver.execute(
        `UPDATE offline_operations
         SET status = 'SYNCING', last_attempt_at = ?, retry_count = retry_count + 1
         WHERE operation_id = ?`,
        [now, id]
      );
    }
  }

  public async markSynced(operationId: string, serverEntityId?: string): Promise<void> {
    await this.driver.execute(
      `UPDATE offline_operations
       SET status = 'APPLIED', server_entity_id = ?, error_code = NULL, error_message = NULL
       WHERE operation_id = ?`,
      [serverEntityId || null, operationId]
    );
  }

  public async markFailed(
    operationId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.driver.execute(
      `UPDATE offline_operations
       SET status = 'FAILED', error_code = ?, error_message = ?
       WHERE operation_id = ?`,
      [errorCode, errorMessage, operationId]
    );
  }

  public async markConflict(
    operationId: string,
    eventType: string,
    errorCode: string,
    errorMessage: string,
    conflictDetails?: Record<string, unknown>
  ): Promise<void> {
    const conflictId = "CONF-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const now = Date.now();

    await this.driver.transaction(async (trx) => {
      await trx.execute(
        `UPDATE offline_operations
         SET status = 'CONFLICT', error_code = ?, error_message = ?
         WHERE operation_id = ?`,
        [errorCode, errorMessage, operationId]
      );

      await trx.execute(
        `INSERT INTO sync_conflicts (
          conflict_id, operation_id, event_type, error_code,
          error_message, conflict_details_json, resolution_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'UNRESOLVED', ?)`,
        [
          conflictId,
          operationId,
          eventType,
          errorCode,
          errorMessage,
          conflictDetails ? JSON.stringify(conflictDetails) : null,
          now,
        ]
      );
    });
  }

  public async getPendingCount(businessId: string): Promise<number> {
    const rows = await this.driver.query(
      `SELECT COUNT(*) as count FROM offline_operations
       WHERE business_id = ? AND status IN ('PENDING', 'SYNCING', 'FAILED')`,
      [businessId]
    );
    return rows.length > 0 && rows[0]?.count != null ? Number(rows[0].count) : 0;
  }

  public async getConflictCount(_businessId?: string): Promise<number> {
    const rows = await this.driver.query(
      `SELECT COUNT(*) as count FROM sync_conflicts
       WHERE resolution_status = 'UNRESOLVED'`,
      []
    );
    return rows.length > 0 && rows[0]?.count != null ? Number(rows[0].count) : 0;
  }

  public async getSyncConflicts(): Promise<SyncConflictRecord[]> {
    const rows = await this.driver.query(
      `SELECT * FROM sync_conflicts ORDER BY created_at DESC`
    );
    return rows.map((r: any) => ({
      conflictId: r.conflict_id,
      operationId: r.operation_id,
      eventType: r.event_type,
      errorCode: r.error_code,
      errorMessage: r.error_message,
      conflictDetails: r.conflict_details_json ? JSON.parse(r.conflict_details_json) : undefined,
      resolutionStatus: r.resolution_status,
      createdAt: r.created_at,
    }));
  }

  private mapRowToOperation(r: any): OfflineOperation {
    return {
      operationId: r.operation_id,
      businessId: r.business_id,
      storeId: r.store_id,
      deviceId: r.device_id,
      userId: r.user_id,
      deviceSequenceNumber: r.device_sequence_number,
      eventType: r.event_type as SyncEventType,
      eventVersion: r.event_version,
      payload: typeof r.payload_json === "string" ? JSON.parse(r.payload_json) : r.payload_json,
      payloadChecksum: r.payload_checksum,
      idempotencyKey: r.idempotency_key,
      status: r.status,
      retryCount: r.retry_count,
      lastAttemptAt: r.last_attempt_at,
      serverEntityId: r.server_entity_id,
      errorCode: r.error_code,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    };
  }
}
