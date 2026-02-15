
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, Plus, Search, RefreshCw, User as UserIcon, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, Package, Home, ShoppingBag,
  DollarSign, PieChart, FileSpreadsheet, Calendar, Users, ListFilter, TrendingUp,
  LayoutDashboard, Box, Settings, Bell, ChevronRight, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Banknote, ShieldCheck, Smartphone, Truck, Trash2, ShoppingCart,
  Clock, CheckCircle2, AlertCircle
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
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  // Función para obtener el estado de los pedidos realizados
  const fetchMyOrders = useCallback(async () => {
    if (!session?.name) return;
    try {
      const orders = await client.searchRead('stock.picking', 
        [['origin', 'ilike', `PEDIDO APP - ${session.name}`]], 
        ['name', 'state', 'date_done', 'location_dest_id', 'origin', 'scheduled_date'],
        { order: 'id desc', limit: 10 }
      );
      setMyOrders(orders);
    } catch (e) {
      console.error("Error al obtener historial de pedidos", e);
    }
  }, [client, session]);

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
          ['amount_total', 'session_id', 'payment_ids', 'user_id', 'date_order'], { limit: 5000 }
        );
        
        const pIds = orders.flatMap(o => o.payment_ids);
        if (pIds.length > 0) {
          payments = await client.searchRead('pos.payment', [['id', 'in', pIds]], 
            ['amount', 'payment_method_id', 'session_id']
          );
        }

        const orderIds = orders.map(o => o.id);
        if (orderIds.length > 0) {
          const lines = await client.searchRead('pos.order.line', [['order_id', 'in', orderIds]], 
            ['product_id', 'qty', 'price_subtotal_incl'], { limit: 10000 }
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
      fetchMyOrders();
    } catch (e: any) {
      setErrorLog("Fallo en sincronización central.");
    } finally {
      setLoading(false);
    }
  }, [client, view, dateRange, fetchMyOrders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Búsqueda de productos filtrada por STOCK > 0 en ALMACEN PRINCIPAL
  const searchProducts = async (term: string) => {
    if (term.length < 2) return;
    try {
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL1') || w.name.toUpperCase().includes('PRINCIPAL'));
      const domain: any[] = [
        '|', ['name', 'ilike', term], ['default_code', 'ilike', term],
        ['qty_available', '>', 0] // Solo productos con stock disponible
      ];
      
      const results = await client.searchRead('product.product', 
        domain, 
        ['name', 'default_code', 'list_price', 'qty_available'], { limit: 12 }
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
      // 1. Identificar Almacén Principal 1 como origen
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL1') || w.name.toUpperCase().includes('PRINCIPAL'));
      if (!mainWarehouse) throw new Error("No se encontró el Almacén Principal 1.");

      const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
      
      // 2. Obtener el picking_type_id correcto para transferencias internas
      const pickingTypes = await client.searchRead('stock.picking.type', 
        [['code', '=', 'internal'], ['warehouse_id', '=', mainWarehouse.id]], 
        ['id', 'name']
      );
      const pickingType = pickingTypes[0] || { id: 5 }; // Fallback a 5 si no se encuentra el ID dinámico

      // 3. Crear cabecera del pedido (stock.picking)
      const pickingId = await client.create('stock.picking', {
        picking_type_id: pickingType.id,
        location_id: mainWarehouse.lot_stock_id[0],
        location_dest_id: targetWarehouse.lot_stock_id[0],
        origin: `PEDIDO APP - ${session.name}`,
        company_id: 1,
        move_type: 'direct',
        scheduled_date: new Date().toISOString().replace('Z', '')
      });

      // 4. Crear líneas de movimiento (stock.move)
      for (const item of cart) {
        await client.create('stock.move', {
          name: item.name,
          product_id: item.id,
          product_uom_qty: item.qty,
          product_uom: 1,
          picking_id: pickingId,
          location_id: mainWarehouse.lot_stock_id[0],
          location_dest_id: targetWarehouse.lot_stock_id[0],
          state: 'draft',
          company_id: 1
        });
      }

      // 5. Confirmar y asignar (Lógica interna de Odoo v18 para habilitar en "Transferencias Internas")
      // Nota: A través de RPC ejecutamos la acción de confirmar el picking
      await client.rpcCall('object', 'execute_kw', [
        config.db, (client as any).uid, config.apiKey,
        'stock.picking', 'action_confirm', [[pickingId]]
      ]);

      alert("Pedido SJS generado con éxito. Se encuentra en Transferencias Internas del Almacén Principal.");
      setCart([]);
      fetchMyOrders();
    } catch (e: any) {
      alert("Error crítico al procesar pedido: " + e.message);
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
    } catch (e: any) { setErrorLog("ID de usuario no válido."); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (state: string) => {
    switch(state) {
      case 'draft': return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[8px] font-black uppercase">Borrador</span>;
      case 'waiting': return <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[8px] font-black uppercase">Esperando</span>;
      case 'confirmed': return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase">Confirmado</span>;
      case 'assigned': return <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[8px] font-black uppercase">Reservado</span>;
      case 'done': return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase">Finalizado</span>;
      case 'cancel': return <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[8px] font-black uppercase">Cancelado</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[8px] font-black uppercase">{state}</span>;
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen bg-[#F4F7FE] flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-[420px] p-12 rounded-[3.5rem] shadow-2xl border border-white">
          <div className="flex flex-col items-center gap-10 text-center">
            <div className="w-24 h-24 bg-odoo-primary rounded-[2rem] flex items-center justify-center text-white text-5xl font-black italic shadow-2xl shadow-odoo-primary/20 transition-transform hover:scale-105">SJ</div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">SJS Hub</h1>
              <p className="text-gray-400 text-[11px] font-bold uppercase tracking-[0.3em]">Operaciones San José</p>
            </div>
            <form onSubmit={handleLogin} className="w-full space-y-8">
              <div className="space-y-3 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID DE EMPLEADO</label>
                <input type="text" className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-3xl focus:bg-white focus:border-odoo-primary outline-none transition-all font-bold text-base shadow-sm" placeholder="Ingrese su Usuario" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-odoo-primary text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-odoo-primary/30 hover:translate-y-[-2px] active:translate-y-[1px] transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" size={24}/> : 'Ingresar al Centro de Operaciones'}
              </button>
            </form>
            {errorLog && <div className="text-rose-500 text-[10px] font-black uppercase bg-rose-50 p-5 rounded-3xl w-full border border-rose-100">{errorLog}</div>}
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
        <div className="p-12 flex items-center gap-5">
          <div className="w-14 h-14 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-2xl font-black italic shadow-xl shadow-odoo-primary/20">SJ</div>
          <div>
            <h2 className="text-base font-black text-gray-800 tracking-tighter uppercase">San José</h2>
            <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-widest">Panel Operativo</p>
          </div>
        </div>
        
        <nav className="flex-1 px-8 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary text-white shadow-xl shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20}/> Dashboard
          </button>
          <button onClick={() => setActiveTab('ventas')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'ventas' ? 'bg-odoo-primary text-white shadow-xl shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <TrendingUp size={20}/> Auditoría Red
          </button>
          <button onClick={() => setActiveTab('pedidos')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'pedidos' ? 'bg-odoo-primary text-white shadow-xl shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Truck size={20}/> Suministro Interno
          </button>
        </nav>

        <div className="p-10 mt-auto border-t border-gray-50 bg-gray-50/20">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center border border-gray-100 shadow-sm"><UserIcon size={24} className="text-gray-400"/></div>
            <div className="truncate">
              <p className="text-sm font-black text-gray-800 truncate">{session?.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal Autorizado</p>
            </div>
          </div>
          <button onClick={() => setView('login')} className="w-full flex items-center justify-center gap-4 p-5 text-rose-500 hover:bg-rose-50 rounded-3xl transition-all text-[11px] font-black uppercase tracking-[0.2em] border border-transparent hover:border-rose-100">
            <LogOut size={18}/> Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-28 bg-white/80 backdrop-blur-2xl border-b border-gray-100 px-16 flex items-center justify-between shrink-0 z-40">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
              {activeTab === 'dashboard' ? 'Control de Gestión' : activeTab === 'ventas' ? 'Auditoría de Boticas' : 'Gestión de Suministro'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Centro de Datos Online • {lastSync}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 bg-gray-100/60 p-3 rounded-3xl border border-gray-200 shadow-inner">
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-gray-400 uppercase ml-3">Desde</span>
                 <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent border-none text-xs font-black outline-none w-36 cursor-pointer"/>
               </div>
               <div className="h-6 w-px bg-gray-300/50"></div>
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-gray-400 uppercase">Hasta</span>
                 <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent border-none text-xs font-black outline-none w-36 cursor-pointer"/>
               </div>
               <button onClick={fetchData} className="p-3 bg-white text-odoo-primary rounded-2xl shadow-sm hover:scale-105 active:scale-95 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-16 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ventas Rango</p>
                  <h3 className="text-4xl font-black text-gray-900">S/ {globalTotal.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Red Operativa</p>
                  <h3 className="text-4xl font-black text-gray-900">{posConfigs.length} <span className="text-lg text-gray-300">Boticas</span></h3>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Balance Caja</p>
                  <h3 className="text-4xl font-black text-gray-900">S/ {Object.values(posSalesData).reduce((a: any, b: any) => a + (b.balance || 0), 0).toLocaleString()}</h3>
                </div>
                <div className="bg-odoo-primary p-10 rounded-[2.5rem] shadow-2xl shadow-odoo-primary/30">
                  <p className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em] mb-4">Tickets Hoy</p>
                  <h3 className="text-4xl font-black text-white">{Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0)}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="bg-white rounded-[3.5rem] border border-gray-100 p-12 shadow-sm">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                    <TrendingUp size={22} className="text-odoo-primary"/> Desempeño por Categoría
                  </h4>
                  <div className="space-y-8">
                    {(Object.values(posSalesData) as any[])[0]?.topProducts?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between group">
                         <div className="flex items-center gap-6">
                           <span className="text-xs font-black text-gray-200 w-8">#{i+1}</span>
                           <span className="text-xs font-bold text-gray-700 uppercase truncate max-w-[280px] group-hover:text-odoo-primary transition-colors">{p.name}</span>
                         </div>
                         <div className="flex items-center gap-10">
                            <span className="text-xs font-black text-gray-400">{p.qty.toFixed(0)} <span className="text-[10px]">UND</span></span>
                            <span className="text-sm font-black text-gray-900 w-24 text-right">S/ {p.total.toLocaleString()}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[3.5rem] border border-gray-100 p-12 shadow-sm">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                    <Activity size={22} className="text-odoo-primary"/> Mapa de Calor Operativo
                  </h4>
                  <div className="space-y-8">
                    {posConfigs.map(c => (
                      <div key={c.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`w-3 h-3 rounded-full ${posSalesData[c.id]?.isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-200'}`}></div>
                             <span className="text-sm font-black text-gray-800 uppercase tracking-tighter">{c.name}</span>
                          </div>
                          <span className="text-sm font-black text-gray-900">S/ {(posSalesData[c.id]?.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                           <div className="h-full bg-odoo-primary rounded-full transition-all duration-1000" style={{width: `${Math.min(100, (posSalesData[c.id]?.total / 3000) * 100)}%`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ventas' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
              {posConfigs.map(config => {
                const data = posSalesData[config.id] || {};
                return (
                  <div key={config.id} onClick={() => setSelectedPos(config)} className={`bg-white p-12 rounded-[3.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${selectedPos?.id === config.id ? 'border-odoo-primary shadow-2xl scale-[1.02]' : 'border-transparent hover:border-gray-200 shadow-sm'}`}>
                    {data.isOnline && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black px-8 py-3 rounded-bl-[2rem] uppercase tracking-widest">En Línea</div>
                    )}
                    <div className="flex items-center gap-8 mb-12">
                      <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${data.isOnline ? 'bg-green-50 text-green-600 group-hover:bg-green-100' : 'bg-gray-50 text-gray-300'}`}>
                        <Store size={40}/>
                      </div>
                      <div className="truncate">
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight truncate">{config.name}</h4>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">{data.sessions?.length || 0} Turnos registrados</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-12">
                      <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Ventas</p>
                        <p className="text-2xl font-black text-gray-900">S/ {data.total?.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Tickets</p>
                        <p className="text-2xl font-black text-gray-900">{data.count}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-8 border-t border-gray-50">
                      <span className="text-[11px] font-black text-odoo-primary uppercase tracking-[0.3em]">Auditar Sede</span>
                      <div className="w-10 h-10 bg-odoo-primary/5 rounded-xl flex items-center justify-center text-odoo-primary group-hover:bg-odoo-primary group-hover:text-white transition-all">
                        <ChevronRight size={24}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'pedidos' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in duration-700">
               {/* LADO IZQUIERDO: BÚSQUEDA (CON STOCK) */}
               <div className="lg:col-span-7 space-y-12">
                  <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm space-y-10">
                     <div className="space-y-4">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Suministro de Red</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Fuente: Almacén Principal 1</p>
                     </div>
                     
                     <div className="relative group">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-odoo-primary transition-colors" size={24}/>
                        <input type="text" placeholder="Buscar por Nombre o Código..." value={productSearch} onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }} className="w-full pl-16 pr-8 py-7 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-odoo-primary focus:bg-white outline-none font-bold text-lg transition-all shadow-inner" />
                     </div>

                     <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        {products.length === 0 && productSearch.length > 0 ? (
                           <div className="p-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">No hay stock disponible para este término</div>
                        ) : products.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-7 bg-gray-50/50 rounded-3xl hover:bg-white hover:shadow-xl hover:border-gray-100 border-2 border-transparent transition-all group">
                             <div className="space-y-1">
                                <p className="text-sm font-black text-gray-800 uppercase leading-tight">{p.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.default_code || 'SJS-CODE'}</p>
                             </div>
                             <div className="flex items-center gap-8">
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Disponible</p>
                                   <p className="text-base font-black text-green-600">{p.qty_available.toFixed(0)} <span className="text-[10px]">UND</span></p>
                                </div>
                                <button onClick={() => {
                                  const existing = cart.find(c => c.id === p.id);
                                  if (existing) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                                  else setCart([...cart, {...p, qty: 1}]);
                                }} className="w-14 h-14 bg-white text-odoo-primary rounded-2xl shadow-sm border border-gray-100 hover:bg-odoo-primary hover:text-white transition-all flex items-center justify-center">
                                   <Plus size={24}/>
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* HISTORIAL DE PEDIDOS */}
                  <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm space-y-8">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-4">
                           <Clock size={22} className="text-odoo-primary"/> Mis Pedidos Recientes
                        </h3>
                        <button onClick={fetchMyOrders} className="p-2 text-gray-400 hover:text-odoo-primary transition-all"><RefreshCw size={18}/></button>
                     </div>
                     <div className="space-y-4">
                        {myOrders.length === 0 ? (
                           <p className="text-[10px] font-bold text-gray-300 uppercase py-10 text-center">No has realizado pedidos recientemente</p>
                        ) : myOrders.map(o => (
                           <div key={o.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-transparent">
                              <div className="space-y-1">
                                 <p className="text-xs font-black text-gray-800">{o.name}</p>
                                 <p className="text-[9px] font-bold text-gray-400 uppercase">{o.location_dest_id[1]}</p>
                              </div>
                              <div className="flex items-center gap-6">
                                 <div className="text-right">
                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{o.scheduled_date}</p>
                                    {getStatusBadge(o.state)}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* LADO DERECHO: CARRITO */}
               <div className="lg:col-span-5 space-y-10">
                  <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm sticky top-16 flex flex-col h-[calc(100vh-250px)]">
                     <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-10 flex items-center gap-5">
                        <ShoppingCart size={28} className="text-odoo-primary"/> Carrito de Abastecimiento
                     </h3>
                     
                     <div className="mb-10 space-y-5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Destino del Suministro</label>
                        <select value={targetWarehouseId || ''} onChange={e => setTargetWarehouseId(Number(e.target.value))} className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-3xl focus:border-odoo-primary outline-none font-bold text-sm shadow-inner cursor-pointer">
                           <option value="">Seleccione Botica...</option>
                           {warehouses.filter(w => !w.name.toUpperCase().includes('PRINCIPAL')).map(w => (
                             <option key={w.id} value={w.id}>{w.name}</option>
                           ))}
                        </select>
                     </div>

                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-5">
                        {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-200 gap-6 opacity-40">
                             <Package size={64}/>
                             <p className="text-[11px] font-black uppercase tracking-[0.3em]">Carrito Vacío</p>
                          </div>
                        ) : cart.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-100 transition-all">
                             <div className="max-w-[180px]">
                                <p className="text-xs font-black text-gray-800 uppercase truncate">{item.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">Stock: {item.qty_available.toFixed(0)} UND</p>
                             </div>
                             <div className="flex items-center gap-5">
                                <input type="number" min="1" value={item.qty} onChange={e => setCart(cart.map(c => c.id === item.id ? {...c, qty: Math.max(1, Number(e.target.value))} : c))} className="w-14 bg-transparent text-center font-black text-sm border-b-2 border-gray-200 outline-none focus:border-odoo-primary" />
                                <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                             </div>
                          </div>
                        ))}
                     </div>

                     <div className="mt-12 space-y-8 pt-8 border-t border-gray-100">
                        <div className="flex justify-between items-center px-4">
                           <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Volumen Total</span>
                           <span className="text-3xl font-black text-gray-900">{cart.reduce((a, b) => a + b.qty, 0)} <span className="text-sm text-gray-300">UND</span></span>
                        </div>
                        <button onClick={createWarehouseOrder} disabled={loading || cart.length === 0} className="w-full bg-odoo-primary text-white py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-odoo-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                           {loading ? <Loader2 className="animate-spin" size={24}/> : <><Truck size={24}/> Procesar en Odoo</>}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" onClick={() => setSelectedPos(null)}></div>
          <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-700 flex flex-col">
            <div className="p-16 border-b flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedPos.name}</h3>
                <p className="text-[11px] font-bold text-odoo-primary uppercase tracking-[0.4em] mt-2">Auditoría Operativa Centralizada</p>
              </div>
              <button onClick={() => setSelectedPos(null)} className="p-5 hover:bg-gray-200 rounded-[2rem] text-gray-400 transition-all"><X size={32}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-16 space-y-16 custom-scrollbar">
              <section className="space-y-8">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Control de Turnos / Sesiones</h4>
                <div className="space-y-6">
                  {posSalesData[selectedPos.id]?.sessions.map((sess: any) => (
                    <div key={sess.id} className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-odoo-primary transition-all flex justify-between items-center group">
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <span className="text-sm font-black text-gray-900 uppercase">Turno #{sess.id}</span>
                             <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase ${sess.state === 'opened' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>{sess.state === 'opened' ? 'En Servicio' : 'Liquidado'}</span>
                          </div>
                          <div className="flex flex-col gap-2 text-[11px] text-gray-400 font-bold uppercase">
                             <span className="flex items-center gap-2"><Calendar size={14}/> {sess.start_at}</span>
                             <span className="flex items-center gap-2"><UserIcon size={14}/> Cajero: {sess.user_id[1]}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">{sess.count} Tickets</p>
                          <p className="text-2xl font-black text-gray-900">S/ {sess.total.toLocaleString()}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-8">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Conciliación de Pagos</h4>
                <div className="grid grid-cols-2 gap-6">
                   {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([name, amount]: any) => (
                     <div key={name} className="p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
                        <div className="w-16 h-16 bg-odoo-primary/5 text-odoo-primary rounded-3xl flex items-center justify-center">
                           {name.includes('EFECTIVO') ? <Banknote size={28}/> : <Smartphone size={28}/>}
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{name}</p>
                           <p className="text-lg font-black text-gray-900">S/ {amount.toLocaleString()}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </section>

              <div className="p-10 bg-gray-950 text-white rounded-[3.5rem] flex items-center gap-10 shadow-2xl">
                 <ShieldCheck size={56} className="text-green-500 shrink-0"/>
                 <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">Certificación de Datos SJS</p>
                    <p className="text-xs font-medium opacity-80 leading-relaxed italic">"Los datos presentados son extraídos en tiempo real. Se recomienda verificar los arqueos físicos contra los totales por método de pago aquí detallados."</p>
                 </div>
              </div>
            </div>

            <div className="p-16 border-t bg-gray-50/50">
              <button onClick={() => {
                const data = posSalesData[selectedPos.id]?.sessions.map((s: any) => ({
                  'Turno': s.id,
                  'Usuario': s.user_id[1],
                  'Apertura': s.start_at,
                  'Estado': s.state,
                  'Venta Turno': s.total,
                  'Cant. Tickets': s.count
                }));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Auditoria_Detalle");
                XLSX.writeFile(wb, `SJS_Audit_${selectedPos.name}_${dateRange.start}.xlsx`);
              }} className="w-full bg-odoo-primary text-white py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-odoo-primary/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4">
                <FileSpreadsheet size={24}/> Generar Reporte SJS
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-16 right-16 z-[200]">
           <div className="bg-white px-10 py-6 rounded-[2.5rem] shadow-2xl border border-gray-100 flex items-center gap-5 animate-in slide-in-from-right">
              <Loader2 className="animate-spin text-odoo-primary" size={28}/>
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Consultando Odoo...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
