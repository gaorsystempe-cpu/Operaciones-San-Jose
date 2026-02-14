
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building, Truck, MoveHorizontal, Info, AlertTriangle,
  Clock, CheckCircle2, xCircle, TrendingUp, CreditCard, Wallet, Banknote, ShoppingBag,
  DollarSign, PieChart, Filter, Download, FileSpreadsheet, Calendar, Users, ListFilter,
  TrendingDown, TrendingUp as TrendingUpIcon, Target
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
  
  const [selectedPosConfig, setSelectedPosConfig] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  
  // Usar fecha local para evitar problemas de UTC en el filtro inicial
  const getLocalDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [reportDateStart, setReportDateStart] = useState(getLocalDate());
  const [reportDateEnd, setReportDateEnd] = useState(getLocalDate());

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const canSeeAdminTabs = useMemo(() => {
    if (!session?.email) return false;
    const email = session.email.toLowerCase();
    const admins = ['admin1@sanjose.pe', 'soporte@facturaclic.pe', 'laura@sanjose.pe', 'l.saavedra@sanjose.pe', 'jose@sanjose.pe'];
    return admins.some(a => email.includes(a));
  }, [session]);

  const fetchPosStats = useCallback(async (start?: string, end?: string) => {
    if (!canSeeAdminTabs) return;
    setLoading(true);
    const dateStart = start || reportDateStart;
    const dateEnd = end || reportDateEnd;

    try {
      // 1. Obtener Configuraciones de POS con su ID de sesión actual (estado real de Odoo)
      const allConfigs = await client.searchRead('pos.config', [], ['name', 'id', 'current_session_id', 'current_session_state']);
      const filteredConfigs = allConfigs.filter((c: any) => {
        const name = c.name.toUpperCase();
        return (name.includes('BOTICA 1') || name.includes('BOTICA 2') || name.includes('BOTICA 3') || name.includes('BOTICA 4') || name.includes('BOTICA 0') || name.includes('BOTICA B')) &&
               !name.includes('TIENDA') && !name.includes('CRUZ') && !name.includes('P&P');
      });
      setPosConfigs(filteredConfigs);
      const configIds = filteredConfigs.map((c: any) => c.id);

      // 2. Obtener sesiones cerradas en el periodo + las sesiones abiertas actuales
      const activeSessionIds = filteredConfigs
        .map(c => c.current_session_id ? c.current_session_id[0] : null)
        .filter(id => id !== null);

      const periodSessions = await client.searchRead('pos.session', 
        ['|', ['id', 'in', activeSessionIds], '&', ['config_id', 'in', configIds], '&', ['start_at', '>=', dateStart + ' 00:00:00'], ['start_at', '<=', dateEnd + ' 23:59:59']], 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );
      const allSessionIds = periodSessions.map(s => s.id);

      // 3. Obtener Pedidos vinculados a todas estas sesiones
      let orders: any[] = [];
      if (allSessionIds.length > 0) {
        orders = await client.searchRead('pos.order', 
          [['session_id', 'in', allSessionIds]], 
          ['amount_total', 'session_id', 'config_id', 'payment_ids', 'user_id', 'date_order'],
          { limit: 5000 }
        );
      }

      // 4. Pagos y Líneas
      let payments: any[] = [];
      let orderLines: any[] = [];
      if (orders.length > 0) {
        const paymentIds = orders.flatMap(o => o.payment_ids);
        if (paymentIds.length > 0) {
          payments = await client.searchRead('pos.payment', [['id', 'in', paymentIds]], ['amount', 'payment_method_id', 'pos_order_id', 'session_id']);
        }
        orderLines = await client.searchRead('pos.order.line', 
          [['order_id', 'in', orders.map(o => o.id)]], 
          ['product_id', 'qty', 'price_subtotal_incl', 'price_subtotal', 'order_id', 'session_id'],
          { limit: 10000 }
        );
      }

      const uniqueProductIds = [...new Set(orderLines.map((l: any) => l.product_id[0]))];
      let productCosts: Record<number, number> = {};
      if (uniqueProductIds.length > 0) {
        const costsData = await client.searchRead('product.product', [['id', 'in', uniqueProductIds]], ['id', 'standard_price']);
        costsData.forEach((p: any) => { productCosts[p.id] = p.standard_price || 0; });
      }

      const stats: any = {};
      for (const config of filteredConfigs) {
        // Determinar si está abierta según la configuración del POS (más fiable)
        const isOnline = config.current_session_state === 'opened' || config.current_session_state === 'opening_control';
        const currentSessionId = config.current_session_id ? config.current_session_id[0] : null;
        
        const configSessions = periodSessions.filter(s => s.config_id[0] === config.id);
        const latestSession = configSessions[0];

        const processedSessions = configSessions.map(sess => {
          const sOrders = orders.filter(o => o.session_id[0] === sess.id);
          const sPayments = payments.filter(p => p.session_id[0] === sess.id);
          const sLines = orderLines.filter(l => l.session_id[0] === sess.id);
          
          const payBreakdown: any = {};
          sPayments.forEach(p => {
            const method = p.payment_method_id[1];
            payBreakdown[method] = (payBreakdown[method] || 0) + p.amount;
          });

          const userBreakdown: any = {};
          sOrders.forEach(o => {
            const userName = o.user_id[1];
            userBreakdown[userName] = (userBreakdown[userName] || 0) + o.amount_total;
          });

          const productAnalysis: any[] = [];
          const productGroups: Record<string, any> = {};
          sLines.forEach(l => {
            const pid = l.product_id[0];
            const pName = l.product_id[1];
            if (!productGroups[pName]) productGroups[pName] = { name: pName, qty: 0, sale: 0, cost: productCosts[pid] || 0 };
            productGroups[pName].qty += l.qty;
            productGroups[pName].sale += l.price_subtotal_incl;
          });

          Object.values(productGroups).forEach((pg: any) => {
            const totalCost = pg.qty * pg.cost;
            const profit = pg.sale - totalCost;
            const margin = pg.sale > 0 ? (profit / pg.sale) * 100 : 0;
            productAnalysis.push({
              'Producto': pg.name,
              'Cantidad': pg.qty,
              'Venta Total (S/)': Number(pg.sale.toFixed(2)),
              'Costo Total (S/)': Number(totalCost.toFixed(2)),
              'Ganancia (S/)': Number(profit.toFixed(2)),
              'Margen %': Number(margin.toFixed(2))
            });
          });

          return {
            ...sess,
            total_vta: sOrders.reduce((a, b) => a + b.amount_total, 0),
            order_count: sOrders.length,
            payments: payBreakdown,
            users: userBreakdown,
            productAnalysis: productAnalysis
          };
        });

        // Filtrar órdenes que pertenezcan a las sesiones del periodo para esta config
        const relevantConfigSessionIds = configSessions.map(s => s.id);
        const configPeriodOrders = orders.filter(o => relevantConfigSessionIds.includes(o.session_id[0]));

        stats[config.id] = {
          day_total: configPeriodOrders.reduce((a, b) => a + b.amount_total, 0),
          day_order_count: configPeriodOrders.length,
          isOpened: isOnline,
          openedBy: isOnline && latestSession ? latestSession.user_id[1] : '---',
          cashBalance: latestSession?.cash_register_balance_end_real || 0,
          sessions: processedSessions
        };
      }
      setPosSalesData(stats);

    } catch (e) {
      console.error("Error sincronización SJS:", e);
      setErrorLog("Fallo de red Odoo v18");
    } finally {
      setLoading(false);
    }
  }, [client, canSeeAdminTabs, reportDateStart, reportDateEnd]);

  const exportSessionExcel = (sess: any, configName: string) => {
    const wb = XLSX.utils.book_new();
    const resumen = [
      { 'CAMPO': 'ID SESIÓN', 'VALOR': sess.id },
      { 'CAMPO': 'BOTICA', 'VALOR': configName },
      { 'CAMPO': 'RESPONSABLE', 'VALOR': sess.user_id[1] },
      { 'CAMPO': 'APERTURA', 'VALOR': sess.start_at },
      { 'CAMPO': 'CIERRE', 'VALOR': sess.stop_at || 'TURNO ABIERTO' },
      { 'CAMPO': 'TOTAL VENTA', 'VALOR': 'S/ ' + sess.total_vta.toFixed(2) },
      { 'CAMPO': 'TRANSACCIONES', 'VALOR': sess.order_count },
      { 'CAMPO': '', 'VALOR': '' },
      { 'CAMPO': '--- ARQUEO ---', 'VALOR': '' },
      ...Object.entries(sess.payments).map(([m, a]) => ({ 'CAMPO': m, 'VALOR': 'S/ ' + Number(a).toFixed(2) }))
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Auditoría Financiera");
    if (sess.productAnalysis?.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sess.productAnalysis), "Rentabilidad Detalle");
    }
    XLSX.writeFile(wb, `Audit_SJS_${configName}_Session_${sess.id}.xlsx`);
  };

  const exportConsolidadoExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = posConfigs.map(config => {
      const d = posSalesData[config.id] || {};
      return {
        'Sede': config.name,
        'Venta Acumulada Periodo': d.day_total || 0,
        'Tickets': d.day_order_count || 0,
        'Estado Real': d.isOpened ? 'ABIERTA' : 'CERRADA',
        'Cajero(a)': d.openedBy || '---'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Consolidado Red");
    XLSX.writeFile(wb, `Consolidado_SanJose_${reportDateStart}.xlsx`);
  };

  const currentSessions = useMemo(() => {
    if (!selectedPosConfig || !posSalesData[selectedPosConfig.id]) return [];
    return posSalesData[selectedPosConfig.id].sessions;
  }, [selectedPosConfig, posSalesData]);

  const activeSession = useMemo(() => {
    if (!selectedSessionId) return currentSessions[0];
    return currentSessions.find((s: any) => s.id === selectedSessionId) || currentSessions[0];
  }, [selectedSessionId, currentSessions]);

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
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
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
    <div className="h-screen flex flex-col bg-[#F9FAFC] text-odoo-text overflow-hidden font-sans">
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Control Profesional Odoo v18</p>
             </div>
             {activeTab === 'sedes' && (
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                     <Calendar size={14} className="text-odoo-primary"/>
                     <input type="date" value={reportDateStart} onChange={e => setReportDateStart(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <span className="text-[11px] font-black opacity-30">a</span>
                     <input type="date" value={reportDateEnd} onChange={e => setReportDateEnd(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <button onClick={() => fetchPosStats()} className="p-1 hover:bg-white rounded-lg transition-all text-odoo-primary active:scale-90 transition-transform"><Search size={14}/></button>
                  </div>
                  <button onClick={exportConsolidadoExcel} className="o-btn-secondary flex items-center gap-2 border-green-200 text-green-600 font-black text-[10px] hover:bg-green-50 shadow-sm active:scale-95 transition-all">
                    <FileSpreadsheet size={16}/> EXPORTAR CONSOLIDADO
                  </button>
               </div>
             )}
          </header>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#F9FAFC]">
            {activeTab === 'sedes' && (
              <div className="max-w-7xl mx-auto space-y-12 o-animate-fade pb-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Red Periodo</p>
                      <p className="text-2xl font-black text-gray-800">S/ {Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.day_total || 0), 0)).toFixed(2)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Turnos</p>
                      <p className="text-2xl font-black text-odoo-primary">{Object.values(posSalesData).reduce((a: number, b: any) => a + (b.sessions?.length || 0), 0)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cajas Activas</p>
                      <p className="text-2xl font-black text-odoo-success">{posConfigs.filter(c => posSalesData[c.id]?.isOpened).length} / {posConfigs.length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectivo Turno Actual</p>
                      <p className="text-2xl font-black text-amber-500">S/ {Number(Object.values(posSalesData).reduce((a: number, b: any) => a + (b.cashBalance || 0), 0)).toFixed(2)}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {posConfigs.map(config => {
                        const sales = posSalesData[config.id] || {};
                        const isOnline = sales.isOpened;
                        return (
                          <div key={config.id} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all text-left group ${selectedPosConfig?.id === config.id ? 'ring-4 ring-odoo-primary/10 border-odoo-primary' : 'hover:border-odoo-primary/30'}`}>
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex items-center gap-3">
                                  <div className={`w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-odoo-success animate-pulse shadow-[0_0_10px_rgba(0,160,157,0.5)]' : 'bg-gray-200'}`}></div>
                                  <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{config.name}</h4>
                               </div>
                               <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                 {isOnline ? 'ABIERTA' : 'CERRADA'}
                               </span>
                            </div>
                            <div className="space-y-4 cursor-pointer" onClick={() => { setSelectedPosConfig(config); setSelectedSessionId(null); }}>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable Actual</p><p className="text-xs font-black text-gray-700">{sales.openedBy || '---'}</p></div>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Real Odoo</p><p className="text-sm font-black text-amber-500">S/ {Number(sales.cashBalance || 0).toFixed(2)}</p></div>
                               <div className="flex justify-between items-center pt-4 border-t border-gray-50"><p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">Venta Periodo</p><p className="text-lg font-black text-gray-800">S/ {Number(sales.day_total || 0).toFixed(2)}</p></div>
                            </div>
                            <div className="mt-6 flex items-center justify-end">
                               <ChevronRight size={18} className={`transition-all ${selectedPosConfig?.id === config.id ? 'text-odoo-primary transform translate-x-1' : 'text-gray-300'}`}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                     {selectedPosConfig ? (
                       <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl o-animate-fade space-y-8">
                          <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ListFilter size={16}/> TURNOS DEL PERIODO</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                               {currentSessions.map((s: any) => (
                                 <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${activeSession?.id === s.id ? 'bg-odoo-primary text-white border-odoo-primary shadow-lg' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                       <p className="text-[10px] font-black uppercase tracking-widest">Sesión #{s.id}</p>
                                       <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${s.state === 'opened' ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'}`}>{s.state === 'opened' ? 'ABIERTA' : 'CERRADA'}</span>
                                    </div>
                                    <p className="text-xs font-black truncate">{s.user_id[1]}</p>
                                    <div className="flex justify-between items-end mt-3">
                                       <div className="flex flex-col">
                                          <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter">Apertura</span>
                                          <span className="text-[9px] font-bold">{new Date(s.start_at).toLocaleDateString()} {new Date(s.start_at).toLocaleTimeString()}</span>
                                       </div>
                                       <span className="text-sm font-black">S/ {s.total_vta.toFixed(2)}</span>
                                    </div>
                                 </button>
                               ))}
                               {currentSessions.length === 0 && <p className="text-center py-10 text-[10px] font-black text-gray-300 uppercase italic">Sin datos para este rango</p>}
                            </div>
                          </div>

                          {activeSession && (
                            <div className="pt-8 border-t border-gray-100 space-y-8 o-animate-fade">
                               <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2"><PieChart size={20} className="text-odoo-primary"/> ARQUEO TURNO</h3>
                                  <button onClick={() => exportSessionExcel(activeSession, selectedPosConfig.name)} className="bg-odoo-primary text-white px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 hover:brightness-110 shadow-lg active:scale-95 transition-all">
                                    <Download size={14}/> AUDITORÍA EXCEL
                                  </button>
                               </div>

                               <div className="space-y-4">
                                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                                     <p className="text-[10px] font-black text-amber-700 uppercase">Inicio Caja</p>
                                     <p className="text-xs font-black text-amber-700">S/ {activeSession.cash_register_balance_start.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                     {Object.entries(activeSession.payments || {}).map(([method, amount]: [string, any]) => (
                                       <div key={method} className="flex justify-between items-center px-2">
                                          <div className="flex items-center gap-2">
                                             {method.toLowerCase().includes('efectivo') ? <Banknote size={14} className="text-green-500"/> : <CreditCard size={14} className="text-blue-500"/>}
                                             <span className="text-[11px] font-bold text-gray-600">{method}</span>
                                          </div>
                                          <span className="text-[11px] font-black text-gray-800">S/ {Number(amount).toFixed(2)}</span>
                                       </div>
                                     ))}
                                  </div>

                                  <div className="pt-6 border-t border-gray-50">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16}/> VENTAS POR PERSONAL</h3>
                                    <div className="space-y-3">
                                       {Object.entries(activeSession.users || {}).map(([user, amount]: [string, any]) => (
                                         <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                            <p className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[150px]">{user}</p>
                                            <p className="text-[11px] font-black text-odoo-primary">S/ {Number(amount).toFixed(2)}</p>
                                         </div>
                                       ))}
                                    </div>
                                  </div>

                                  {activeSession.productAnalysis && (
                                    <div className="pt-6 border-t border-gray-50">
                                       <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16}/> UTILIDAD ESTIMADA</h3>
                                       <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                                          <div>
                                            <p className="text-[8px] font-black text-green-700 uppercase tracking-tighter">Margen Bruto Real</p>
                                            <p className="text-lg font-black text-green-800">S/ {activeSession.productAnalysis.reduce((acc: any, curr: any) => acc + curr['Ganancia (S/)'], 0).toFixed(2)}</p>
                                          </div>
                                          <TrendingUpIcon size={24} className="text-green-500 opacity-40"/>
                                       </div>
                                    </div>
                                  )}
                               </div>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="bg-gray-100/50 p-12 rounded-[3rem] border border-dashed border-gray-200 text-center">
                          <Filter size={40} className="mx-auto text-gray-300 mb-4"/>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccione una botica para ver auditoría en tiempo real</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-8 o-animate-fade py-10">
                <div className="bg-odoo-primary text-white p-12 rounded-[3rem] shadow-xl relative overflow-hidden">
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Operaciones SJS</h3>
                  <p className="text-sm opacity-80 max-w-md font-medium mb-8">Sistema centralizado para el abastecimiento de sedes y control financiero en tiempo real.</p>
                  <div className="flex gap-4">
                    <button onClick={() => setActiveTab('purchase')} className="bg-white text-odoo-primary px-8 py-3 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-transform shadow-lg">Nuevo Pedido</button>
                    {canSeeAdminTabs && <button onClick={() => setActiveTab('sedes')} className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-white/20 transition-all">Ver Auditoría Red</button>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 o-animate-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Botica de Destino</label>
                    <select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                      <option value="">-- SELECCIONAR DESTINO --</option>
                      {warehouses.filter(w => w.id !== principal1?.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Nota para Principal1</label>
                    <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" placeholder="Urgente, reposición mensual, etc..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-[11px] font-black uppercase text-odoo-primary tracking-widest">Items del Pedido</h3>
                    <button onClick={() => { fetchProducts(); setShowProductModal(true); }} className="bg-odoo-primary text-white px-6 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:brightness-110 shadow-lg transition-all"><Plus size={18}/> AGREGAR PRODUCTO</button>
                  </div>
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex-1">
                          <p className="font-black text-sm text-gray-800 uppercase">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">REF: {item.default_code || '---'}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-bold text-gray-400 mb-1 uppercase tracking-widest">CANTIDAD</span>
                            <input type="number" className="w-20 text-center bg-white border border-gray-100 rounded-xl p-2 font-black text-lg outline-none" value={item.qty} min="1" onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))} />
                          </div>
                          <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-300 hover:text-rose-500 transition-colors pt-4"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-widest italic">El carrito está vacío</p>}
                  </div>
                  {cart.length > 0 && (
                    <button onClick={submitToOdoo} disabled={loading || !selectedWarehouseId} className="w-full bg-odoo-primary text-white py-5 rounded-[2rem] font-black text-xs tracking-[0.2em] shadow-2xl mt-8 flex justify-center items-center gap-3">
                      {loading ? <Loader2 className="animate-spin" size={24}/> : <><Send size={20}/> ENVIAR SOLICITUD A ODOO</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="max-w-5xl mx-auto space-y-4 o-animate-fade py-6">
                {myRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-odoo-primary/20 transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusColor(req.state)} bg-opacity-20`}>
                        <Package size={28}/>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight">{req.name}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(req.state)}`}>
                            {req.state === 'done' ? 'ENTREGADO' : req.state === 'assigned' ? 'EN CAMINO' : req.state === 'confirmed' ? 'PENDIENTE' : req.state}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Destino: <span className="text-gray-600">{req.location_dest_id?.[1]}</span></p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase italic">Ref: {req.origin || 'App Mobile'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Programado</p>
                       <p className="text-xs font-black text-gray-700">{new Date(req.scheduled_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {myRequests.length === 0 && (
                  <div className="text-center py-20">
                    <ClipboardList size={48} className="mx-auto text-gray-200 mb-4"/>
                    <p className="text-gray-400 font-black uppercase text-xs tracking-[0.2em]">No tienes solicitudes recientes</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Catálogo PRINCIPAL1 SJS</h3>
               <button onClick={() => setShowProductModal(false)} className="p-3 bg-white rounded-2xl text-gray-300 hover:text-rose-500 transition-all shadow-sm"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300"/>
                <input autoFocus type="text" className="w-full pl-12 pr-4 py-4.5 bg-gray-50 rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none text-sm font-black" placeholder="Buscar por Nombre, Código o Marca..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
              {products.filter(p => (p.name + (p.default_code || '')).toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => {
                  const exists = cart.find(c => c.id === p.id);
                  if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                  else setCart([...cart, {...p, qty: 1}]);
                  setShowProductModal(false);
                }} className="w-full flex items-center justify-between p-5 bg-white hover:bg-odoo-primary/5 rounded-[1.5rem] border border-transparent transition-all text-left mb-2 group">
                  <div>
                    <p className="font-black text-sm text-gray-800 uppercase group-hover:text-odoo-primary">{p.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">SJS-REF: {p.default_code || 'SIN CÓDIGO'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-odoo-success group-hover:scale-110 transition-transform">{Math.floor(p.qty_available)}</p>
                    <p className="text-[8px] font-black text-gray-400 uppercase">Stock</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {orderComplete && (
        <div className="fixed inset-0 z-[300] bg-odoo-primary flex items-center justify-center p-6 text-white text-center">
           <div className="max-w-md space-y-6 o-animate-fade">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"><Check size={60}/></div>
              <h3 className="text-4xl font-black uppercase tracking-tight">¡Pedido Enviado!</h3>
              <p className="text-lg opacity-80 font-medium">Tu solicitud ha sido registrada en Odoo y está lista para ser procesada por el almacén central.</p>
              <button onClick={() => { setOrderComplete(false); setActiveTab('requests'); }} className="bg-white text-odoo-primary px-10 py-4 rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:scale-105 transition-transform mt-8">Ver Seguimiento</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
