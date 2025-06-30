import { SupabaseClient } from '@supabase/supabase-js';
import DOMPurify from 'isomorphic-dompurify';

// Type definitions
interface DatabaseRecord {
  id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface ValidationRecord {
  [key: string]: unknown;
}

interface UpsertOptions {
  batchSize?: number;
  continueOnError?: boolean;
  delayMs?: number;
}

interface AuditLogEntry {
  action: string;
  entity_id?: string;
  user_id?: string;
  details: Record<string, unknown>;
}

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
}

// Input validation schemas
export const ValidationSchemas = {
  ticker: /^[A-Z0-9]+(\.[A-Z]+)?$/,
  url: /^https:\/\/.+$/,
  btcAmount: /^\d+(\.\d{1,8})?$/,
  entityName: /^[\w\s\-&.,()]+$/,
};

export class DatabaseHelpers {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Execute a function within a database transaction
   * Note: Supabase doesn't support true transactions in the client library,
   * so we simulate with careful ordering and rollback logic
   */
  async withTransaction<T>(
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const operations: Array<{ table: string; operation: string; data: DatabaseRecord }> = [];
    let result: T;

    try {
      // Execute the function
      result = await fn(this.supabase);
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      // In a real transaction system, we'd rollback here
      // For now, we'll just log and re-throw
      throw error;
    }
  }

  /**
   * Validate and sanitize input data
   */
  validateInput(data: ValidationRecord, schema: Record<string, RegExp>): ValidationRecord {
    const validated: ValidationRecord = {};

    for (const [key, pattern] of Object.entries(schema)) {
      if (data[key] === undefined || data[key] === null) continue;

      const value = String(data[key]).trim();
      if (!pattern.test(value)) {
        throw new Error(`Invalid ${key}: ${value}`);
      }

      validated[key] = value;
    }

    return validated;
  }

  /**
   * Sanitize text content to prevent XSS
   */
  sanitizeText(text: string): string {
    return DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  /**
   * Upsert with conflict resolution
   */
  async upsertWithConflictResolution(
    table: string,
    data: DatabaseRecord,
    uniqueKeys: string[],
    updateStrategy: 'merge' | 'replace' = 'merge'
  ): Promise<{ data: DatabaseRecord; operation: 'insert' | 'update' }> {
    try {
      // First, try to find existing record
      let query = this.supabase.from(table).select('*');
      
      for (const key of uniqueKeys) {
        query = query.eq(key, data[key]);
      }

      const { data: existing, error: selectError } = await query.single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existing) {
        // Record exists, update it
        const updateData = updateStrategy === 'merge' 
          ? { ...existing, ...data, updated_at: new Date().toISOString() }
          : { ...data, updated_at: new Date().toISOString() };

        const { data: updated, error: updateError } = await this.supabase
          .from(table)
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return { data: updated, operation: 'update' };
      } else {
        // Record doesn't exist, insert it
        const { data: inserted, error: insertError } = await this.supabase
          .from(table)
          .insert(data)
          .select()
          .single();

        if (insertError) throw insertError;
        return { data: inserted, operation: 'insert' };
      }
    } catch (error) {
      console.error(`Upsert failed for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Batch operations with error handling
   */
  async batchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<DatabaseRecord>,
    options: UpsertOptions = {}
  ): Promise<{ successful: DatabaseRecord[]; failed: Array<{ item: T; error: unknown }> }> {
    const { batchSize = 10, continueOnError = true, delayMs = 100 } = options;
    const successful: DatabaseRecord[] = [];
    const failed: Array<{ item: T; error: unknown }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        try {
          const result = await operation(item);
          successful.push(result);
          return { success: true, result };
        } catch (error) {
          failed.push({ item, error });
          if (!continueOnError) throw error;
          return { success: false, error };
        }
      });

      await Promise.all(promises);

      // Delay between batches
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return { successful, failed };
  }

  /**
   * Check entity exists and is valid
   */
  async validateEntity(entityId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('entities')
      .select('id')
      .eq('id', entityId)
      .single();

    return !error && !!data;
  }

  /**
   * Acquire advisory lock (PostgreSQL specific)
   */
  async acquireAdvisoryLock(lockName: string, timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { data, error } = await this.supabase.rpc('try_advisory_lock', {
        lock_name: lockName
      });

      if (!error && data === true) {
        return true;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Release advisory lock
   */
  async releaseAdvisoryLock(lockName: string): Promise<void> {
    const { error } = await this.supabase.rpc('release_advisory_lock', {
      lock_name: lockName
    });

    if (error) {
      console.error('Error releasing lock:', error);
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          ...entry,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}

/**
 * Retry helper for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, exponentialBackoff = true } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Should not reach here');
} 