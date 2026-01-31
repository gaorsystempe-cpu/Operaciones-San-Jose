
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

export class OdooClient {
  private uid: number | null = null;
  private apiKey: string | null = null;

  constructor(private url: string, private db: string) {
    this.url = this.url.replace(/\/+$/, '').replace('http://', 'https://');
  }

  setAuth(uid: number, apiKey: string) {
    this.uid = uid;
    this.apiKey = apiKey;
  }

  async rpcCall(endpoint: string, methodName: string, params: any[]) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${params.map(p => `<param>${serialize(p)}</param>`).join('')}</params></methodCall>`;
    const odooUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Stratetiges for connection
    const strategies = [
      { 
        name: 'Vercel Proxy', 
        use: !isLocal,
        call: async () => {
          const res = await fetch('/api/odoo-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: odooUrl, body: xml })
          });
          return res;
        }
      },
      {
        name: 'CORSProxy.io',
        use: true,
        call: async () => fetch(`https://corsproxy.io/?${encodeURIComponent(odooUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml
        })
      },
      {
        name: 'AllOrigins',
        use: true,
        call: async () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(odooUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xml
        })
      }
    ].filter(s => s.use);

    let lastError: any = null;

    for (const strategy of strategies) {
      try {
        const response = await strategy.call();

        if (!response.ok) {
          lastError = new Error(`${strategy.name} status ${response.status}`);
          continue;
        }

        const text = await response.text();
        
        // ExpatError mitigation: check if body arrived
        if (!text || text.includes('xml.parsers.expat.ExpatError') || text.includes('no element found')) {
          lastError = new Error(`${strategy.name} failed to deliver body to Odoo.`);
          continue;
        }

        if (!text.includes('methodResponse')) {
          lastError = new Error(`Invalid response from ${strategy.name}`);
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          throw new Error(`Odoo: ${faultData.faultString || 'Unknown Error'}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;

      } catch (e: any) {
        if (e.message.startsWith('Odoo:')) throw e;
        lastError = e;
        console.warn(`Error with ${strategy.name}:`, e.message);
      }
    }
    
    throw new Error(`Error de conexión: ${lastError?.message || 'XML-RPC Body Empty'}. No se pudo establecer una conexión estable con Odoo desde este entorno.`);
  }

  async authenticate(user: string, apiKey: string): Promise<number | null> {
    const uid = await this.rpcCall('common', 'authenticate', [this.db, user, apiKey, {}]);
    if (typeof uid === 'number') {
      this.uid = uid;
      this.apiKey = apiKey;
      return uid;
    }
    return null;
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
