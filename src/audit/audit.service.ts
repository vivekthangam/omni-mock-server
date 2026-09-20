import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export type ProtocolType = 
  | 'REST' 
  | 'GRAPHQL' 
  | 'GRPC' 
  | 'SOAP' 
  | 'WEBSOCKET' 
  | 'SOCKETIO' 
  | 'SSE' 
  | 'WEBHOOK' 
  | 'OAUTH'
  | 'AUTH';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  protocol: ProtocolType;
  method: string;
  path: string;
  clientIp?: string;
  headers?: Record<string, any>;
  query?: Record<string, any>;
  requestBody?: any;
  responseStatus?: number | string;
  responseBody?: any;
  latencyMs?: number;
  authInfo?: {
    type?: string;
    identity?: string;
    valid?: boolean;
    details?: any;
  };
  metadata?: Record<string, any>;
}

class AuditService extends EventEmitter {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  public record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Emit live event for connected UI listeners
    this.emit('new_log', fullEntry);

    // Console output for CLI/Docker logging
    const statusColor = fullEntry.responseStatus ? `[${fullEntry.responseStatus}]` : '';
    const latency = fullEntry.latencyMs !== undefined ? `(${fullEntry.latencyMs}ms)` : '';
    const auth = fullEntry.authInfo?.type ? `[Auth: ${fullEntry.authInfo.type}]` : '';
    console.log(
      `[AUDIT] [${fullEntry.protocol}] ${fullEntry.method} ${fullEntry.path} ${statusColor} ${latency} ${auth}`
    );

    return fullEntry;
  }

  public getLogs(filter?: {
    protocol?: ProtocolType;
    search?: string;
    limit?: number;
    offset?: number;
  }): { total: number; logs: AuditLogEntry[] } {
    let result = [...this.logs];

    if (filter?.protocol) {
      result = result.filter(l => l.protocol.toUpperCase() === filter.protocol?.toUpperCase());
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(l => 
        l.path.toLowerCase().includes(q) ||
        l.method.toLowerCase().includes(q) ||
        JSON.stringify(l.requestBody || {}).toLowerCase().includes(q) ||
        JSON.stringify(l.authInfo || {}).toLowerCase().includes(q)
      );
    }

    const total = result.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    return {
      total,
      logs: result.slice(offset, offset + limit),
    };
  }

  public getLogById(id: string): AuditLogEntry | undefined {
    return this.logs.find(l => l.id === id);
  }

  public clearLogs(): void {
    this.logs = [];
    this.emit('cleared');
  }
}

export const auditService = new AuditService();
