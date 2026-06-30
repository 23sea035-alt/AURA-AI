import type { Store, Options } from "express-rate-limit";
import { sql, type SQL } from "drizzle-orm";
import { db as defaultDb } from "../db/src/index.js";
import { logger } from "../lib/logger.js";

// Structural type satisfied by both the node-postgres `db` and the PGlite test db (for injection).
interface ExecutableDb {
  execute(query: SQL): Promise<{ rows: Record<string, unknown>[] }>;
}

interface RateLimitRow {
  count: number;
  expires_at: string | Date;
}

/**
 * Postgres-backed express-rate-limit store. Counters are shared across all API instances and
 * survive restarts, so the per-minute / daily-cap / brute-force limits are durable (the default
 * in-memory store is per-process and resets on every deploy — see audit C1).
 *
 * Each limiter gets its own `prefix` so distinct limiters keyed by the same value (e.g. a userId
 * under both the per-minute and the daily cap) do not share a counter.
 *
 * Fails OPEN on a store error: a transient DB issue must not turn the limiter into a global outage
 * (and if Postgres is truly down, every other route fails at the DB anyway).
 */
export class PgRateLimitStore implements Store {
  private windowMs = 60_000;
  private readonly db: ExecutableDb;
  prefix: string;

  constructor(prefix: string, dbClient: ExecutableDb = defaultDb) {
    this.prefix = prefix;
    this.db = dbClient;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private fullKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const k = this.fullKey(key);
    const windowSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));
    try {
      const result = await this.db.execute(sql`
        INSERT INTO rate_limits (key, count, expires_at)
        VALUES (${k}, 1, NOW() + make_interval(secs => ${windowSeconds}))
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN rate_limits.expires_at < NOW() THEN 1 ELSE rate_limits.count + 1 END,
          expires_at = CASE WHEN rate_limits.expires_at < NOW()
            THEN NOW() + make_interval(secs => ${windowSeconds})
            ELSE rate_limits.expires_at END
        RETURNING count, expires_at
      `);
      const row = result.rows[0] as unknown as RateLimitRow;
      return { totalHits: Number(row.count), resetTime: new Date(row.expires_at) };
    } catch (err) {
      logger.error({ err, prefix: this.prefix }, "Rate-limit store increment failed — failing open");
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    const k = this.fullKey(key);
    try {
      await this.db.execute(sql`
        UPDATE rate_limits SET count = GREATEST(0, count - 1)
        WHERE key = ${k} AND expires_at >= NOW()
      `);
    } catch (err) {
      logger.error({ err, prefix: this.prefix }, "Rate-limit store decrement failed");
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.db.execute(sql`DELETE FROM rate_limits WHERE key = ${this.fullKey(key)}`);
    } catch (err) {
      logger.error({ err, prefix: this.prefix }, "Rate-limit store resetKey failed");
    }
  }
}
