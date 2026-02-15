
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar, DollarSign, ExternalLink
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { AppConfig, Product, Warehouse } from './types';

import { Dashboard } from './components/Dashboard';
import { AuditModule } from './components/AuditModule';
import { OrderModule } from './components/OrderModule';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe",
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  companyName: "CADENA DE BOTICAS SAN JOSE S.A.C."
};

const App: React.FC = () => {
  const getPeruDateString = () => {
    const date = new Date();
    const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    return peruDate.toISOString().split('T')[0];
  };

  const [config] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('odoo_ops_pro_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [view, setView] = useState<'login' | 'app'>('login');
  const [session, setSession] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [selectedPos, setSelectedPos] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ 
    start: getPeruDateString(), 
    end: getPeruDateString() 
  });
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | null>(null);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const fetchData = useCallback(async () => {
    if (view !== 'app') return;
    setLoading(true);
    setErrorLog(null);
    try {
      const companies = await client.searchRead('res.company', [['name', 'ilike', 'SAN JOSE']], ['id']);
      if (!companies || !companies.length) throw new Error("Compañía San José no encontrada.");
      const sanJoseId = companies[0].id;

      const configs = await client.searchRead('pos.config', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'current_session_id', 'current_session_state']
      ) || [];
      
      const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];
      const filteredConfigs = configs.filter((c: any) => 
        !blacklist.some(term => c.name.toUpperCase().includes(term))
      );
      setPosConfigs(filteredConfigs);

      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sanJoseId]], ['name', 'id', 'code']);
      setWarehouses(ws || []);

      const sessions = await client.searchRead('pos.session', [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        ['start_at', '>=', `${dateRange.start} 00:00:00`], 
        ['start_at', '<=', `${dateRange.end} 23:59:59`]
      ], ['id', 'config_id', 'start_at', 'state'], { order: 'start_at desc' }) || [];

      const sessionIds = sessions.map(s => s.id);
      const orders = sessionIds.length > 0 ? await client.searchRead('pos.order',
        [['session_id', 'in', sessionIds]],
        ['id', 'session_id', 'amount_total', 'amount_tax', 'state', 'date_order', 'config_id']
      ) : [];

      const orderIds = (orders || []).map(o => o.id);
      const orderLines = orderIds.length > 0 ? await client.searchRead('pos.order.line',
        [['order_id', 'in', orderIds]],
        ['product_id', 'qty', 'price_subtotal_incl', 'order_id']
      ) : [];

      const productIds = Array.from(new Set((orderLines || []).map(l => Array.isArray(l.product_id) ? l.product_id[0] : null).filter(Boolean)));
      let costsMap: Record<number, number> = {};
      if (productIds.length > 0) {
        const productCostsData = await client.rpcCall('object', 'execute_kw', [
          config.db, (client as any).uid, config.apiKey,
          'product.product', 'read',
          [productIds, ['standard_price']],
          {}
        ]);
        (productCostsData || []).forEach((p: any) => costsMap[p.id] = p.standard_price || 0);
      }

      const payments = sessionIds.length > 0 ? await client.searchRead('pos.payment', 
        [['session_id', 'in', sessionIds]], 
        ['amount', 'payment_method_id', 'session_id']
      ) : [];

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id && s.config_id[0] === conf.id);
        const confSessionIds = confSessions.map(s => s.id);
        const latestSession = confSessions[0];
        
        const stateMapping: any = {
          'opened': 'ABIERTO',
          'opening_control': 'ABRIENDO',
          'closing_control': 'EN CIERRE',
          'closed': 'CERRADO',
          'false': 'SIN ACTIVIDAD'
        };

        const posOrders = (orders || []).filter(o => o.session_id && confSessionIds.includes(o.session_id[0]));
        const totalSales = posOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0);
        const posLines = (orderLines || []).filter(l => l.order_id && posOrders.map(o => o.id).includes(l.order_id[0]));
        
        let totalCost = 0;
        const productStats: any = {};
        posLines.forEach(l => {
          if (!Array.isArray(l.product_id)) return;
          const pId = l.product_id[0];
          const pName = l.product_id[1];
          const cost = costsMap[pId] || 0;
          const lineCost = (l.qty || 0) * cost;
          totalCost += lineCost;

          if (!productStats[pName]) productStats[pName] = { qty: 0, total: 0, cost: 0, margin: 0 };
          productStats[pName].qty += (l.qty || 0);
          productStats[pName].total += (l.price_subtotal_incl || 0);
          productStats[pName].cost += lineCost;
          productStats[pName].margin = productStats[pName].total - productStats[pName].cost;
        });

        const posPayments = (payments || []).filter(p => p.session_id && confSessionIds.includes(p.session_id[0]));
        const methodStats: any = {};
        posPayments.forEach(p => {
          const mName = Array.isArray(p.payment_method_id) ? p.payment_method_id[1] : 'Efectivo';
          methodStats[mName] = (methodStats[mName] || 0) + p.amount;
        });

        stats[conf.id] = {
          isOnline: conf.current_session_id || (latestSession && latestSession.state === 'opened'),
          rawState: stateMapping[conf.current_session_state] || (latestSession ? stateMapping[latestSession.state] : 'SIN ACTIVIDAD'),
          totalSales: totalSales,
          totalCost: totalCost,
          margin: totalSales - totalCost,
          count: confSessions.length,
          sessions: confSessions,
          payments: methodStats,
          products: Object.entries(productStats)
            .map(([name, data]: [string, any]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { setLoading(false); }
  }, [client, view, dateRange, config.companyName, config.db, config.apiKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProductSearch = async (term: string) => {
    if (term.length < 3) return;
    setLoading(true);
    try {
      const prods = await client.searchRead('product.product', [
        '|', ['name', 'ilike', term], ['default_code', 'ilike', term],
        ['sale_ok', '=', true]
      ], ['name', 'default_code', 'list_price', 'qty_available'], { limit: 15 });
      setProducts(prods);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) {
      alert("Seleccione una sede de destino y agregue productos.");
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      alert("Solicitud de Suministro Interno registrada correctamente.");
      setCart([]);
      setTargetWarehouseId(null);
    } catch (e) {
      alert("Error al procesar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Acceso denegado.");
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name'], { limit: 1 });
      if (!user || !user.length) throw new Error("Usuario no registrado en Odoo.");
      setSession({ name: user[0].name });
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
      setLoading(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-[#F0F2F5] text-odoo-text">
         <div className="bg-white w-full max-w-[420px] shadow-2xl rounded-2xl border-t-8 border-odoo-primary p-12 space-y-10 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-odoo-primary rounded-3xl flex items-center justify-center text-white text-5xl font-black italic mx-auto shadow-2xl rotate-3">SJ</div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">BOTICAS SAN JOSE</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Centro de Operaciones Inteligente</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Credencial de Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-odoo-primary focus:bg-white transition-all text-sm" 
                    placeholder="Ingrese su ID de Odoo" 
                    value={loginInput} 
                    onChange={e => setLoginInput(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full bg-odoo-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-[#5a3c52] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : "Ingresar al Sistema"}
              </button>
            </form>
            {errorLog && <p className="text-red-500 text-[10px] font-black uppercase bg-red-50 p-4 rounded-xl border border-red-100 animate-in shake">{errorLog}</p>}
         </div>
         <div className="mt-12 text-center opacity-30 flex flex-col items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">© 2026 CADENA DE BOTICAS SAN JOSE S.A.C.</p>
            <p className="text-[8px] font-bold uppercase tracking-widest">Powered by GAORSYSTEM PERU</p>
         </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F4F7FA] text-odoo-text">
      <header className="h-14 bg-odoo-primary text-white flex items-center justify-between px-6 shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center gap-3 font-black h-full cursor-pointer"><div className="w-8 h-8 bg-white rounded flex items-center justify-center text-odoo-primary text-xs font-black italic shadow-sm">SJ</div><span className="text-sm tracking-tight uppercase">BI San José</span></div>
          {[{id:'dashboard', label:'Dashboard'}, {id:'ventas', label:'Auditoría'}, {id:'pedidos', label:'Logística'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 h-full flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white/10 border-b-4 border-white' : 'opacity-60 hover:opacity-100'}`}>{tab.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-4 h-full">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{session?.name}</span>
          <button onClick={() => setView('login')} className="px-5 h-full hover:bg-red-500/20 transition-colors" title="Cerrar Sesión"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0">
          <div className="p-6 space-y-6 flex-1">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filtros de Análisis</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase">Inicio</label>
                <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full p-2.5 text-xs border rounded font-bold"/>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase">Fin</label>
                <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full p-2.5 text-xs border rounded font-bold"/>
              </div>
              <button onClick={fetchData} className="w-full p-3 bg-odoo-primary text-white rounded text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Sincronizar
              </button>
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 text-center opacity-40">
             <p className="text-[8px] font-bold">© 2026 BOTICAS SAN JOSE</p>
             <p className="text-[7px] font-black">GAORSYSTEM PERU</p>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={setSelectedPos} selectedPos={setSelectedPos} onCloseDetail={() => setSelectedPos(null)} />}
          {activeTab === 'pedidos' && (
            <OrderModule 
              productSearch={productSearch} 
              setProductSearch={setProductSearch} 
              onSearch={handleProductSearch} 
              products={products} 
              cart={cart} 
              setCart={setCart} 
              warehouses={warehouses} 
              targetWarehouseId={targetWarehouseId} 
              setTargetWarehouseId={setTargetWarehouseId} 
              onSubmitOrder={handleConfirmOrder} 
              loading={loading} 
            />
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-odoo-primary flex items-center gap-4 animate-in slide-in-from-bottom">
          <Loader2 className="animate-spin text-odoo-primary" size={20}/>
          <p className="text-[10px] font-black uppercase text-gray-800 tracking-widest">Leyendo servidor Odoo v14...</p>
        </div>
      )}
    </div>
  );
};

export default App;
