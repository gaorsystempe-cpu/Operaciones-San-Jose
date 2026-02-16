
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar, DollarSign, 
  Settings, Grid, Bell, HelpCircle, Package, Store, Clock, UserCheck,
  ExternalLink, ChevronRight, Menu, X, ShieldCheck, Zap
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

const ADMIN_EMAILS = ['soporte@facturaclic.pe', 'admin1@sanjose.pe'];

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

  const isAdmin = useMemo(() => {
    if (!session || !session.login) return false;
    return ADMIN_EMAILS.includes(session.login.toLowerCase());
  }, [session]);

  const [view, setView] = useState<'login' | 'app'>(session ? 'app' : 'login');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (session) {
      const isUserAdmin = ADMIN_EMAILS.includes(session.login?.toLowerCase());
      setActiveTab(isUserAdmin ? 'dashboard' : 'pedidos');
    }
  }, [session]);

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
      if (!client.isAuthenticated()) {
        const uid = await client.authenticate(config.user, config.apiKey);
        if (!uid) throw new Error("Sesión expirada.");
      }

      const companies = await client.searchRead('res.company', [['name', 'ilike', 'SAN JOSE']], ['id']);
      if (!companies || !companies.length) throw new Error("Compañía no encontrada.");
      const sanJoseId = companies[0].id;

      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sanJoseId]], ['name', 'id', 'code', 'lot_stock_id']);
      setWarehouses(ws || []);
      
      const principal = (ws || []).find((w: any) => 
        w.code === 'PR' || w.code === 'PRINCIPAL1' || w.name.toUpperCase().includes('PRINCIPAL')
      );
      if (principal) {
        setOriginWarehouseId(principal.id);
        if (principal.lot_stock_id) setOriginLocationId(principal.lot_stock_id[0]);
      }

      if (isAdmin) {
        const configs = await client.searchRead('pos.config', [['company_id', '=', sanJoseId]], ['name', 'id']) || [];
        const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];
        const filteredConfigs = configs.filter((c: any) => !blacklist.some(term => c.name.toUpperCase().includes(term)));
        setPosConfigs(filteredConfigs);

        const openSessions = await client.searchRead('pos.session', [['state', '=', 'opened'], ['config_id', 'in', filteredConfigs.map(c => c.id)]], ['id', 'name', 'user_id', 'start_at', 'config_id']) || [];
        setActiveSessions(openSessions);

        const orders = await client.searchRead('pos.order', [['company_id', '=', sanJoseId], ['date_order', '>=', `${dateRange.start} 00:00:00`], ['date_order', '<=', `${dateRange.end} 23:59:59`], ['state', 'in', ['paid', 'done', 'invoiced']]], ['id', 'amount_total', 'config_id', 'session_id', 'lines', 'payment_ids']) || [];
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
            if (!productMap[pId]) productMap[pId] = { name: l.product_id[1], qty: 0, total: 0 };
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
            totalSales: posOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0),
            count: posOrders.length,
            topProducts: Object.values(productMap).sort((a: any, b: any) => b.qty - a.qty).slice(0, 10),
            payments: paymentMap
          };
        });
        setPosSalesData(stats);
      }
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  }, [client, view, dateRange, config, isAdmin]);

  useEffect(() => { if (view === 'app') fetchData(); }, [view, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Credenciales maestros inválidas.");
      const user = await client.searchRead('res.users', [['login', '=', loginInput.trim()]], ['name', 'login'], { limit: 1 });
      if (!user || !user.length) throw new Error("ID de Usuario no encontrado.");
      
      const sessionData = { name: user[0].name, login: user[0].login };
      localStorage.setItem('sjs_ops_session', JSON.stringify(sessionData));
      setSession(sessionData);
      setView('app');
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
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
      const results = await client.searchRead('product.product', [['active', '=', true], '|', ['name', 'ilike', term], ['default_code', 'ilike', term]], ['id', 'name', 'default_code', 'qty_available', 'list_price'], { context: originLocationId ? { location: originLocationId } : {}, limit: 20 });
      setProducts(results || []);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmitOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) return;
    setLoading(true);
    try {
      const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
      if (!targetWarehouse) throw new Error("Destino no válido.");
      const pickingId = await client.create('stock.picking', {
        picking_type_id: 5,
        location_id: originLocationId,
        location_dest_id: targetWarehouse.lot_stock_id?.[0],
        origin: `App Ops - ${session?.name}`,
        move_ids_without_package: cart.map(item => [0, 0, { name: item.name, product_id: item.id, product_uom_qty: item.qty, product_uom: 1, location_id: originLocationId, location_dest_id: targetWarehouse.lot_stock_id?.[0] }])
      });
      if (pickingId) { alert(`Pedido #${pickingId} enviado.`); setCart([]); setTargetWarehouseId(null); }
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#f8fafc] overflow-hidden font-sans">
        {/* Patrón de fondo "Engineer Grid" */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#714B67 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        {/* Decoraciones suaves */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-odoo-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[100px]"></div>

        <div className="w-full max-w-[420px] z-10 animate-fade space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-white rounded-[32px] shadow-[0_20px_50px_-12px_rgba(113,75,103,0.15)] mb-4 animate-bounce-slow border border-odoo-primary/5">
               <div className="w-16 h-16 bg-gradient-to-br from-odoo-primary to-[#8b5e7e] rounded-2xl flex items-center justify-center text-white text-3xl font-black italic shadow-inner">SJ</div>
            </div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">San José <span className="text-odoo-primary">Hub</span></h1>
            <div className="flex items-center justify-center gap-2">
               <div className="h-px w-8 bg-slate-200"></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Operations Core 2026</p>
               <div className="h-px w-8 bg-slate-200"></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[40px] border border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-odoo-primary/20 to-transparent"></div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Autenticación Odoo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-odoo-primary transition-colors" size={18}/>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-700 text-sm outline-none focus:bg-white focus:border-odoo-primary/30 focus:ring-4 focus:ring-odoo-primary/5 transition-all placeholder:text-slate-300 font-medium" 
                    placeholder="ej: admin1@sanjose.pe" 
                    value={loginInput} 
                    onChange={e => setLoginInput(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              
              <button disabled={loading} className="w-full bg-odoo-primary hover:bg-[#5e3e55] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-odoo-primary/10 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <>Acceder al Sistema <ChevronRight size={18}/></>}
              </button>
            </form>

            {errorLog && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-wide text-center">
                <AlertTriangle size={16} className="shrink-0"/> {errorLog}
              </div>
            )}
          </div>

          <div className="text-center pt-4">
             <a href="https://gaorsystem.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-1 group">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] group-hover:text-odoo-primary transition-colors">Powered by</span>
               <span className="text-xs font-black text-slate-400 group-hover:text-slate-600 transition-colors uppercase italic">garosystemperu 2026</span>
             </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
      <header className="h-14 bg-white text-slate-800 flex items-center justify-between px-6 shrink-0 z-[100] border-b border-slate-200">
        <div className="flex items-center h-full">
          <div className="w-9 h-9 bg-odoo-primary rounded-xl flex items-center justify-center text-white text-[10px] font-black italic mr-3 shadow-lg shadow-odoo-primary/20">SJ</div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-slate-800 leading-none">SAN JOSÉ HUB</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Core Operations</span>
          </div>
          <div className="h-4 w-px bg-slate-200 mx-4"></div>
          <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isAdmin ? 'Privilegios Admin' : 'Acceso Estándar'}
          </div>
        </div>
        <div className="flex items-center gap-3 h-full">
           <div className="text-right mr-2 hidden sm:block">
              <p className="text-[10px] font-black uppercase text-slate-700 leading-none">{session?.name}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Activo Ahora</p>
              </div>
           </div>
           <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all border border-slate-100"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Desktop - Ultra Clean */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 py-8 z-50">
          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar px-4">
             {isAdmin && (
               <>
                 <div className="px-4 mb-4"><h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Monitoreo BI</h3></div>
                 <button onClick={() => setActiveTab('dashboard')} className={`o-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={18} /> Resumen Ejecutivo</button>
                 <button onClick={() => setActiveTab('sesiones')} className={`o-sidebar-item ${activeTab === 'sesiones' ? 'active' : ''}`}><Clock size={18} /> Control Sesiones</button>
                 <button onClick={() => setActiveTab('ventas')} className={`o-sidebar-item ${activeTab === 'ventas' ? 'active' : ''}`}><TrendingUp size={18} /> Auditoría Puntos</button>
                 
                 <div className="px-4 mt-8 mb-4"><h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Parámetros</h3></div>
                 <div className="px-4 space-y-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold text-slate-600 outline-none focus:border-odoo-primary/30"/>
                      </div>
                      <div className="relative">
                        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold text-slate-600 outline-none focus:border-odoo-primary/30"/>
                      </div>
                    </div>
                    <button onClick={fetchData} className="w-full bg-slate-900 text-white text-[10px] font-black gap-2 py-3 rounded-xl uppercase tracking-[0.1em] hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center justify-center">
                       <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Sincronizar Odoo
                    </button>
                 </div>
               </>
             )}

             <div className="px-4 mt-8 mb-4"><h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Operativo</h3></div>
             <button onClick={() => setActiveTab('pedidos')} className={`o-sidebar-item ${activeTab === 'pedidos' ? 'active' : ''}`}><Truck size={18} /> Logística Interna</button>
          </div>
          <div className="px-8 py-6 border-t border-slate-50">
             <div className="flex flex-col items-center gap-1 opacity-40 grayscale hover:grayscale-0 transition-all">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Build 2026.4</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter italic">Garo System</p>
             </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation - Minimalist Light */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-slate-200 flex items-center justify-around z-[200] px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] rounded-t-[24px]">
           {isAdmin ? (
             <>
               <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-odoo-primary scale-110' : 'text-slate-300'}`}>
                 <LayoutDashboard size={22} strokeWidth={activeTab === 'dashboard' ? 3 : 2}/><span className="text-[8px] font-black uppercase tracking-widest">BI</span>
               </button>
               <button onClick={() => setActiveTab('sesiones')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'sesiones' ? 'text-odoo-primary scale-110' : 'text-slate-300'}`}>
                 <Clock size={22} strokeWidth={activeTab === 'sesiones' ? 3 : 2}/><span className="text-[8px] font-black uppercase tracking-widest">Sesion</span>
               </button>
               <button onClick={() => setActiveTab('ventas')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ventas' ? 'text-odoo-primary scale-110' : 'text-slate-300'}`}>
                 <TrendingUp size={22} strokeWidth={activeTab === 'ventas' ? 3 : 2}/><span className="text-[8px] font-black uppercase tracking-widest">Audit</span>
               </button>
             </>
           ) : null}
           <button onClick={() => setActiveTab('pedidos')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'pedidos' ? 'text-odoo-primary scale-110' : 'text-slate-300'}`}>
             <Truck size={22} strokeWidth={activeTab === 'pedidos' ? 3 : 2}/><span className="text-[8px] font-black uppercase tracking-widest">Envios</span>
           </button>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-slate-50 pb-24 md:pb-10">
          {activeTab === 'dashboard' && isAdmin && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'sesiones' && isAdmin && <SessionModule activeSessions={activeSessions} loading={loading} />}
          {activeTab === 'ventas' && isAdmin && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={(pos) => setPosSalesData((prev:any) => ({...prev, _selected: pos}))} selectedPos={posSalesData._selected} onCloseDetail={() => setPosSalesData((prev:any) => ({...prev, _selected: null}))} />}
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
          {!isAdmin && activeTab !== 'pedidos' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-80 animate-fade">
               <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                  <AlertTriangle size={40} />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-800 uppercase">Sección Restringida</h3>
                 <p className="text-sm font-medium text-slate-400">Su perfil solo permite realizar pedidos logísticos.</p>
               </div>
               <button onClick={() => setActiveTab('pedidos')} className="o-btn o-btn-primary px-10 py-4 rounded-2xl shadow-xl shadow-odoo-primary/20 uppercase tracking-widest text-xs font-black">Abrir Logística</button>
            </div>
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-white border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-top duration-300">
          <Loader2 size={18} className="text-odoo-primary animate-spin" />
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Procesando con Odoo...</p>
        </div>
      )}
    </div>
  );
};

export default App;
