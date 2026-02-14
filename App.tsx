
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building, Truck, MoveHorizontal, Info, AlertTriangle,
  Clock, CheckCircle2, xCircle, TrendingUp, CreditCard, Wallet, Banknote, ShoppingBag,
  DollarSign, PieChart, Filter, Download, FileSpreadsheet, Calendar
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
  
  // Filtros de fecha para reportes
  const [reportDateStart, setReportDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportDateEnd, setReportDateEnd] = useState(new Date().toISOString().split('T')[0]);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const canSeeAdminTabs = useMemo(() => {
    if (!session?.email) return false;
    const email = session.email.toLowerCase();
    return email === 'admin1@sanjose.pe' || email === 'soporte@facturaclic.pe';
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

      // Obtener sesiones en el rango
      const sessions = await client.searchRead('pos.session', 
        [['config_id', 'in', configIds], ['start_at', '>=', dateStart + ' 00:00:00'], ['start_at', '<=', dateEnd + ' 23:59:59']], 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );

      // Obtener pedidos y pagos
      const orders = await client.searchRead('pos.order', 
        [['date_order', '>=', dateStart + ' 00:00:00'], ['date_order', '<=', dateEnd + ' 23:59:59']], 
        ['amount_total', 'session_id', 'config_id', 'payment_ids'],
        { limit: 2000 }
      );

      const paymentIds = orders.flatMap(o => o.payment_ids);
      let payments: any[] = [];
      if (paymentIds.length > 0) {
        payments = await client.searchRead('pos.payment', [['id', 'in', paymentIds]], ['amount', 'payment_method_id', 'pos_order_id']);
      }

      // Consolidar datos por Configuración
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

        stats[config.id] = {
          total: configOrders.reduce((a, b) => a + b.amount_total, 0),
          orderCount: configOrders.length,
          isOpened: latestSession?.state === 'opened' || latestSession?.state === 'opening_control',
          openedBy: latestSession?.user_id?.[1] || '---',
          cashBalance: latestSession?.cash_register_balance_end_real || 0,
          payments: paymentBreakdown,
          sessions: configSessions, // Guardamos todas las sesiones del periodo
          lastClosing: latestSession?.stop_at ? new Date(latestSession.stop_at).toLocaleString() : '---'
        };
      }
      setPosSalesData(stats);

      // Productos más vendidos (Top 10)
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

  // Función para exportar un Excel profesional de una Sede específica
  const exportSedeExcel = (config: any) => {
    const data = posSalesData[config.id];
    if (!data) return;

    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen de Sesiones
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
    const wsSessions = XLSX.utils.json_to_sheet(sessionData);
    XLSX.utils.book_append_sheet(wb, wsSessions, "Detalle de Sesiones");

    // Hoja 2: Métodos de Pago
    const paymentData = Object.entries(data.payments).map(([method, amount]) => ({
      'Método de Pago': method,
      'Monto Total': amount
    }));
    const wsPayments = XLSX.utils.json_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, wsPayments, "Resumen de Pagos");

    XLSX.writeFile(wb, `Reporte_SJS_${config.name}_${reportDateStart}.xlsx`);
  };

  // Función para exportar un Excel consolidado de toda la red
  const exportConsolidadoExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = posConfigs.map(config => {
      const d = posSalesData[config.id] || {};
      return {
        'Sede': config.name,
        'Estado': d.isOpened ? 'ABIERTA' : 'CERRADA',
        'Responsable Actual': d.openedBy,
        'Venta Total': d.total || 0,
        'Tickets': d.orderCount || 0,
        'Balance Efectivo': d.cashBalance || 0,
        'Último Cierre': d.lastClosing
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Consolidado de Ventas");
    
    // Añadir Top Productos
    const wsTop = XLSX.utils.json_to_sheet(bestSellers.map(b => ({ 'Producto': b.name, 'Cantidad': b.qty, 'Monto Total': b.total })));
    XLSX.utils.book_append_sheet(wb, wsTop, "Top Productos Red");

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
    } catch (e: any) {
      setErrorLog("Error de conexión: " + e.message);
    } finally { setLoading(false); }
  }, [client, config.apiKey, fetchMyRequests, canSeeAdminTabs, fetchPosStats]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    setErrorLog(null);
    try {
      const adminUid = await client.authenticate(config.user, config.apiKey);
      const companies = await client.searchRead('res.company', [['name', '=', config.companyName]], ['id', 'name'], { limit: 1 });
      const userSearch = await client.searchRead('res.users', [['login', '=', loginInput]], ['id', 'name', 'login', 'email'], { limit: 1 });
      if (!userSearch.length) throw new Error("Usuario no encontrado.");
      const user = userSearch[0];
      const sessionData = { id: adminUid, odoo_user_id: user.id, name: user.name, email: user.email, company_id: companies[0]?.id, company_name: config.companyName };
      setSession(sessionData);
      await loadAppData(adminUid, sessionData.company_id, user.id);
      setView('app');
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
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
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{activeTab === 'sedes' ? 'Inteligencia de Red SJS' : 'Dashboard Operativo'}</h2>
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
            {activeTab === 'sedes' && (
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
                      <p className="text-2xl font-black text-odoo-success">{posConfigs.filter(c => posSalesData[c.id]?.isOpened).length}</p>
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
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abierta por</p><p className="text-xs font-black text-gray-700">{sales.openedBy || '---'}</p></div>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance Efectivo</p><p className="text-sm font-black text-amber-500">S/ {Number(sales.cashBalance || 0).toFixed(2)}</p></div>
                               <div className="flex justify-between items-center pt-4 border-t border-gray-50"><p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">Venta Total</p><p className="text-lg font-black text-gray-800">S/ {Number(sales.total || 0).toFixed(2)}</p></div>
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                               <button onClick={() => exportSedeExcel(config)} className="text-[10px] font-black text-odoo-primary flex items-center gap-2 hover:underline"><Download size={14}/> EXPORTAR EXCEL</button>
                               <ChevronRight size={18} className="text-gray-300"/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-8">
                     {selectedPosDetail ? (
                       <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl o-animate-fade">
                          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={20} className="text-odoo-primary"/> AUDITORÍA DE CAJA</h3>
                          <div className="space-y-6">
                             <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Botica Seleccionada</p>
                                <p className="text-sm font-black text-odoo-primary uppercase">{selectedPosDetail.name}</p>
                             </div>
                             <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desglose por Métodos</p>
                                {Object.entries(posSalesData[selectedPosDetail.id]?.payments || {}).map(([method, amount]: [string, any]) => (
                                  <div key={method} className="flex justify-between items-center">
                                     <div className="flex items-center gap-3">
                                        {method.toLowerCase().includes('efectivo') ? <Banknote size={16} className="text-green-500"/> : <CreditCard size={16} className="text-blue-500"/>}
                                        <span className="text-[11px] font-bold text-gray-600">{method}</span>
                                     </div>
                                     <span className="text-[11px] font-black text-gray-800">S/ {Number(amount).toFixed(2)}</span>
                                  </div>
                                ))}
                             </div>
                             <div className="pt-6 border-t border-gray-50 space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Últimas Sesiones</p>
                                {posSalesData[selectedPosDetail.id]?.sessions.slice(0, 3).map((s: any) => (
                                  <div key={s.id} className="text-[10px] p-2 bg-gray-50 rounded-lg flex justify-between">
                                     <span>Sesión #{s.id}</span>
                                     <span className="font-black text-odoo-primary">S/ {s.cash_register_balance_end_real.toFixed(2)}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                     ) : (
                       <div className="bg-gray-100/50 p-12 rounded-[3rem] border border-dashed border-gray-200 text-center">
                          <Filter size={40} className="mx-auto text-gray-300 mb-4"/>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccione una sede para auditar sus sesiones</p>
                       </div>
                     )}

                     <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><TrendingUp size={20} className="text-odoo-success"/> TOP VENTAS RED SJS</h3>
                        <div className="space-y-6">
                           {bestSellers.map((item, i) => (
                             <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[10px] font-black">{i+1}</div>
                                   <p className="text-[10px] font-black uppercase truncate max-w-[100px]">{item.name}</p>
                                </div>
                                <p className="text-[11px] font-black text-odoo-success">S/ {Number(item.total).toFixed(2)}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'dashboard' && <div className="max-w-5xl mx-auto py-20 text-center"><h3 className="text-2xl font-black text-gray-800">¡Bienvenido al Centro de Operaciones SJS!</h3><p className="text-gray-400">Seleccione una pestaña lateral para comenzar.</p></div>}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
