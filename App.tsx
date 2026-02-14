
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building, Truck, MoveHorizontal, Info, AlertTriangle,
  Clock, CheckCircle2, xCircle, TrendingUp, CreditCard, Wallet, Banknote, ShoppingBag,
  DollarSign, PieChart, Filter, Download, FileSpreadsheet, Calendar, Users
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
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [principal1, setPrincipal1] = useState<any | null>(null);
  const [internalPickingTypeId, setInternalPickingTypeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
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
  const [selectedPosDetail, setSelectedPosDetail] = useState<any>(null);
  
  const [reportDateStart, setReportDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportDateEnd, setReportDateEnd] = useState(new Date().toISOString().split('T')[0]);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const canSeeAdminTabs = useMemo(() => {
    if (!session?.email) return false;
    const email = session.email.toLowerCase();
    const admins = ['admin1@sanjose.pe', 'soporte@facturaclic.pe', 'laura@sanjose.pe', 'l.saavedra@sanjose.pe'];
    return admins.some(a => email.includes(a));
  }, [session]);

  const fetchPosStats = useCallback(async (start?: string, end?: string) => {
    if (!canSeeAdminTabs) return;
    setLoading(true);
    const dateStart = start || reportDateStart;
    const dateEnd = end || reportDateEnd;

    try {
      const allConfigs = await client.searchRead('pos.config', [], ['name', 'id']);
      const filteredConfigs = allConfigs.filter((c: any) => {
        const name = c.name.toUpperCase();
        return (name.includes('BOTICA 1') || name.includes('BOTICA 2') || name.includes('BOTICA 3') || name.includes('BOTICA 4') || name.includes('BOTICA 0') || name.includes('BOTICA B')) &&
               !name.includes('TIENDA') && !name.includes('CRUZ') && !name.includes('P&P');
      });
      setPosConfigs(filteredConfigs);

      const configIds = filteredConfigs.map((c: any) => c.id);

      const sessions = await client.searchRead('pos.session', 
        [['config_id', 'in', configIds], ['start_at', '>=', dateStart + ' 00:00:00'], ['start_at', '<=', dateEnd + ' 23:59:59']], 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );

      const orders = await client.searchRead('pos.order', 
        [['date_order', '>=', dateStart + ' 00:00:00'], ['date_order', '<=', dateEnd + ' 23:59:59']], 
        ['amount_total', 'session_id', 'config_id', 'payment_ids', 'user_id'],
        { limit: 2000 }
      );

      const paymentIds = orders.flatMap(o => o.payment_ids);
      let payments: any[] = [];
      if (paymentIds.length > 0) {
        payments = await client.searchRead('pos.payment', [['id', 'in', paymentIds]], ['amount', 'payment_method_id', 'pos_order_id']);
      }

      const stats: any = {};
      for (const config of filteredConfigs) {
        const configSessions = sessions.filter(s => s.config_id[0] === config.id);
        const latestSession = configSessions[0];
        const configOrders = orders.filter(o => o.config_id[0] === config.id);
        const configPayments = payments.filter(p => configOrders.some(o => o.id === p.pos_order_id[0]));
        
        const paymentBreakdown: any = {};
        configPayments.forEach(p => {
          const method = p.payment_method_id[1];
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + p.amount;
        });

        const userBreakdown: any = {};
        configOrders.forEach(o => {
          const userName = o.user_id[1];
          userBreakdown[userName] = (userBreakdown[userName] || 0) + o.amount_total;
        });

        stats[config.id] = {
          total: configOrders.reduce((a, b) => a + b.amount_total, 0),
          orderCount: configOrders.length,
          isOpened: latestSession?.state === 'opened' || latestSession?.state === 'opening_control',
          openedBy: (latestSession?.state === 'opened' || latestSession?.state === 'opening_control') ? latestSession?.user_id?.[1] : '---',
          cashBalance: (latestSession?.state === 'opened' || latestSession?.state === 'opening_control') ? latestSession?.cash_register_balance_end_real : 0,
          payments: paymentBreakdown,
          users: userBreakdown,
          sessions: configSessions,
          lastClosing: latestSession?.stop_at ? new Date(latestSession.stop_at).toLocaleString('es-PE') : '---'
        };
      }
      setPosSalesData(stats);

      const orderLines = await client.searchRead('pos.order.line', 
        [['create_date', '>=', dateStart + ' 00:00:00']], 
        ['product_id', 'qty', 'price_subtotal_incl'],
        { limit: 1000 }
      );
      const items: any = {};
      orderLines.forEach((l: any) => {
        const pid = l.product_id[1];
        if (!items[pid]) items[pid] = { name: pid, qty: 0, total: 0 };
        items[pid].qty += l.qty;
        items[pid].total += l.price_subtotal_incl;
      });
      setBestSellers(Object.values(items).sort((a: any, b: any) => b.qty - a.qty).slice(0, 10));

    } catch (e) {
      console.error("Error en analítica SJS:", e);
    } finally {
      setLoading(false);
    }
  }, [client, canSeeAdminTabs, reportDateStart, reportDateEnd]);

  const exportSedeExcel = (config: any) => {
    const data = posSalesData[config.id];
    if (!data) return;
    const wb = XLSX.utils.book_new();
    
    // Hoja de Sesiones
    const sessionData = data.sessions.map((s: any) => ({
      'ID Sesión': s.id,
      'Responsable': s.user_id[1],
      'Inicio': s.start_at,
      'Fin': s.stop_at || 'En curso',
      'Estado': s.state === 'closed' ? 'Cerrada' : 'Abierta',
      'Balance Inicial': s.cash_register_balance_start,
      'Balance Final Real': s.cash_register_balance_end_real,
      'Diferencia': s.cash_register_balance_end_real - s.cash_register_balance_start
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionData), "Sesiones");
    
    // Hoja de Pagos
    const paymentData = Object.entries(data.payments).map(([m, a]) => ({'Método de Pago': m, 'Monto': a}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentData), "Pagos");

    // Hoja de Vendedores
    const userData = Object.entries(data.users).map(([u, a]) => ({'Vendedor': u, 'Venta Total': a}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userData), "Vendedores");

    XLSX.writeFile(wb, `Auditoria_SJS_${config.name}_${reportDateStart}.xlsx`);
  };

  const exportConsolidadoExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = posConfigs.map(config => {
      const d = posSalesData[config.id] || {};
      return {
        'Sede': config.name,
        'Estado': d.isOpened ? 'ABIERTA' : 'CERRADA',
        'Venta Total': d.total || 0,
        'Tickets': d.orderCount || 0,
        'Balance Efectivo': d.cashBalance || 0,
        'Vendedores Activos': Object.keys(d.users || {}).join(', ')
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Reporte Global Red");
    XLSX.writeFile(wb, `Consolidado_SJS_Red_${reportDateStart}_al_${reportDateEnd}.xlsx`);
  };

  const fetchMyRequests = useCallback(async (userId: number) => {
    try {
      const pickings = await client.searchRead('stock.picking', 
        [['create_uid', '=', userId]], 
        ['name', 'state', 'location_dest_id', 'scheduled_date', 'origin', 'note'],
        { limit: 20, order: 'id desc' }
      );
      setMyRequests(pickings);
    } catch (e) { console.error(e); }
  }, [client]);

  const fetchProducts = useCallback(async () => {
    if (!principal1?.lot_stock_id) return;
    setLoading(true);
    try {
      const pData = await client.searchRead('product.product', 
        [['active', '=', true], ['type', '=', 'product']], 
        ['name', 'default_code', 'qty_available', 'uom_id'], 
        { limit: 500, context: { location: principal1.lot_stock_id[0], compute_child_locations: false } }
      );
      setProducts(pData.filter((p: any) => p.qty_available > 0));
    } catch (e: any) {
      setErrorLog("Error stock: " + e.message);
    } finally { setLoading(false); }
  }, [client, principal1]);

  const submitToOdoo = async () => {
    if (!cart.length || !selectedWarehouseId || !session) return;
    setLoading(true);
    try {
      const warehouseDest = warehouses.find(w => w.id === selectedWarehouseId);
      const pickingData = {
        picking_type_id: internalPickingTypeId,
        location_id: principal1.lot_stock_id[0], 
        location_dest_id: warehouseDest.lot_stock_id[0], 
        origin: `App SJS - ${session.name}`,
        note: customNotes,
        company_id: session.company_id,
        move_ids_without_package: cart.map(item => [0, 0, {
          name: item.name,
          product_id: item.id,
          product_uom_qty: item.qty,
          product_uom: item.uom_id ? item.uom_id[0] : 1,
          location_id: principal1.lot_stock_id[0],
          location_dest_id: warehouseDest.lot_stock_id[0],
        }])
      };
      await client.create('stock.picking', pickingData);
      setCart([]);
      setOrderComplete(true);
      await fetchMyRequests(session.odoo_user_id);
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  const loadAppData = useCallback(async (uid: number, companyId: number, odooUserId: number) => {
    setLoading(true);
    try {
      client.setAuth(uid, config.apiKey);
      const [wData, pTypes] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code', 'lot_stock_id']),
        client.searchRead('stock.picking.type', [['code', '=', 'internal'], ['company_id', '=', companyId]], ['name', 'warehouse_id', 'sequence_code'])
      ]);
      setWarehouses(wData);
      const p1 = wData.find((w: any) => w.code.toUpperCase() === 'PR' || w.name.toUpperCase().includes('PRINCIPAL1'));
      if (p1) {
        setPrincipal1(p1);
        const pt = pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === p1.id);
        if (pt) setInternalPickingTypeId(pt.id);
      }
      await fetchMyRequests(odooUserId);
      if (canSeeAdminTabs) await fetchPosStats();
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  }, [client, config.apiKey, fetchMyRequests, canSeeAdminTabs, fetchPosStats]);

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
      if (!userSearch.length) throw new Error("Usuario no reconocido.");
      const user = userSearch[0];
      const sessionData = { id: adminUid, odoo_user_id: user.id, name: user.name, email: user.email, company_id: companies[0]?.id, company_name: config.companyName };
      setSession(sessionData);
      await loadAppData(adminUid, sessionData.company_id, user.id);
      setView('app');
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'done': return 'bg-green-100 text-green-600';
      case 'cancel': return 'bg-red-100 text-red-600';
      case 'assigned': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen bg-[#F0F2F5] flex items-center justify-center font-sans">
        <div className="bg-white w-[400px] p-12 rounded-[2.5rem] shadow-2xl border border-gray-100">
          <div className="flex flex-col items-center gap-8">
            <div className="w-20 h-20 bg-odoo-primary rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black italic shadow-xl">SJ</div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">Portal SJS</h1>
              <p className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.2em]">Operaciones San José</p>
            </div>
            <form onSubmit={handleInitialAuth} className="w-full space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Odoo</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none font-bold text-sm" placeholder="ejemplo@sanjose.pe" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="o-btn-primary w-full py-4.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-odoo-primary/20 font-black text-xs tracking-widest uppercase">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'INICIAR SESIÓN'}
              </button>
            </form>
            {errorLog && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-2xl border border-red-100 w-full text-center">{errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFC] text-odoo-text overflow-hidden">
      <header className="h-14 bg-odoo-primary text-white flex items-center justify-between px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">SJ</div>
          <span className="text-xs font-black tracking-widest uppercase opacity-90">Boticas San José</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/5">
            <div className="w-6 h-6 bg-odoo-secondary rounded-full flex items-center justify-center text-[10px] font-black">{session?.name.slice(0,1)}</div>
            <span className="text-[11px] font-black">{session?.name}</span>
          </div>
          <button onClick={() => setView('login')} className="p-2 hover:bg-rose-500 rounded-lg transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0">
          <nav className="p-4 space-y-1 flex-1 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/> Inicio</button>
            <button onClick={() => setActiveTab('purchase')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'purchase' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Plus size={20}/> Nuevo Pedido</button>
            <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'requests' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><ClipboardList size={20}/> Mis Solicitudes</button>
            {canSeeAdminTabs && (
              <button onClick={() => { setActiveTab('sedes'); fetchPosStats(); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === 'sedes' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Store size={20}/> Red de Sedes</button>
            )}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
             <div>
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  {activeTab === 'sedes' ? 'Inteligencia de Red SJS' : activeTab === 'purchase' ? 'Generar Solicitud' : activeTab === 'requests' ? 'Seguimiento de Pedidos' : 'Dashboard Operativo'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado en Tiempo Real SJS</p>
             </div>
             {activeTab === 'sedes' && (
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                     <Calendar size={14} className="text-odoo-primary"/>
                     <input type="date" value={reportDateStart} onChange={e => setReportDateStart(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <span className="text-[11px] font-black opacity-30">a</span>
                     <input type="date" value={reportDateEnd} onChange={e => setReportDateEnd(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <button onClick={() => fetchPosStats()} className="p-1 hover:bg-white rounded-lg transition-all text-odoo-primary"><Search size={14}/></button>
                  </div>
                  <button onClick={exportConsolidadoExcel} className="o-btn-secondary flex items-center gap-2 border-green-200 text-green-600 font-black text-[10px] hover:bg-green-50">
                    <FileSpreadsheet size={16}/> EXPORTAR CONSOLIDADO
                  </button>
               </div>
             )}
          </header>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-8 o-animate-fade">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><ClipboardList size={24}/></div>
                    <div><p className="text-2xl font-black text-gray-800">{myRequests.length}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mis Solicitudes</p></div>
                  </div>
                </div>
                <div className="bg-odoo-primary text-white p-12 rounded-[3rem] shadow-xl relative overflow-hidden">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Abastecimiento SJS</h3>
                  <p className="text-sm opacity-80 max-w-md font-medium mb-6">Gestiona tus pedidos de stock y monitorea el estado de tus transferencias desde la central PRINCIPAL1.</p>
                  <button onClick={() => setActiveTab('purchase')} className="bg-white text-odoo-primary px-8 py-3 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-transform">Crear Nuevo Pedido</button>
                </div>
              </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 o-animate-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Sede de Destino</label>
                    <select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                      <option value="">-- SELECCIONE BOTICA --</option>
                      {warehouses.filter(w => w.id !== principal1?.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Nota Adicional</label>
                    <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" placeholder="Urgente, reposición, etc..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-[11px] font-black uppercase text-odoo-primary tracking-widest">Productos del Pedido</h3>
                    <button onClick={() => { fetchProducts(); setShowProductModal(true); }} className="bg-odoo-primary text-white px-6 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:brightness-110 shadow-lg transition-all"><Plus size={18}/> AGREGAR PRODUCTO</button>
                  </div>
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div>
                          <p className="font-black text-sm text-gray-800 uppercase">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">REF: {item.default_code || 'S/REF'}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <input type="number" className="w-20 text-center bg-white border-none rounded-xl p-2 font-black text-lg outline-none" value={item.qty} min="1" onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))} />
                          <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {cart.length > 0 && (
                    <button onClick={submitToOdoo} disabled={loading || !selectedWarehouseId} className="w-full bg-odoo-primary text-white py-5 rounded-[2rem] font-black text-xs tracking-[0.2em] shadow-2xl mt-8">
                      {loading ? <Loader2 className="animate-spin mx-auto" size={24}/> : 'CONFIRMAR SOLICITUD SJS'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="max-w-5xl mx-auto space-y-4 o-animate-fade">
                {myRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusColor(req.state)} bg-opacity-20`}>
                        <Package size={24}/>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-gray-800 text-base">{req.name}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(req.state)}`}>
                            {req.state}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Destino: {req.location_dest_id?.[1]}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'sedes' && canSeeAdminTabs && (
              <div className="max-w-6xl mx-auto space-y-12 o-animate-fade pb-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Periodo</p>
                      <p className="text-2xl font-black text-gray-800">S/ {Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.total || 0), 0)).toFixed(2)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tickets Totales</p>
                      <p className="text-2xl font-black text-odoo-primary">{Object.values(posSalesData).reduce((a: number, b: any) => a + (b.orderCount || 0), 0)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cajas Activas</p>
                      <p className="text-2xl font-black text-odoo-success">{posConfigs.filter(c => posSalesData[c.id]?.isOpened).length} / {posConfigs.length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectivo Red</p>
                      <p className="text-2xl font-black text-amber-500">S/ {Number(Object.values(posSalesData).reduce((a: number, b: any) => a + (b.cashBalance || 0), 0)).toFixed(2)}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {posConfigs.map(config => {
                        const sales = posSalesData[config.id] || {};
                        const isOnline = sales.isOpened;
                        return (
                          <div key={config.id} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all text-left ${selectedPosDetail?.id === config.id ? 'ring-4 ring-odoo-primary/10 border-odoo-primary' : ''}`}>
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex items-center gap-3">
                                  <div className={`w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-odoo-success animate-pulse' : 'bg-gray-200'}`}></div>
                                  <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{config.name}</h4>
                               </div>
                               <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                 {isOnline ? 'Abierta' : 'Cerrada'}
                               </span>
                            </div>
                            <div className="space-y-4 cursor-pointer" onClick={() => setSelectedPosDetail(config)}>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable Hoy</p><p className="text-xs font-black text-gray-700">{sales.openedBy || '---'}</p></div>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance Efectivo</p><p className="text-sm font-black text-amber-500">S/ {Number(sales.cashBalance || 0).toFixed(2)}</p></div>
                               <div className="flex justify-between items-center pt-4 border-t border-gray-50"><p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">Venta Total</p><p className="text-lg font-black text-gray-800">S/ {Number(sales.total || 0).toFixed(2)}</p></div>
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                               <button onClick={() => exportSedeExcel(config)} className="text-[10px] font-black text-odoo-primary flex items-center gap-2 hover:underline"><Download size={14}/> AUDITORÍA EXCEL</button>
                               <ChevronRight size={18} className="text-gray-300"/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-8">
                     {selectedPosDetail ? (
                       <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl o-animate-fade space-y-8 overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-odoo-primary/5 rounded-full -mr-12 -mt-12"></div>
                          
                          <section>
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                               <PieChart size={20} className="text-odoo-primary"/> ARQUEO POR MÉTODOS
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(posSalesData[selectedPosDetail.id]?.payments || {}).map(([method, amount]: [string, any]) => (
                                  <div key={method} className="flex justify-between items-center group">
                                     <div className="flex items-center gap-3">
                                        {method.toLowerCase().includes('efectivo') ? <Banknote size={16} className="text-green-500"/> : <CreditCard size={16} className="text-blue-500"/>}
                                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900">{method}</span>
                                     </div>
                                     <span className="text-[11px] font-black text-gray-800">S/ {Number(amount).toFixed(2)}</span>
                                  </div>
                                ))}
                                {Object.keys(posSalesData[selectedPosDetail.id]?.payments || {}).length === 0 && (
                                  <p className="text-[10px] font-bold text-gray-300 uppercase italic py-2">Sin movimientos registrados</p>
                                )}
                             </div>
                          </section>

                          <section className="pt-8 border-t border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                               <Users size={20} className="text-odoo-primary"/> VENTAS POR VENDEDOR
                            </h3>
                            <div className="space-y-4">
                               {Object.entries(posSalesData[selectedPosDetail.id]?.users || {}).map(([user, amount]: [string, any]) => (
                                 <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-odoo-primary/10 rounded-xl flex items-center justify-center text-odoo-primary">
                                          <UserIcon size={16}/>
                                       </div>
                                       <p className="text-[10px] font-black text-gray-700 uppercase leading-none">{user}</p>
                                    </div>
                                    <p className="text-[11px] font-black text-odoo-primary">S/ {Number(amount).toFixed(2)}</p>
                                 </div>
                               ))}
                               {Object.keys(posSalesData[selectedPosDetail.id]?.users || {}).length === 0 && (
                                  <p className="text-[10px] font-bold text-gray-300 uppercase italic">Sin actividad de personal</p>
                                )}
                            </div>
                          </section>

                          <section className="pt-8 border-t border-gray-50">
                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span>Total Tickets: {posSalesData[selectedPosDetail.id]?.orderCount}</span>
                                <span>Status: {posSalesData[selectedPosDetail.id]?.isOpened ? 'ACTIVO' : 'OFFLINE'}</span>
                             </div>
                          </section>
                       </div>
                     ) : (
                       <div className="bg-gray-100/50 p-12 rounded-[3rem] border border-dashed border-gray-200 text-center">
                          <Filter size={40} className="mx-auto text-gray-300 mb-4"/>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccione una sede para auditoría detallada de usuarios y pagos</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Catálogo Central SJS</h3>
               <button onClick={() => setShowProductModal(false)} className="p-3 bg-white rounded-2xl text-gray-300 hover:text-rose-500 transition-all"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <input autoFocus type="text" className="w-full p-4.5 bg-gray-50 rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none text-sm font-black" placeholder="Nombre o Referencia..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {products.filter(p => (p.name + (p.default_code || '')).toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => {
                  const exists = cart.find(c => c.id === p.id);
                  if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                  else setCart([...cart, {...p, qty: 1}]);
                  setShowProductModal(false);
                }} className="w-full flex items-center justify-between p-5 bg-white hover:bg-odoo-primary/5 rounded-[1.5rem] border border-transparent transition-all text-left">
                  <div>
                    <p className="font-black text-sm text-gray-800 uppercase">{p.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">SJS-REF: {p.default_code || 'S/REF'}</p>
                  </div>
                  <p className="text-sm font-black text-odoo-success">{Math.floor(p.qty_available)} uds.</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
