
const xmlEscape = (str: string) =>
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&apos;');

const serialize = (value: any): string => {
  if (value === null || value === undefined) return '<value><nil/></value>';
  let content = '';
  if (typeof value === 'number') {
    content = Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
  } else if (typeof value === 'string') {
    content = `<string>${xmlEscape(value)}</string>`;
  } else if (typeof value === 'boolean') {
    content = `<boolean>${value ? '1' : '0'}</boolean>`;
  } else if (Array.isArray(value)) {
    content = `<array><data>${value.map(v => serialize(v)).join('')}</data></array>`;
  } else if (typeof value === 'object') {
    if (value instanceof Date) {
      const iso = value.toISOString().replace(/\.\d+Z$/, '');
      content = `<dateTime.iso8601>${iso}</dateTime.iso8601>`;
    } else {
      content = `<struct>${Object.entries(value).map(([k, v]) =>
        `<member><name>${xmlEscape(k)}</name>${serialize(v)}</member>`
      ).join('')}</struct>`;
    }
  }
  return `<value>${content}</value>`;
};

const parseValue = (node: Element): any => {
  const child = node.firstElementChild;
  if (!child) return node.textContent;
  switch (child.tagName.toLowerCase()) {
    case 'string': return child.textContent;
    case 'int':
    case 'i4': return parseInt(child.textContent || '0', 10);
    case 'double': return parseFloat(child.textContent || '0');
    case 'boolean': return child.textContent === '1';
    case 'datetime.iso8601': return new Date(child.textContent || '');
    case 'array': return Array.from(child.querySelector('data')?.children || []).map(parseValue);
    case 'struct':
      const obj: any = {};
      Array.from(child.children).forEach(m => {
        const n = m.querySelector('name');
        const v = m.querySelector('value');
        if (n && v) obj[n.textContent || ''] = parseValue(v);
      });
      return obj;
    case 'nil': return null;
    default: return child.textContent;
  }
};

const PROXIES = [
  (u: string) => u,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

export class OdooClient {
  private uid: number | null = null;
  private apiKey: string | null = null;

  constructor(private url: string, private db: string) {
    this.url = this.url.replace(/\/+$/, '');
  }

  setAuth(uid: number, apiKey: string) {
    this.uid = uid;
    this.apiKey = apiKey;
  }

  async rpcCall(endpoint: string, methodName: string, params: any[]) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${params.map(p => `<param>${serialize(p)}</param>`).join('')}</params></methodCall>`;
    const baseUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    let lastError: any = null;

    for (const proxyFn of PROXIES) {
      try {
        const response = await fetch(proxyFn(baseUrl), {
          method: 'POST',
          headers: { 
            'Content-Type': 'text/xml',
            'Accept': 'text/xml'
          },
          body: xml,
          mode: 'cors'
        });

        if (!response.ok) {
          lastError = new Error(`Servidor Odoo respondió con error HTTP ${response.status}`);
          continue;
        }

        const text = await response.text();
        if (!text || !text.includes('methodResponse')) {
          lastError = new Error("Respuesta XML inválida o vacía");
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          throw new Error(`Error Odoo: ${faultData.faultString || 'Error desconocido'}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;
      } catch (e: any) {
        lastError = e;
        if (e.message.includes('Odoo')) throw e;
      }
    }
    throw new Error(lastError?.message || 'Fallo total de conexión con Odoo');
  }

  async authenticate(user: string, apiKey: string): Promise<number | null> {
    try {
      const uid = await this.rpcCall('common', 'authenticate', [this.db, user, apiKey, {}]);
      if (typeof uid === 'number') {
        this.uid = uid;
        this.apiKey = apiKey;
        return uid;
      }
      return null;
    } catch (e: any) {
      throw e;
    }
  }

  async searchRead(model: string, domain: any[], fields: string[], options: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'search_read',
      [domain],
      { 
        fields, 
        limit: options.limit || 100, 
        order: options.order || '',
        context: options.context || {}
      }
    ]);
  }

  async create(model: string, values: any, context: any = {}) {
    if (!this.uid || !this.apiKey) throw new Error("Sesión no iniciada");
    return await this.rpcCall('object', 'execute_kw', [
      this.db, this.uid, this.apiKey,
      model, 'create',
      [values],
      { context }
    ]);
  }
}
