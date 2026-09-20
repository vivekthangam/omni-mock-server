import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

export interface CustomMockRule {
  id: string;
  name: string;
  method: string;
  path: string;
  statusCode: number;
  responseHeaders?: Record<string, string>;
  responseBody: any;
  delayMs?: number;
  enabled: boolean;
  hitCount: number;
  createdAt: string;
}

class MockRuleEngine {
  private rules: CustomMockRule[] = [];

  constructor() {
    // Add sample initial rule
    this.addRule({
      name: 'Sample Custom Mock API',
      method: 'GET',
      path: '/custom/hello',
      statusCode: 200,
      responseHeaders: { 'X-Custom-Mock': 'true' },
      responseBody: {
        message: 'Hello from dynamic custom mock rule!',
        user: '{{person.fullName}}',
        uuid: '{{string.uuid}}',
        time: '{{date}}',
      },
      delayMs: 200,
      enabled: true,
    });
  }

  public getRules(): CustomMockRule[] {
    return this.rules;
  }

  public getRuleById(id: string): CustomMockRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  public addRule(rule: Omit<CustomMockRule, 'id' | 'hitCount' | 'createdAt'>): CustomMockRule {
    const newRule: CustomMockRule = {
      id: uuidv4(),
      hitCount: 0,
      createdAt: new Date().toISOString(),
      ...rule,
      path: rule.path.startsWith('/') ? rule.path : `/${rule.path}`,
    };
    this.rules.unshift(newRule);
    return newRule;
  }

  public updateRule(id: string, updates: Partial<CustomMockRule>): CustomMockRule | null {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.rules[index] = { ...this.rules[index], ...updates };
    return this.rules[index];
  }

  public deleteRule(id: string): boolean {
    const initialLen = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== id);
    return this.rules.length < initialLen;
  }

  public matchRule(method: string, path: string): CustomMockRule | undefined {
    return this.rules.find(
      r => r.enabled && (r.method === 'ALL' || r.method.toUpperCase() === method.toUpperCase()) && r.path === path
    );
  }

  public evaluateTemplate(body: any): any {
    if (typeof body === 'string') {
      return this.interpolateString(body);
    }
    if (Array.isArray(body)) {
      return body.map(item => this.evaluateTemplate(item));
    }
    if (typeof body === 'object' && body !== null) {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(body)) {
        result[k] = this.evaluateTemplate(v);
      }
      return result;
    }
    return body;
  }

  private interpolateString(str: string): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
      const expr = expression.trim();
      if (expr === 'date' || expr === 'now') return new Date().toISOString();
      if (expr === 'timestamp') return Date.now().toString();

      // Faker expressions
      try {
        const parts = expr.replace(/^faker\./, '').split('.');
        let current: any = faker;
        for (const part of parts) {
          if (current && typeof current[part] !== 'undefined') {
            current = current[part];
          }
        }
        if (typeof current === 'function') return current();
        if (current !== undefined) return String(current);
      } catch {
        // ignore
      }
      return `{{${expr}}}`;
    });
  }
}

export const mockRuleEngine = new MockRuleEngine();
