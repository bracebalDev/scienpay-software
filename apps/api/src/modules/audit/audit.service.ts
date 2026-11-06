import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import { auditLog } from '../../infrastructure/database/schema.js';
import { desc, eq } from 'drizzle-orm';

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

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async recordEvent(event: RecordAuditEventInput) {
    const [entry] = await this.databaseService.db
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

  async listLogs(limit: number = 100) {
    return this.databaseService.db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
