import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import { auditLog } from '../../infrastructure/database/schema.js';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';

export interface RecordAuditEventInput {
  userId?: string | null;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string;
}

export interface ListAuditLogsFilters {
  userId?: string;
  entity?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async recordEvent(event: RecordAuditEventInput, tx?: any) {
    const db = tx || this.databaseService.db;
    const [entry] = await db
      .insert(auditLog)
      .values({
        userId: event.userId || null,
        userEmail: event.userEmail || '',
        userRole: event.userRole || '',
        action: event.action,
        entity: event.entity,
        entityId: event.entityId || '',
        oldValues: event.oldValues || null,
        newValues: event.newValues || null,
        ipAddress: event.ipAddress || '',
      })
      .returning();

    return entry;
  }

  async listLogs(filters: ListAuditLogsFilters = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));

    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    if (filters.entity) {
      conditions.push(eq(auditLog.entity, filters.entity));
    }
    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }
    if (filters.dateFrom) {
      conditions.push(gte(auditLog.createdAt, new Date(`${filters.dateFrom}T00:00:00.000Z`)));
    }
    if (filters.dateTo) {
      conditions.push(lte(auditLog.createdAt, new Date(`${filters.dateTo}T23:59:59.999Z`)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.databaseService.db
      .select({ count: count() })
      .from(auditLog)
      .where(where);

    const total = Number(totalResult?.count ?? 0);

    const data = await this.databaseService.db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }
}
