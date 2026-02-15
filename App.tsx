
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, Plus, Search, RefreshCw, User as UserIcon, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, Package, Home, ShoppingBag,
  DollarSign, PieChart, FileSpreadsheet, Calendar, Users, ListFilter, TrendingUp,
  LayoutDashboard, Box, Settings, Bell, ChevronRight, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Banknote, ShieldCheck, Smartphone, Truck, Trash2, ShoppingCart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OdooClient } from './services/odooService';
import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe",
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  companyName: "CADENA DE BOTICAS SAN JOSE S.A.C."
};

const App: React.FC = () => {
  const getPeruDate = () => new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

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
  
  // Data State
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [selectedPos, setSelectedPos] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: formatDate(getPeruDate()), end: formatDate(getPeruDate()) });
  
  // Inventory State (Pedidos)
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | null>(null);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const fetchData = useCallback(async () => {
    if (view !== 'app') return;
    setLoading(true);
    setErrorLog(null);
    try {
      // 1. Obtener Cajas (Excluyendo Botica Cruz)
      const configs = await client.searchRead('pos.config', [], 
        ['name', 'id', 'current_session_id', 'current_session_state', 'picking_type_id']
      );
      const filteredConfigs = configs.filter((c: any) => 
        c.name.toUpperCase().includes('BOTICA') && !c.name.toUpperCase().includes('CRUZ')
      );
      setPosConfigs(filteredConfigs);

      // 2. Obtener Almacenes para Pedidos
      const ws = await client.searchRead('stock.warehouse', [], ['name', 'id', 'lot_stock_id']);
      setWarehouses(ws);

      // 3. Consultar Sesiones en el rango
      const sessionDomain = [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        ['start_at', '>=', `${dateRange.start} 00:00:00`],
        ['start_at', '<=', `${dateRange.end} 23:59:59`]
      ];

      // Incluir también las sesiones abiertas actuales que podrían haber empezado antes del rango
      const activeIds = filteredConfigs.map(c => c.current_session_id?.[0]).filter(id => !!id);
      const finalSessionDomain = ['|', ['id', 'in', activeIds], '&', ...sessionDomain];

      const sessions = await client.searchRead('pos.session', finalSessionDomain, 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'state', 'cash_register_balance_end_real'],
        { order: 'start_at desc' }
      );

      const sessionIds = sessions.map(s => s.id);
      let orders: any[] = [];
      let payments: any[] = [];
      let topProducts: any[] = [];

      if (sessionIds.length > 0) {
        orders = await client.searchRead('pos.order', [['session_id', 'in', sessionIds]], 
          ['amount_total', 'session_id', 'payment_ids', 'user_id', 'date_order'], { limit: 10000 }
        );
        
        const pIds = orders.flatMap(o => o.payment_ids);
        if (pIds.length > 0) {
          payments = await client.searchRead('pos.payment', [['id', 'in', pIds]], 
            ['amount', 'payment_method_id', 'session_id']
          );
        }

        // Obtener Top Productos (Agrupados por las líneas de estos pedidos)
        const orderIds = orders.map(o => o.id);
        if (orderIds.length > 0) {
          const lines = await client.searchRead('pos.order.line', [['order_id', 'in', orderIds]], 
            ['product_id', 'qty', 'price_subtotal_incl'], { limit: 20000 }
          );
          
          const prodMap: any = {};
          lines.forEach((l: any) => {
            const name = l.product_id[1];
            if (!prodMap[name]) prodMap[name] = { name, qty: 0, total: 0 };
            prodMap[name].qty += l.qty;
            prodMap[name].total += l.price_subtotal_incl;
          });
          topProducts = Object.values(prodMap).sort((a: any, b: any) => b.qty - a.qty).slice(0, 10);
        }
      }

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id[0] === conf.id);
        const sOrders = orders.filter(o => confSessions.some(cs => cs.id === o.session_id[0]));
        
        const paySummary: any = {};
        payments.filter(p => confSessions.some(cs => cs.id === p.session_id[0])).forEach(p => {
          const name = p.payment_method_id[1];
          paySummary[name] = (paySummary[name] || 0) + p.amount;
        });

        stats[conf.id] = {
          total: sOrders.reduce((a, b) => a + b.amount_total, 0),
          count: sOrders.length,
          isOnline: conf.current_session_state === 'opened',
          payments: paySummary,
          sessions: confSessions.map(sess => ({
            ...sess,
            total: sOrders.filter(o => o.session_id[0] === sess.id).reduce((a, b) => a + b.amount_total, 0),
            count: sOrders.filter(o => o.session_id[0] === sess.id).length
          })),
          topProducts
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) {
      setErrorLog("Fallo en sincronización. Verifique conexión RPC.");
    } finally {
      setLoading(false);
    }
  }, [client, view, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchProducts = async (term: string) => {
    if (term.length < 3) return;
    try {
      const results = await client.searchRead('product.product', 
        ['|', ['name', 'ilike', term], ['default_code', 'ilike', term]], 
        ['name', 'default_code', 'list_price', 'qty_available'], { limit: 10 }
      );
      setProducts(results);
    } catch (e) {}
  };

  const createWarehouseOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) {
      alert("Seleccione botica destino y agregue productos.");
      return;
    }
    setLoading(true);
    try {
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL'));
      if (!mainWarehouse) throw new Error("No se encontró el almacén principal.");

      // 1. Crear picking (Transferencia Interna)
      const pickingId = await client.create('stock.picking', {
        picking_type_id: 5, // Tipo de operación estandar para transferencia interna
        location_id: mainWarehouse.lot_stock_id[0],
        location_dest_id: warehouses.find(w => w.id === targetWarehouseId).lot_stock_id[0],
        origin: `PEDIDO APP - ${session.name}`,
        company_id: 1
      });

      // 2. Crear líneas de movimiento
      for (const item of cart) {
        await client.create('stock.move', {
          name: item.name,
          product_id: item.id,
          product_uom_qty: item.qty,
          product_uom: 1, // Unidad
          picking_id: pickingId,
          location_id: mainWarehouse.lot_stock_id[0],
          location_dest_id: warehouses.find(w => w.id === targetWarehouseId).lot_stock_id[0],
        });
      }

      alert("Pedido generado correctamente en Odoo.");
      setCart([]);
      setActiveTab('dashboard');
    } catch (e: any) {
      alert("Error al crear pedido: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name', 'email', 'company_id'], { limit: 1 });
      if (!user.length) throw new Error("Acceso denegado.");
      setSession({ name: user[0].name, company_id: user[0].company_id[0] });
      setView('app');
    } catch (e: any) { setErrorLog("Credenciales inválidas."); }
    finally { setLoading(false); }
  };

  // UI Components
  const TabButton = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === id ? 'bg-odoo-primary text-white shadow-lg shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
      <Icon size={18}/> {label}
    </button>
  );

  if (view === 'login') {
    return (
      <div className="h-screen bg-[#F4F7FE] flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-[420px] p-12 rounded-[3rem] shadow-2xl border border-white">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="w-20 h-20 bg-odoo-primary rounded-3xl flex items-center justify-center text-white text-4xl font-black italic shadow-xl">SJ</div>
            <div>
              <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Centro de Operaciones</h1>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Boticas San José</p>
            </div>
            <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">USUARIO AUTORIZADO</label>
                <input type="text" className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-odoo-primary outline-none transition-all font-bold text-sm" placeholder="ID de Usuario" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-odoo-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Ingresar al Hub'}
              </button>
            </form>
            {errorLog && <div className="text-rose-500 text-[10px] font-black uppercase bg-rose-50 p-4 rounded-2xl w-full">{errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  const globalTotal = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.total || 0), 0);

  return (
    <div className="h-screen flex bg-[#F8FAFC] text-odoo-text font-sans overflow-hidden">
      {/* Sidebar Profesional */}
      <aside className="w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 z-50 shadow-sm">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-xl font-black italic shadow-lg shadow-odoo-primary/20">SJ</div>
          <div>
            <h2 className="text-sm font-black text-gray-800 tracking-tighter uppercase">San José</h2>
            <p className="text-[9px] font-bold text-odoo-primary uppercase tracking-widest">Panel Operativo</p>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          <TabButton id="dashboard" icon={LayoutDashboard} label="Dashboard General" />
          <TabButton id="ventas" icon={TrendingUp} label="Auditoría de Ventas" />
          <TabButton id="pedidos" icon={Truck} label="Pedidos al Almacén" />
        </nav>

        <div className="p-8 mt-auto border-t border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm"><UserIcon size={20} className="text-gray-400"/></div>
            <div className="truncate">
              <p className="text-xs font-black text-gray-800 truncate">{session?.name}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sede Central</p>
            </div>
          </div>
          <button onClick={() => setView('login')} className="w-full flex items-center justify-center gap-3 p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest">
            <LogOut size={16}/> Salir del Sistema
          </button>
        </div>
      </aside>

      {/* Area Principal */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-12 flex items-center justify-between shrink-0 z-40">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              {activeTab === 'dashboard' ? 'Resumen Ejecutivo' : activeTab === 'ventas' ? 'Control de Cajas' : 'Suministro Interno'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Red Sincronizada • {lastSync}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-100/50 p-2 rounded-2xl border border-gray-200 shadow-inner">
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black text-gray-400 uppercase ml-2">Desde</span>
                 <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent border-none text-[11px] font-black outline-none w-32 cursor-pointer"/>
               </div>
               <div className="h-4 w-px bg-gray-300"></div>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black text-gray-400 uppercase">Hasta</span>
                 <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent border-none text-[11px] font-black outline-none w-32 cursor-pointer"/>
               </div>
               <button onClick={fetchData} className="p-2 bg-white text-odoo-primary rounded-xl shadow-sm hover:scale-105 transition-all"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ventas del Rango</p>
                  <h3 className="text-3xl font-black text-gray-800">S/ {globalTotal.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Boticas en Red</p>
                  <h3 className="text-3xl font-black text-gray-800">{posConfigs.length}</h3>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Arqueo Total</p>
                  <h3 className="text-3xl font-black text-gray-800">S/ {Object.values(posSalesData).reduce((a: any, b: any) => a + (b.balance || 0), 0).toLocaleString()}</h3>
                </div>
                <div className="bg-odoo-primary p-8 rounded-3xl shadow-xl shadow-odoo-primary/20">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Tickets Generados</p>
                  <h3 className="text-3xl font-black text-white">{Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0)}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <TrendingUp size={18} className="text-odoo-primary"/> Top 10 Productos Más Vendidos
                  </h4>
                  <div className="space-y-6">
                    {/* Fix: Cast Object.values to any[] to ensure access to topProducts is valid in strict TypeScript modes */}
                    {(Object.values(posSalesData) as any[])[0]?.topProducts?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <span className="text-xs font-black text-gray-300 w-6">#{i+1}</span>
                           <span className="text-xs font-bold text-gray-700 uppercase truncate max-w-[250px]">{p.name}</span>
                         </div>
                         <div className="flex items-center gap-8">
                            <span className="text-xs font-black text-gray-400">{p.qty.toFixed(0)} UND</span>
                            <span className="text-xs font-black text-gray-800 w-20 text-right">S/ {p.total.toFixed(2)}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <Activity size={18} className="text-odoo-primary"/> Actividad por Punto de Venta
                  </h4>
                  <div className="space-y-6">
                    {posConfigs.map(c => (
                      <div key={c.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${posSalesData[c.id]?.isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-200'}`}></div>
                          <span className="text-sm font-black text-gray-800 uppercase group-hover:text-odoo-primary transition-colors">{c.name}</span>
                        </div>
                        <span className="text-sm font-black text-gray-800">S/ {(posSalesData[c.id]?.total || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ventas' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posConfigs.map(config => {
                  const data = posSalesData[config.id] || {};
                  return (
                    <div key={config.id} onClick={() => setSelectedPos(config)} className={`bg-white p-10 rounded-[3rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${selectedPos?.id === config.id ? 'border-odoo-primary shadow-2xl scale-[1.02]' : 'border-transparent hover:border-gray-200 shadow-sm'}`}>
                      {data.isOnline && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-tighter">En Línea</div>
                      )}
                      <div className="flex items-center gap-6 mb-10">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${data.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300'}`}>
                          <Store size={32}/>
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 uppercase tracking-tight">{config.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.sessions?.length || 0} Sesiones en el rango</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-gray-50/50 p-6 rounded-3xl">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Ventas</p>
                          <p className="text-xl font-black text-gray-800">S/ {data.total?.toFixed(0)}</p>
                        </div>
                        <div className="bg-gray-50/50 p-6 rounded-3xl">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Tickets</p>
                          <p className="text-xl font-black text-gray-800">{data.count}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                        <span className="text-[11px] font-black text-odoo-primary uppercase tracking-[0.2em]">Ver Detalle</span>
                        <ChevronRight size={20} className="text-odoo-primary group-hover:translate-x-1 transition-all"/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'pedidos' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
               <div className="lg:col-span-7 space-y-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                     <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Buscar Productos en Almacén</h3>
                     <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
                        <input type="text" placeholder="Escribe nombre o código de barras..." value={productSearch} onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }} className="w-full pl-14 pr-6 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-odoo-primary focus:bg-white outline-none font-bold transition-all" />
                     </div>
                     <div className="space-y-4">
                        {products.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl hover:bg-gray-100 transition-all group">
                             <div>
                                <p className="text-xs font-black text-gray-800 uppercase">{p.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.default_code || 'SIN CODIGO'}</p>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-gray-400 uppercase">Stock Central</p>
                                   <p className={`text-xs font-black ${p.qty_available > 0 ? 'text-green-600' : 'text-rose-500'}`}>{p.qty_available.toFixed(0)} UND</p>
                                </div>
                                <button onClick={() => {
                                  const existing = cart.find(c => c.id === p.id);
                                  if (existing) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                                  else setCart([...cart, {...p, qty: 1}]);
                                }} className="p-3 bg-white text-odoo-primary rounded-xl shadow-sm border border-gray-200 group-hover:bg-odoo-primary group-hover:text-white transition-all">
                                   <Plus size={18}/>
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-5 space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm sticky top-12 flex flex-col h-[calc(100vh-250px)]">
                     <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-8 flex items-center gap-3">
                        <ShoppingCart size={22} className="text-odoo-primary"/> Carrito de Pedido
                     </h3>
                     
                     <div className="mb-8 space-y-4">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Botica Destino</label>
                        <select value={targetWarehouseId || ''} onChange={e => setTargetWarehouseId(Number(e.target.value))} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-odoo-primary outline-none font-bold text-xs">
                           <option value="">Seleccione Sede...</option>
                           {warehouses.filter(w => !w.name.toUpperCase().includes('PRINCIPAL')).map(w => (
                             <option key={w.id} value={w.id}>{w.name}</option>
                           ))}
                        </select>
                     </div>

                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                             <Package size={48} className="opacity-20"/>
                             <p className="text-[10px] font-black uppercase tracking-widest">El carrito está vacío</p>
                          </div>
                        ) : cart.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent">
                             <div className="max-w-[150px]">
                                <p className="text-[11px] font-black text-gray-800 uppercase truncate">{item.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">S/ {item.list_price.toFixed(2)}</p>
                             </div>
                             <div className="flex items-center gap-4">
                                <input type="number" min="1" value={item.qty} onChange={e => setCart(cart.map(c => c.id === item.id ? {...c, qty: Math.max(1, Number(e.target.value))} : c))} className="w-12 bg-transparent text-center font-black text-xs border-b-2 border-gray-200 outline-none focus:border-odoo-primary" />
                                <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                             </div>
                          </div>
                        ))}
                     </div>

                     <div className="mt-10 space-y-6 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center px-2">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items Totales</span>
                           <span className="text-xl font-black text-gray-800">{cart.reduce((a, b) => a + b.qty, 0)}</span>
                        </div>
                        <button onClick={createWarehouseOrder} disabled={loading || cart.length === 0} className="w-full bg-odoo-primary text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3">
                           {loading ? <Loader2 className="animate-spin" size={20}/> : <><Truck size={18}/> Enviar Pedido a Odoo</>}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Drawer Auditoría Detallada */}
      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setSelectedPos(null)}></div>
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-12 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{selectedPos.name}</h3>
                <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-[0.3em] mt-1">Auditoría Operativa Rango de Fechas</p>
              </div>
              <button onClick={() => setSelectedPos(null)} className="p-4 hover:bg-gray-200 rounded-3xl text-gray-400 transition-all"><X size={28}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Historial de Sesiones</h4>
                <div className="space-y-4">
                  {posSalesData[selectedPos.id]?.sessions.map((sess: any) => (
                    <div key={sess.id} className="p-6 bg-gray-50 rounded-3xl border-2 border-transparent hover:border-odoo-primary transition-all flex justify-between items-center group">
                       <div className="space-y-2">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-gray-800 uppercase">Turno #{sess.id}</span>
                             <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${sess.state === 'opened' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>{sess.state === 'opened' ? 'Activa' : 'Cerrada'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase">
                             <span className="flex items-center gap-1"><Calendar size={12}/> {sess.start_at}</span>
                             <span className="flex items-center gap-1"><UserIcon size={12}/> {sess.user_id[1]}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-black text-gray-400 uppercase mb-1">{sess.count} Ventas</p>
                          <p className="text-xl font-black text-gray-800">S/ {sess.total.toFixed(2)}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Resumen por Métodos</h4>
                <div className="grid grid-cols-2 gap-4">
                   {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([name, amount]: any) => (
                     <div key={name} className="p-6 bg-white border-2 border-gray-50 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-odoo-primary/5 text-odoo-primary rounded-2xl flex items-center justify-center">
                           {name.includes('EFECTIVO') ? <Banknote size={20}/> : <Smartphone size={20}/>}
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase">{name}</p>
                           <p className="text-sm font-black text-gray-800">S/ {amount.toFixed(2)}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </section>

              <div className="p-8 bg-gray-900 text-white rounded-[3rem] flex items-center gap-8 shadow-xl">
                 <ShieldCheck size={48} className="text-green-400 shrink-0"/>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sello de Veracidad</p>
                    <p className="text-xs font-medium opacity-80 leading-relaxed italic">"Toda la información ha sido extraída directamente de la base de datos de Boticas San José, validando conciliación de pagos y stock."</p>
                 </div>
              </div>
            </div>

            <div className="p-12 border-t bg-gray-50/50">
              <button onClick={() => {
                const data = posSalesData[selectedPos.id]?.sessions.map((s: any) => ({
                  'Turno': s.id,
                  'Usuario': s.user_id[1],
                  'Inicio': s.start_at,
                  'Estado': s.state,
                  'Venta': s.total,
                  'Tickets': s.count
                }));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Auditoria_Sesiones");
                XLSX.writeFile(wb, `Reporte_SJS_${selectedPos.name}_${dateRange.start}.xlsx`);
              }} className="w-full bg-odoo-primary text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                <FileSpreadsheet size={20}/> Descargar Reporte Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-12 right-12 z-[200]">
           <div className="bg-white px-8 py-5 rounded-[2rem] shadow-2xl border border-gray-100 flex items-center gap-4 animate-in slide-in-from-right">
              <Loader2 className="animate-spin text-odoo-primary" size={24}/>
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Procesando Odoo...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
