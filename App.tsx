
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar, DollarSign, 
  Settings, Grid, Bell, HelpCircle, Package, Store, Clock, UserCheck
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { AppConfig, Product, Warehouse } from './types';

import { Dashboard } from './components/Dashboard';
import { AuditModule } from './components/AuditModule';
import { OrderModule } from './components/OrderModule';
import { SessionModule } from './components/SessionModule';

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
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ 
    start: getPeruDateString(), 
    end: getPeruDateString() 
  });
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [originWarehouseId, setOriginWarehouseId] = useState<number | null>(null);
  const [originLocationId, setOriginLocationId] = useState<number | null>(null);
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

      // 1. Cargar Cajas
      const configs = await client.searchRead('pos.config', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'current_session_id', 'current_session_state']
      ) || [];
      
      const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];
      const filteredConfigs = configs.filter((c: any) => 
        !blacklist.some(term => c.name.toUpperCase().includes(term))
      );
      setPosConfigs(filteredConfigs);

      // 2. Cargar Sesiones Abiertas Detalladas
      const openSessions = await client.searchRead('pos.session', [
        ['state', '=', 'opened'],
        ['config_id', 'in', filteredConfigs.map(c => c.id)]
      ], ['id', 'name', 'user_id', 'start_at', 'config_id']);
      setActiveSessions(openSessions);

      // 3. Cargar Almacenes
      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sanJoseId]], ['name', 'id', 'code', 'lot_stock_id']);
      setWarehouses(ws || []);
      const principal = (ws || []).find((w: any) => w.code === 'PRINCIPAL1' || w.code === 'PR');
      if (principal) {
        setOriginWarehouseId(principal.id);
        if (principal.lot_stock_id) setOriginLocationId(principal.lot_stock_id[0]);
      }

      // 4. Cargar Pedidos del Rango
      const orders = await client.searchRead('pos.order', [
        ['company_id', '=', sanJoseId],
        ['date_order', '>=', `${dateRange.start} 00:00:00`],
        ['date_order', '<=', `${dateRange.end} 23:59:59`],
        ['state', 'in', ['paid', 'done', 'invoiced']]
      ], ['id', 'amount_total', 'config_id', 'session_id']) || [];

      // 5. Mapeo de Sesiones a Config
      const allSessionsInRange = await client.searchRead('pos.session', [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        ['start_at', '<=', `${dateRange.end} 23:59:59`],
        ['stop_at', '>=', `${dateRange.start} 00:00:00`]
      ], ['id', 'config_id']);
      const sessionToConfigMap: Record<number, number> = {};
      allSessionsInRange.forEach((s: any) => { if (s.config_id) sessionToConfigMap[s.id] = s.config_id[0]; });

      // 6. Consolidar solo Ventas (Sin Márgenes)
      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const posOrders = orders.filter(o => {
          const directMatch = o.config_id && o.config_id[0] === conf.id;
          const sessionMatch = o.session_id && sessionToConfigMap[o.session_id[0]] === conf.id;
          return directMatch || sessionMatch;
        });

        stats[conf.id] = {
          isOnline: conf.current_session_id !== false,
          rawState: conf.current_session_state || 'CERRADO',
          totalSales: posOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0),
          count: posOrders.length,
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { setLoading(false); }
  }, [client, view, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      <div className="h-screen flex items-center justify-center p-6 bg-[#f1f4f9]">
         <div className="bg-white w-full max-w-[420px] shadow-xl rounded-odoo p-10 space-y-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-odoo-primary rounded-xl flex items-center justify-center text-white text-3xl font-bold italic shadow-lg">SJ</div>
              <h1 className="text-xl font-bold text-gray-700">Boticas San José</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Usuario</label>
                <input type="text" className="w-full o-input" placeholder="ID de Usuario" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full o-btn o-btn-primary py-3 font-bold">
                {loading ? <Loader2 className="animate-spin" size={20}/> : "Iniciar Sesión"}
              </button>
            </form>
            {errorLog && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 text-center font-medium">{errorLog}</div>}
         </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-odoo-bg overflow-hidden">
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 shadow-md z-50">
        <div className="flex items-center h-full">
          <button className="h-full px-3 hover:bg-black/10 transition-colors"><Grid size={20} /></button>
          <div className="h-4 w-px bg-white/20 mx-2"></div>
          <span className="text-sm font-bold tracking-tight px-3 h-full flex items-center">San José Operations</span>
          <div className="hidden md:flex h-full ml-4">
             {[{id:'dashboard', label:'Dashboard'}, {id:'sesiones', label:'Estado Sesiones'}, {id:'ventas', label:'Auditoría'}, {id:'pedidos', label:'Logística'}].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`o-nav-item ${activeTab === tab.id ? 'active' : ''}`}>{tab.label}</button>
             ))}
          </div>
        </div>
        <div className="flex items-center gap-2 h-full">
          <div className="flex items-center gap-2 px-3 h-full">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">{session?.name?.[0]}</div>
            <span className="text-xs font-medium hidden sm:inline">{session?.name}</span>
          </div>
          <button onClick={() => setView('login')} className="h-full px-3 hover:bg-red-500/80 transition-colors"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-odoo-border hidden md:flex flex-col shrink-0 py-4">
          <div className="flex-1 space-y-1">
             <div className="px-6 mb-4"><h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Módulos</h3></div>
             <button onClick={() => setActiveTab('dashboard')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={18} /> Dashboard</button>
             <button onClick={() => setActiveTab('sesiones')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'sesiones' ? 'active' : ''}`}><Clock size={18} /> Estado de Sesiones</button>
             <button onClick={() => setActiveTab('ventas')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'ventas' ? 'active' : ''}`}><TrendingUp size={18} /> Auditoría Ventas</button>
             <button onClick={() => setActiveTab('pedidos')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'pedidos' ? 'active' : ''}`}><Truck size={18} /> Logística Interna</button>
             <div className="px-6 mt-8 mb-4"><h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Filtros</h3></div>
             <div className="px-4 space-y-4">
                <div className="space-y-1 px-4"><label className="text-[10px] font-bold text-gray-400 uppercase">Desde</label><input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full o-input text-xs"/></div>
                <div className="space-y-1 px-4"><label className="text-[10px] font-bold text-gray-400 uppercase">Hasta</label><input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full o-input text-xs"/></div>
                <div className="px-4 pt-2"><button onClick={fetchData} className="w-full o-btn o-btn-primary text-xs gap-2 py-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Sincronizar</button></div>
             </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-odoo-bg">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'sesiones' && <SessionModule activeSessions={activeSessions} loading={loading} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={(pos) => setPosSalesData((prev:any) => ({...prev, _selected: pos}))} selectedPos={posSalesData._selected} onCloseDetail={() => setPosSalesData((prev:any) => ({...prev, _selected: null}))} />}
          {activeTab === 'pedidos' && <OrderModule productSearch={productSearch} setProductSearch={setProductSearch} onSearch={() => {}} products={[]} cart={[]} setCart={() => {}} warehouses={[]} targetWarehouseId={null} setTargetWarehouseId={() => {}} onSubmitOrder={() => {}} loading={loading} />}
        </main>
      </div>
    </div>
  );
};

export default App;
