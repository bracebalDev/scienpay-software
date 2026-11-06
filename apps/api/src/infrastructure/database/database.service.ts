import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public client!: postgres.Sql;
  public db!: ReturnType<typeof drizzle<typeof schema>>;

  onModuleInit() {
    const url =
      process.env.DATABASE_URL ||
      `postgresql://${process.env.DATABASE_USER || 'scienpay_app'}:${process.env.DATABASE_PASSWORD || 'scienpay_dev_password_change_me'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'scienpay_db'}`;

    this.client = postgres(url, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end();
    }
  }
}
