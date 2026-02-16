
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

  const [session, setSession] = useState<any | null>(() => {
    const saved = localStorage.getItem('sjs_ops_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<'login' | 'app'>(session ? 'app' : 'login');
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
      // MECANISMO DE RESILIENCIA: Si el cliente perdió el UID (F5), re-autenticar automáticamente
      if (!client.isAuthenticated()) {
        const uid = await client.authenticate(config.user, config.apiKey);
        if (!uid) throw new Error("Sesión de Odoo expirada. Por favor, reingrese.");
      }

      // 1. Validar Compañía
      const companies = await client.searchRead('res.company', [['name', 'ilike', 'SAN JOSE']], ['id']);
      if (!companies || !companies.length) throw new Error("Compañía San José no encontrada.");
      const sanJoseId = companies[0].id;

      // 2. Cargar Configuración de POS
      const configs = await client.searchRead('pos.config', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'current_session_id', 'current_session_state']
      ) || [];
      
      const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];
      const filteredConfigs = configs.filter((c: any) => 
        !blacklist.some(term => c.name.toUpperCase().includes(term))
      );
      setPosConfigs(filteredConfigs);

      // 3. Cargar Sesiones Abiertas
      const openSessions = await client.searchRead('pos.session', [
        ['state', '=', 'opened'],
        ['config_id', 'in', filteredConfigs.map(c => c.id)]
      ], ['id', 'name', 'user_id', 'start_at', 'config_id']) || [];
      setActiveSessions(openSessions);

      // 4. Cargar Almacenes
      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sanJoseId]], ['name', 'id', 'code', 'lot_stock_id']);
      setWarehouses(ws || []);
      
      const principal = (ws || []).find((w: any) => 
        w.code === 'PR' || w.code === 'PRINCIPAL1' || w.name.toUpperCase().includes('PRINCIPAL')
      );
      if (principal) {
        setOriginWarehouseId(principal.id);
        if (principal.lot_stock_id) setOriginLocationId(principal.lot_stock_id[0]);
      }

      // 5. Cargar Ventas
      const orders = await client.searchRead('pos.order', [
        ['company_id', '=', sanJoseId],
        ['date_order', '>=', `${dateRange.start} 00:00:00`],
        ['date_order', '<=', `${dateRange.end} 23:59:59`],
        ['state', 'in', ['paid', 'done', 'invoiced']]
      ], ['id', 'amount_total', 'config_id', 'session_id', 'lines', 'payment_ids']) || [];

      const orderIds = orders.map(o => o.id);
      let allLines: any[] = [];
      let allPayments: any[] = [];

      if (orderIds.length > 0) {
        allLines = await client.searchRead('pos.order.line', [['order_id', 'in', orderIds]], ['order_id', 'product_id', 'qty', 'price_subtotal_incl']) || [];
        allPayments = await client.searchRead('pos.payment', [['pos_order_id', 'in', orderIds]], ['pos_order_id', 'payment_method_id', 'amount']) || [];
      }

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const posOrders = orders.filter(o => o.config_id && o.config_id[0] === conf.id);
        const posOrderIds = posOrders.map(o => o.id);
        const posLines = allLines.filter(l => posOrderIds.includes(l.order_id[0]));
        const posPayments = allPayments.filter(p => posOrderIds.includes(p.pos_order_id[0]));
        const hasOpenSession = openSessions.some((s: any) => s.config_id && s.config_id[0] === conf.id);

        const productMap: Record<string, any> = {};
        posLines.forEach(l => {
          const pId = l.product_id[0];
          const pName = l.product_id[1];
          if (!productMap[pId]) productMap[pId] = { name: pName, qty: 0, total: 0 };
          productMap[pId].qty += l.qty;
          productMap[pId].total += l.price_subtotal_incl;
        });

        const paymentMap: Record<string, number> = {};
        posPayments.forEach(p => {
          const mName = p.payment_method_id[1];
          paymentMap[mName] = (paymentMap[mName] || 0) + p.amount;
        });

        stats[conf.id] = {
          isOnline: hasOpenSession, 
          rawState: hasOpenSession ? 'opened' : 'closed',
          totalSales: posOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0),
          count: posOrders.length,
          topProducts: Object.values(productMap).sort((a: any, b: any) => b.qty - a.qty).slice(0, 10),
          payments: paymentMap
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) { 
      setErrorLog(e.message);
      // Si el error es de autenticación grave, no cerrar sesión, solo avisar
      console.error("Fetch Error:", e.message);
    } finally { setLoading(false); }
  }, [client, view, dateRange, config]);

  useEffect(() => {
    if (view === 'app') fetchData();
  }, [view, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Credenciales maestras de Odoo inválidas.");
      
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name'], { limit: 1 });
      if (!user || !user.length) throw new Error("ID de Usuario no encontrado en San José.");
      
      const sessionData = { name: user[0].name };
      localStorage.setItem('sjs_ops_session', JSON.stringify(sessionData));
      setSession(sessionData);
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sjs_ops_session');
    setSession(null);
    setView('login');
  };

  const handleProductSearch = async (term: string) => {
    if (term.length < 3) return;
    setLoading(true);
    try {
      const results = await client.searchRead('product.product', [
        ['active', '=', true],
        '|', ['name', 'ilike', term], ['default_code', 'ilike', term]
      ], ['id', 'name', 'default_code', 'qty_available', 'list_price'], {
        context: originLocationId ? { location: originLocationId } : {},
        limit: 20
      });
      setProducts(results || []);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmitOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) return;
    setLoading(true);
    try {
      const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
      if (!targetWarehouse) throw new Error("Destino no válido.");
      const pickingTypeId = 5; 
      const pickingId = await client.create('stock.picking', {
        picking_type_id: pickingTypeId,
        location_id: originLocationId,
        location_dest_id: targetWarehouse.lot_stock_id?.[0],
        origin: `App Ops - ${session?.name}`,
        move_ids_without_package: cart.map(item => [0, 0, {
          name: item.name,
          product_id: item.id,
          product_uom_qty: item.qty,
          product_uom: 1,
          location_id: originLocationId,
          location_dest_id: targetWarehouse.lot_stock_id?.[0],
        }])
      });
      if (pickingId) {
        alert(`Transferencia #${pickingId} generada.`);
        setCart([]);
        setTargetWarehouseId(null);
      }
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  if (view === 'login') {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-odoo-bg">
         <div className="bg-white w-full max-w-[400px] shadow-2xl rounded-odoo-lg p-10 space-y-8 animate-fade">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-4xl font-black italic shadow-xl">SJ</div>
              <div className="text-center">
                <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Boticas San José</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operations Hub Login</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ID de Usuario</label>
                <div className="relative">
                   <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                   <input type="text" className="w-full o-input pl-10 py-3" placeholder="Ej: jherrera" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
                </div>
              </div>
              <button disabled={loading} className="w-full o-btn o-btn-primary py-4 text-xs font-black uppercase tracking-widest shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={20}/> : "Ingresar al Hub"}
              </button>
            </form>
            {errorLog && <div className="p-3 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 text-center font-bold uppercase">{errorLog}</div>}
         </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-odoo-bg overflow-hidden">
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 shadow-md z-[100]">
        <div className="flex items-center h-full">
          <button className="h-full px-3 hover:bg-black/10 transition-colors"><Grid size={20} /></button>
          <div className="h-4 w-px bg-white/20 mx-2"></div>
          <span className="text-sm font-black tracking-tight px-3 h-full flex items-center">SAN JOSÉ HUB</span>
        </div>
        <div className="flex items-center gap-2 h-full">
          <div className="flex items-center gap-2 px-3 h-full cursor-pointer hover:bg-black/10 transition-colors">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black">{session?.name?.[0]}</div>
            <span className="text-[11px] font-bold hidden sm:inline uppercase">{session?.name}</span>
          </div>
          <button onClick={handleLogout} className="h-full px-3 hover:bg-red-500 transition-colors" title="Cerrar Sistema"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-odoo-border hidden md:flex flex-col shrink-0 py-4 shadow-sm z-50">
          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
             <div className="px-6 mb-4 mt-2"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inteligencia</h3></div>
             <button onClick={() => setActiveTab('dashboard')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={18} /> Resumen Ventas</button>
             <button onClick={() => setActiveTab('sesiones')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'sesiones' ? 'active' : ''}`}><Clock size={18} /> Monitor Sesiones</button>
             <button onClick={() => setActiveTab('ventas')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'ventas' ? 'active' : ''}`}><TrendingUp size={18} /> Auditoría Puntos</button>
             
             <div className="px-6 mt-8 mb-4"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Control Temporal</h3></div>
             <div className="px-4 space-y-4">
                <div className="space-y-1 px-4"><label className="text-[10px] font-bold text-gray-400 uppercase">Desde</label><input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full o-input text-xs font-bold"/></div>
                <div className="space-y-1 px-4"><label className="text-[10px] font-bold text-gray-400 uppercase">Hasta</label><input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full o-input text-xs font-bold"/></div>
                <div className="px-4 pt-2">
                  <button onClick={fetchData} className="w-full o-btn o-btn-primary text-[10px] font-black gap-2 py-3 uppercase tracking-widest shadow-md">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Sincronizar Odoo
                  </button>
                </div>
             </div>

             <div className="px-6 mt-8 mb-4"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operaciones</h3></div>
             <button onClick={() => setActiveTab('pedidos')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'pedidos' ? 'active' : ''}`}><Truck size={18} /> Logística Interna</button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-odoo-bg animate-fade">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'sesiones' && <SessionModule activeSessions={activeSessions} loading={loading} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={(pos) => setPosSalesData((prev:any) => ({...prev, _selected: pos}))} selectedPos={posSalesData._selected} onCloseDetail={() => setPosSalesData((prev:any) => ({...prev, _selected: null}))} />}
          {activeTab === 'pedidos' && (
            <OrderModule 
              productSearch={productSearch} 
              setProductSearch={setProductSearch} 
              onSearch={handleProductSearch} 
              products={products} 
              cart={cart} 
              setCart={setCart} 
              warehouses={warehouses.filter(w => w.id !== originWarehouseId)} 
              targetWarehouseId={targetWarehouseId} 
              setTargetWarehouseId={setTargetWarehouseId} 
              onSubmitOrder={handleSubmitOrder} 
              loading={loading} 
            />
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white px-6 py-4 rounded-xl shadow-2xl border border-odoo-border flex items-center gap-4 animate-in slide-in-from-bottom">
          <div className="w-3 h-3 bg-odoo-primary rounded-full animate-ping"></div>
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Sincronizando con San José Odoo Core...</p>
        </div>
      )}
    </div>
  );
};

export default App;
