
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

/**
 * Proxies optimizados para no perder el cuerpo de la petición POST.
 * El error 'no element found' ocurre cuando el proxy convierte el POST en GET 
 * o elimina el body XML durante la redirección.
 */
const PROXIES = [
  { 
    name: 'CORSProxy.io', 
    fn: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    headers: { 'Content-Type': 'text/xml' } 
  },
  { 
    name: 'Cloudflare-Worker', 
    fn: (u: string) => `https://proxy.cors.sh/${u}`,
    headers: { 'Content-Type': 'application/xml', 'x-cors-api-key': 'temp_897162354' } 
  },
  { 
    name: 'AllOrigins', 
    fn: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    headers: { 'Content-Type': 'text/xml' } 
  },
  { 
    name: 'Directo', 
    fn: (u: string) => u,
    headers: { 'Content-Type': 'text/xml' } 
  }
];

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
    const baseUrl = `${this.url}/xmlrpc/2/${endpoint}`;
    let lastError: any = null;

    for (const proxy of PROXIES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); 

      try {
        const response = await fetch(proxy.fn(baseUrl), {
          method: 'POST',
          headers: proxy.headers,
          body: xml,
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = new Error(`Proxy ${proxy.name} devolvió error HTTP ${response.status}`);
          continue;
        }

        const text = await response.text();
        
        // Si el proxy devuelve el error 'no element found' de Odoo, significa que el proxy 
        // falló al enviar el body. Saltamos al siguiente proxy.
        if (text.includes('xml.parsers.expat.ExpatError') || text.includes('no element found')) {
          console.warn(`Proxy ${proxy.name} perdió el cuerpo de la petición. Reintentando...`);
          lastError = new Error("El cuerpo XML se perdió en el tránsito.");
          continue;
        }

        if (!text || !text.includes('methodResponse')) {
          lastError = new Error(`Respuesta inválida de ${proxy.name}`);
          continue;
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');
        const fault = doc.querySelector('fault value');
        if (fault) {
          const faultData = parseValue(fault);
          // Si el error es de Odoo pero NO es un error de transporte (expat), lo lanzamos.
          throw new Error(`Odoo: ${faultData.faultString || 'Error interno'}`);
        }

        const resultNode = doc.querySelector('params param value');
        return resultNode ? parseValue(resultNode) : null;

      } catch (e: any) {
        clearTimeout(timeoutId);
        lastError = e;
        if (e.message.startsWith('Odoo:')) throw e;
        console.warn(`Error en ${proxy.name}:`, e.message);
      }
    }
    
    throw new Error(`Error crítico: ${lastError?.message || 'Fallo de transporte XML-RPC'}. El servidor Odoo recibió una petición vacía. Verifique si su servidor Odoo permite peticiones desde dominios externos.`);
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
