
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building, Truck, MoveHorizontal, Info, AlertTriangle,
  Clock, CheckCircle2, xCircle, TrendingUp, CreditCard, Wallet, Banknote, ShoppingBag,
  DollarSign, PieChart, Filter, Download, FileSpreadsheet, Calendar, Users, ListFilter,
  TrendingDown, TrendingUp as TrendingUpIcon, Target, Zap, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OdooClient } from './services/odooService';
import { AppConfig, Warehouse, Employee, Product } from './types';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe",
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  companyName: "CADENA DE BOTICAS SAN JOSE S.A.C."
};

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('odoo_ops_v18_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [view, setView] = useState<'login' | 'app'>('login');
  const [session, setSession] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [principal1, setPrincipal1] = useState<any | null>(null);
  const [internalPickingTypeId, setInternalPickingTypeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  
  const [products, setProducts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [customNotes, setCustomNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const [selectedPosConfig, setSelectedPosConfig] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  
  const getPeruNow = () => {
    const d = new Date();
    return new Date(d.getTime() - (5 * 60 * 60 * 1000));
  };

  const [reportDateStart, setReportDateStart] = useState(getPeruNow().toISOString().split('T')[0]);
  const [reportDateEnd, setReportDateEnd] = useState(getPeruNow().toISOString().split('T')[0]);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const canSeeAdminTabs = useMemo(() => {
    if (!session?.email) return false;
    const email = session.email.toLowerCase();
    const admins = ['admin1@sanjose.pe', 'soporte@facturaclic.pe', 'laura@sanjose.pe', 'l.saavedra@sanjose.pe', 'jose@sanjose.pe', 'jose.herrera@sanjose.pe', 'administracion@sanjose.pe'];
    return admins.some(a => email.includes(a)) || email.includes('jose');
  }, [session]);

  const fetchPosStats = useCallback(async () => {
    if (!canSeeAdminTabs) return;
    setLoading(true);
    setErrorLog(null);

    try {
      // 1. Obtener POS Configs - Buscamos IDs de sesión activa directamente
      const configs = await client.searchRead('pos.config', [], ['name', 'id', 'current_session_id', 'current_session_state']);
      const filteredConfigs = configs.filter((c: any) => {
        const n = c.name.toUpperCase();
        return (n.includes('BOTICA 1') || n.includes('BOTICA 2') || n.includes('BOTICA 3') || n.includes('BOTICA 4') || n.includes('BOTICA 0') || n.includes('BOTICA B')) &&
               !n.includes('TIENDA') && !n.includes('CRUZ') && !n.includes('P&P');
      });
      setPosConfigs(filteredConfigs);

      // 2. BUSCAR SESIONES SIN FILTRO DE FECHA PARA LAS ABIERTAS
      // Esto asegura que si Odoo dice que hay un current_session_id, lo traemos sin importar la hora UTC
      const dateStartStr = `${reportDateStart} 00:00:00`;
      const dateEndStr = `${reportDateEnd} 23:59:59`;

      const sessionDomain = [
        '&', ['config_id', 'in', filteredConfigs.map(c => c.id)],
        '|', 
          ['state', '!=', 'closed'], // CUALQUIER COSA QUE NO ESTE CERRADA (ABIERTAS O EN CIERRE)
          '&', ['start_at', '>=', dateStartStr], ['start_at', '<=', dateEndStr] // O CERRADAS DENTRO DEL RANGO
      ];

      const sessions = await client.searchRead('pos.session', 
        sessionDomain, 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );

      const sessionIds = sessions.map(s => s.id);
      let orders: any[] = [];
      let payments: any[] = [];
      let orderLines: any[] = [];

      if (sessionIds.length > 0) {
        // 3. PEDIDOS POR SESION (Esto es la clave, no filtrar pedidos por fecha sino por el contenedor Sesión)
        orders = await client.searchRead('pos.order', [['session_id', 'in', sessionIds]], ['amount_total', 'session_id', 'config_id', 'payment_ids', 'user_id', 'date_order'], { limit: 15000 });
        
        if (orders.length > 0) {
          const pIds = orders.flatMap(o => o.payment_ids);
          if (pIds.length > 0) {
            payments = await client.searchRead('pos.payment', [['id', 'in', pIds]], ['amount', 'payment_method_id', 'pos_order_id', 'session_id']);
          }
          orderLines = await client.searchRead('pos.order.line', [['order_id', 'in', orders.map(o => o.id)]], ['product_id', 'qty', 'price_subtotal_incl', 'price_subtotal', 'order_id', 'session_id'], { limit: 25000 });
        }
      }

      // Costos para rentabilidad
      const uProductIds = [...new Set(orderLines.map((l: any) => l.product_id[0]))];
      let pCosts: Record<number, number> = {};
      if (uProductIds.length > 0) {
        const cData = await client.searchRead('product.product', [['id', 'in', uProductIds]], ['id', 'standard_price']);
        cData.forEach((p: any) => { pCosts[p.id] = p.standard_price || 0; });
      }

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id[0] === conf.id);
        const openSess = confSessions.find(s => s.state !== 'closed');
        const activeOrLatest = openSess || confSessions[0];

        const processed = confSessions.map(sess => {
          const sOrders = orders.filter(o => o.session_id[0] === sess.id);
          const sPayments = payments.filter(p => p.session_id[0] === sess.id);
          const sLines = orderLines.filter(l => l.session_id[0] === sess.id);

          const payMap: any = {};
          sPayments.forEach(p => { payMap[p.payment_method_id[1]] = (payMap[p.payment_method_id[1]] || 0) + p.amount; });

          const userMap: any = {};
          sOrders.forEach(o => { userMap[o.user_id[1]] = (userMap[o.user_id[1]] || 0) + o.amount_total; });

          const pGroups: Record<string, any> = {};
          sLines.forEach(l => {
            const pid = l.product_id[0];
            const pName = l.product_id[1];
            if (!pGroups[pName]) pGroups[pName] = { name: pName, qty: 0, sale: 0, cost: pCosts[pid] || 0 };
            pGroups[pName].qty += l.qty;
            pGroups[pName].sale += l.price_subtotal_incl;
          });

          const pAnalysis = Object.values(pGroups).map((pg: any) => ({
            'Producto': pg.name,
            'Cantidad': pg.qty,
            'Venta Total (S/)': Number(pg.sale.toFixed(2)),
            'Ganancia (S/)': Number((pg.sale - (pg.qty * pg.cost)).toFixed(2))
          }));

          return {
            ...sess,
            total_vta: sOrders.reduce((a, b) => a + b.amount_total, 0),
            order_count: sOrders.length,
            payments: payMap,
            users: userMap,
            productAnalysis: pAnalysis
          };
        });

        // La venta del día para la tarjeta es la suma de las sesiones detectadas para hoy + la activa
        stats[conf.id] = {
          day_total: processed.reduce((a, b) => a + b.total_vta, 0),
          day_order_count: processed.reduce((a, b) => a + b.order_count, 0),
          isOpened: !!openSess,
          openedBy: activeOrLatest?.user_id[1] || '---',
          cashBalance: activeOrLatest?.cash_register_balance_end_real || 0,
          sessions: processed
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) {
      console.error("DEBUG SJS:", e);
      setErrorLog("Sincronización interrumpida. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [client, canSeeAdminTabs, reportDateStart, reportDateEnd]);

  const currentSessions = useMemo(() => {
    if (!selectedPosConfig || !posSalesData[selectedPosConfig.id]) return [];
    return posSalesData[selectedPosConfig.id].sessions || [];
  }, [selectedPosConfig, posSalesData]);

  const activeSessionDetail = useMemo(() => {
    if (!selectedSessionId) return currentSessions[0] || null;
    return currentSessions.find((s: any) => s.id === selectedSessionId) || currentSessions[0] || null;
  }, [selectedSessionId, currentSessions]);

  const fetchMyRequests = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const data = await client.searchRead('stock.picking', 
        [['user_id', '=', userId]], 
        ['id', 'name', 'state', 'location_dest_id', 'scheduled_date', 'note'],
        { order: 'id desc', limit: 20 }
      );
      setMyRequests(data);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  }, [client]);

  const fetchProducts = useCallback(async () => {
    if (!principal1) return;
    setLoading(true);
    try {
      const data = await client.searchRead('product.product', 
        [['qty_available', '>', 0]], 
        ['id', 'name', 'default_code', 'qty_available', 'uom_id'],
        { limit: 200 }
      );
      setProducts(data);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  }, [client, principal1]);

  // Fix: Added missing getStatusColor function
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'done': return 'bg-green-50 text-green-600 border border-green-100';
      case 'assigned': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'confirmed': return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'cancel': return 'bg-rose-50 text-rose-600 border border-rose-100';
      default: return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  // Fix: Added missing exportSessionExcel function
  const exportSessionExcel = (sessionDetail: any, posName: string) => {
    const wb = XLSX.utils.book_new();
    const payments = Object.entries(sessionDetail.payments || {}).map(([method, amount]) => ({
      'Método de Pago': method,
      'Monto S/': Number(amount).toFixed(2)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), "Resumen Pagos");
    
    if (sessionDetail.productAnalysis) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionDetail.productAnalysis), "Ventas Productos");
    }
    
    XLSX.writeFile(wb, `Reporte_Turno_${sessionDetail.id}_${posName.replace(/\s+/g, '_')}.xlsx`);
  };

  const submitToOdoo = async () => {
    if (!selectedWarehouseId || cart.length === 0 || !principal1) return;
    setLoading(true);
    try {
      const destWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
      const types = await client.searchRead('stock.picking.type', [['code', '=', 'internal'], ['company_id', '=', session.company_id]], ['id'], { limit: 1 });
      const pType = types[0]?.id;
      
      const values = {
        picking_type_id: pType,
        location_id: principal1.lot_stock_id[0],
        location_dest_id: destWarehouse.lot_stock_id[0],
        user_id: session.odoo_user_id,
        note: customNotes,
        move_ids_without_package: cart.map(item => [0, 0, {
          product_id: item.id,
          product_uom_qty: item.qty,
          name: item.name,
          product_uom: item.uom_id ? item.uom_id[0] : 1,
          location_id: principal1.lot_stock_id[0],
          location_dest_id: destWarehouse.lot_stock_id[0],
        }])
      };
      await client.create('stock.picking', values);
      setCart([]);
      setOrderComplete(true);
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'sedes' && view === 'app') {
      fetchPosStats();
    }
  }, [activeTab, view, fetchPosStats]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    setErrorLog(null);
    try {
      const adminUid = await client.authenticate(config.user, config.apiKey);
      const companies = await client.searchRead('res.company', [['name', '=', config.companyName]], ['id', 'name'], { limit: 1 });
      const userSearch = await client.searchRead('res.users', [
        '|', ['login', '=', loginInput], ['name', 'ilike', loginInput]
      ], ['id', 'name', 'login', 'email'], { limit: 1 });
      if (!userSearch.length) throw new Error("Usuario no encontrado.");
      const user = userSearch[0];
      const sessionData = { id: adminUid, odoo_user_id: user.id, name: user.name, email: user.email, company_id: companies[0]?.id, company_name: config.companyName };
      setSession(sessionData);
      client.setAuth(adminUid, config.apiKey);
      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sessionData.company_id]], ['name', 'code', 'lot_stock_id']);
      setWarehouses(ws);
      const p1 = ws.find((w: any) => w.code.toUpperCase() === 'PR' || w.name.toUpperCase().includes('PRINCIPAL1'));
      if (p1) setPrincipal1(p1);
      setView('app');
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  if (view === 'login') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center font-sans p-6">
        <div className="bg-white w-full max-w-[400px] p-10 rounded-[2.5rem] shadow-2xl border border-gray-100">
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-odoo-primary rounded-3xl flex items-center justify-center text-white text-4xl font-black italic shadow-xl">SJ</div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Portal SJS</h1>
              <p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mt-1">Odoo Enterprise v18</p>
            </div>
            <form onSubmit={handleInitialAuth} className="w-full space-y-5">
              <input type="text" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:ring-4 focus:ring-odoo-primary/10 outline-none font-bold text-sm" placeholder="usuario@sanjose.pe" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              <button type="submit" disabled={loading} className="o-btn-primary w-full py-4.5 rounded-2xl flex justify-center items-center shadow-lg font-black text-xs tracking-widest uppercase active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Ingresar'}
              </button>
            </form>
            {errorLog && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 w-full text-center">{errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFC] text-odoo-text overflow-hidden font-sans">
      <header className="h-14 bg-odoo-primary text-white flex items-center justify-between px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">SJ</div>
          <span className="text-xs font-black tracking-widest uppercase">Boticas San José</span>
        </div>
        <div className="flex items-center gap-4">
          {activeTab === 'sedes' && (
            <button onClick={fetchPosStats} disabled={loading} className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-xl border border-white/5 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
              <span className="text-[10px] font-black uppercase">Sincronizar</span>
            </button>
          )}
          <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-xl border border-white/5">
            <UserIcon size={14}/>
            <span className="text-[11px] font-black truncate max-w-[120px]">{session?.name}</span>
          </div>
          <button onClick={() => setView('login')} className="p-2 hover:bg-rose-500 rounded-lg transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0">
          <nav className="p-4 space-y-1 flex-1 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/> Dashboard</button>
            <button onClick={() => setActiveTab('purchase')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'purchase' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Plus size={20}/> Pedir Mercadería</button>
            <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'requests' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><ClipboardList size={20}/> Mis Solicitudes</button>
            {canSeeAdminTabs && (
              <button onClick={() => setActiveTab('sedes')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'sedes' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Store size={20}/> Auditoría Red</button>
            )}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-40 flex items-center justify-center">
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4">
                 <Loader2 className="animate-spin text-odoo-primary" size={40}/>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consultando Odoo v18...</p>
              </div>
            </div>
          )}

          <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
             <div>
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  {activeTab === 'sedes' ? 'Control de Red San José' : activeTab === 'purchase' ? 'Nueva Solicitud' : activeTab === 'requests' ? 'Seguimiento' : 'Portal Operativo'}
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestión Directa Empresa</p>
                  {lastSync && <span className="text-[9px] font-black text-odoo-success bg-green-50 px-2 py-0.5 rounded-lg">Update: {lastSync}</span>}
                </div>
             </div>
             
             {activeTab === 'sedes' && (
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                     <Calendar size={14} className="text-odoo-primary"/>
                     <input type="date" value={reportDateStart} onChange={e => setReportDateStart(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <span className="text-[11px] font-black opacity-30">a</span>
                     <input type="date" value={reportDateEnd} onChange={e => setReportDateEnd(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <button onClick={fetchPosStats} className="p-1.5 bg-odoo-primary text-white rounded-lg active:scale-90 shadow-sm"><Search size={14}/></button>
                  </div>
                  <button onClick={() => {
                    const wb = XLSX.utils.book_new();
                    const data = posConfigs.map(c => ({
                      'Botica': c.name,
                      'Venta S/': (posSalesData[c.id]?.day_total || 0).toFixed(2),
                      'Tickets': posSalesData[c.id]?.day_order_count || 0,
                      'Estado': posSalesData[c.id]?.isOpened ? 'ABIERTA' : 'CERRADA',
                      'Responsable': posSalesData[c.id]?.openedBy || '---'
                    }));
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Red SJS");
                    XLSX.writeFile(wb, "Reporte_Red.xlsx");
                  }} className="o-btn-secondary flex items-center gap-2 border-green-200 text-green-600 font-black text-[10px] hover:bg-green-50 active:scale-95">
                    <FileSpreadsheet size={16}/> Exportar
                  </button>
               </div>
             )}
          </header>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#F9FAFC]">
            {activeTab === 'sedes' && (
              <div className="max-w-7xl mx-auto space-y-12 o-animate-fade pb-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-odoo-primary/10 rounded-2xl flex items-center justify-center text-odoo-primary"><TrendingUp size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Venta Red</p>
                        <p className="text-2xl font-black text-gray-800">S/ {Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.day_total || 0), 0)).toFixed(2)}</p>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-odoo-success/10 rounded-2xl flex items-center justify-center text-odoo-success"><Store size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cajas Online</p>
                        <p className="text-2xl font-black text-odoo-success">{posConfigs.filter(c => posSalesData[c.id]?.isOpened).length} / {posConfigs.length}</p>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><ShoppingBag size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tickets</p>
                        <p className="text-2xl font-black text-gray-800">{Object.values(posSalesData).reduce((a: number, b: any) => a + (b.day_order_count || 0), 0)}</p>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500"><DollarSign size={24}/></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Estimado</p>
                        <p className="text-2xl font-black text-gray-800">S/ {Number(Object.values(posSalesData).reduce((a: number, b: any) => a + (b.cashBalance || 0), 0)).toFixed(2)}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {posConfigs.map(config => {
                        const sales = posSalesData[config.id] || {};
                        const isOnline = sales.isOpened;
                        return (
                          <div key={config.id} onClick={() => { setSelectedPosConfig(config); setSelectedSessionId(null); }} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all text-left relative overflow-hidden group cursor-pointer ${selectedPosConfig?.id === config.id ? 'ring-4 ring-odoo-primary/10 border-odoo-primary' : 'hover:border-odoo-primary/30'}`}>
                            {isOnline && <div className="absolute top-0 right-0 bg-odoo-success text-white px-3 py-1 text-[8px] font-black animate-pulse">LIVE</div>}
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-odoo-success animate-pulse' : 'bg-gray-200'}`}></div>
                                  <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{config.name}</h4>
                               </div>
                               <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isOnline ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400'}`}>
                                 {isOnline ? 'EN LÍNEA' : 'CERRADA'}
                               </span>
                            </div>
                            <div className="space-y-4">
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable</p><p className="text-xs font-black text-gray-700">{sales.openedBy || '---'}</p></div>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Caja</p><p className="text-sm font-black text-amber-500">S/ {Number(sales.cashBalance || 0).toFixed(2)}</p></div>
                               <div className="flex justify-between items-center pt-4 border-t border-gray-50"><p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">Venta Período</p><p className="text-2xl font-black text-gray-800">S/ {Number(sales.day_total || 0).toFixed(2)}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                     {selectedPosConfig ? (
                       <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl o-animate-fade space-y-8 sticky top-6">
                          <div>
                            <div className="flex justify-between items-center mb-6">
                               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><ListFilter size={16}/> TURNOS RECIENTES</h3>
                               <button onClick={fetchPosStats} className="text-odoo-primary p-2 hover:bg-odoo-primary/5 rounded-xl transition-all"><RefreshCw size={14}/></button>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                               {currentSessions.map((s: any) => (
                                 <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${activeSessionDetail?.id === s.id ? 'bg-odoo-primary text-white border-odoo-primary shadow-lg' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80">ID #{s.id}</p>
                                       <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${s.state !== 'closed' ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-400 text-white'}`}>
                                         {s.state !== 'closed' ? 'ABIERTA' : 'CERRADA'}
                                       </span>
                                    </div>
                                    <p className="text-xs font-black truncate">{s.user_id[1]}</p>
                                    <div className="flex justify-between items-end mt-3">
                                       <span className="text-[9px] font-bold opacity-70 uppercase">Inició: {new Date(s.start_at).toLocaleTimeString('es-PE')}</span>
                                       <span className="text-sm font-black">S/ {s.total_vta.toFixed(2)}</span>
                                    </div>
                                 </button>
                               ))}
                               {currentSessions.length === 0 && <div className="text-center py-10 opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">Sin turnos en Odoo</p></div>}
                            </div>
                          </div>

                          {activeSessionDetail && (
                            <div className="pt-8 border-t border-gray-100 space-y-8 o-animate-fade">
                               <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2"><PieChart size={20} className="text-odoo-primary"/> ARQUEO</h3>
                                  <button onClick={() => exportSessionExcel(activeSessionDetail, selectedPosConfig.name)} className="bg-odoo-primary text-white px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 hover:scale-105 transition-all">
                                    <Download size={14}/> EXCEL
                                  </button>
                               </div>

                               <div className="space-y-4">
                                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                     <p className="text-[10px] font-black text-amber-700 uppercase">Fondo Apertura</p>
                                     <p className="text-xs font-black text-amber-700">S/ {activeSessionDetail.cash_register_balance_start.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="space-y-2 px-1">
                                     {Object.entries(activeSessionDetail.payments || {}).map(([method, amount]: [string, any]) => (
                                       <div key={method} className="flex justify-between items-center">
                                          <span className="text-[11px] font-bold text-gray-600">{method}</span>
                                          <span className="text-[11px] font-black text-gray-800">S/ {Number(amount).toFixed(2)}</span>
                                       </div>
                                     ))}
                                  </div>

                                  <div className="pt-6 border-t border-gray-50">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16}/> VENTAS POR USUARIO</h3>
                                    <div className="space-y-2">
                                       {Object.entries(activeSessionDetail.users || {}).map(([user, amount]: [string, any]) => (
                                         <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                            <p className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[140px]">{user}</p>
                                            <p className="text-[11px] font-black text-odoo-primary">S/ {Number(amount).toFixed(2)}</p>
                                         </div>
                                       ))}
                                    </div>
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="bg-gray-100/40 p-16 rounded-[3rem] border border-dashed border-gray-200 text-center">
                          <Activity size={48} className="mx-auto text-gray-300 animate-pulse mb-4"/>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seleccione una botica para ver datos reales de Odoo v18</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-12 o-animate-fade py-12">
                <div className="bg-odoo-primary text-white p-16 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all"></div>
                  <h3 className="text-4xl font-black uppercase tracking-tight mb-4">Operaciones San José</h3>
                  <p className="text-lg opacity-80 max-w-lg font-medium mb-10">Control centralizado v18. Información de ventas y stock vinculada directamente al servidor Enterprise de la empresa.</p>
                  <div className="flex gap-6 relative z-10">
                    <button onClick={() => setActiveTab('purchase')} className="bg-white text-odoo-primary px-10 py-4 rounded-3xl font-black text-sm uppercase hover:scale-105 transition-all shadow-xl">Reposición Almacén</button>
                    {canSeeAdminTabs && <button onClick={() => setActiveTab('sedes')} className="bg-white/10 border border-white/20 text-white px-10 py-4 rounded-3xl font-black text-sm uppercase hover:bg-white/20 transition-all">Ver Auditoría Red</button>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100 o-animate-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.2em] ml-1 block">Botica Solicitante</label>
                    <select className="w-full bg-gray-50 border-none rounded-2xl p-4.5 font-black text-sm outline-none appearance-none cursor-pointer" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                      <option value="">-- SELECCIONAR DESTINO --</option>
                      {warehouses.filter(w => w.id !== principal1?.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.2em] ml-1 block">Referencia / Nota</label>
                    <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4.5 font-bold text-sm outline-none" placeholder="Urgencia, motivo..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-[11px] font-black uppercase text-odoo-primary tracking-widest flex items-center gap-2"><Layers size={16}/> Items en Carrito</h3>
                    <button onClick={() => { fetchProducts(); setShowProductModal(true); }} className="bg-odoo-primary text-white px-8 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                      <Plus size={18}/> AGREGAR PRODUCTOS
                    </button>
                  </div>
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl group transition-all">
                        <div className="flex-1">
                          <p className="font-black text-sm text-gray-800 uppercase">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">REF: {item.default_code || '---'}</p>
                        </div>
                        <div className="flex items-center gap-10">
                          <input type="number" className="w-20 text-center bg-white border border-gray-100 rounded-xl p-2 font-black text-lg outline-none" value={item.qty} min="1" onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))} />
                          <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && <div className="text-center py-20 opacity-30"><ShoppingBag size={48} className="mx-auto mb-4"/> <p className="font-black uppercase tracking-widest text-xs">Su lista está vacía</p></div>}
                  </div>
                  {cart.length > 0 && (
                    <button onClick={submitToOdoo} disabled={loading || !selectedWarehouseId} className="w-full bg-odoo-primary text-white py-5 rounded-[2.5rem] font-black text-xs tracking-[0.3em] shadow-2xl mt-12 active:scale-95 transition-all uppercase">
                      Confirmar Solicitud en Odoo
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="max-w-5xl mx-auto space-y-4 o-animate-fade py-6">
                {myRequests.map((req) => (
                  <div key={req.id} className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-gray-100 bg-opacity-15">
                        <Package size={32}/>
                      </div>
                      <div>
                        <div className="flex items-center gap-4">
                          <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight">{req.name}</h4>
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${getStatusColor(req.state)}`}>
                            {req.state === 'done' ? 'ENTREGADO' : req.state === 'assigned' ? 'EN CAMINO' : req.state === 'confirmed' ? 'ESPERANDO' : req.state.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Destino: <span className="text-gray-600 font-black">{req.location_dest_id?.[1]}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-gray-700">{new Date(req.scheduled_date).toLocaleDateString('es-PE')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[85vh] flex flex-col rounded-[4rem] shadow-2xl overflow-hidden o-animate-fade border border-gray-100">
            <div className="p-10 border-b flex justify-between items-center">
               <h3 className="font-black text-2xl text-gray-800 uppercase tracking-tight">Catálogo SJS</h3>
               <button onClick={() => setShowProductModal(false)} className="p-4 text-gray-300 hover:text-rose-500 transition-all"><X size={28}/></button>
            </div>
            <div className="px-10 py-8 border-b">
              <input autoFocus type="text" className="w-full p-5 bg-gray-50 rounded-3xl outline-none text-sm font-black shadow-inner" placeholder="Escriba nombre o código SKU..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {products.filter(p => (p.name + (p.default_code || '')).toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => {
                  const exists = cart.find(c => c.id === p.id);
                  if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                  else setCart([...cart, {...p, qty: 1}]);
                  setShowProductModal(false);
                }} className="w-full flex items-center justify-between p-6 bg-white hover:bg-odoo-primary/5 rounded-[2rem] border border-transparent transition-all text-left mb-3 group shadow-sm">
                  <div>
                    <p className="font-black text-sm text-gray-800 uppercase transition-colors">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5 flex items-center gap-2"><Barcode size={14}/> {p.default_code || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-odoo-success group-hover:scale-110 transition-transform">{Math.floor(p.qty_available)}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Stock</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {orderComplete && (
        <div className="fixed inset-0 z-[300] bg-odoo-primary flex items-center justify-center p-6 text-white text-center">
           <div className="max-w-md space-y-8 o-animate-fade">
              <div className="w-28 h-28 bg-white/20 rounded-[3rem] flex items-center justify-center mx-auto mb-10 animate-bounce"><Check size={72} strokeWidth={3}/></div>
              <h3 className="text-5xl font-black uppercase tracking-tight">¡Enviado!</h3>
              <p className="text-xl opacity-90 font-medium">La solicitud ha sido registrada en Odoo v18.</p>
              <button onClick={() => { setOrderComplete(false); setActiveTab('requests'); }} className="bg-white text-odoo-primary px-14 py-5 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all mt-10">Continuar</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
