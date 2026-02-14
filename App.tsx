
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
  
  const getPeruDate = () => {
    const d = new Date();
    const peruTime = new Date(d.getTime() - (5 * 60 * 60 * 1000));
    return peruTime.toISOString().split('T')[0];
  };

  const [reportDateStart, setReportDateStart] = useState(getPeruDate());
  const [reportDateEnd, setReportDateEnd] = useState(getPeruDate());

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const canSeeAdminTabs = useMemo(() => {
    if (!session?.email) return false;
    const email = session.email.toLowerCase();
    const admins = ['admin1@sanjose.pe', 'soporte@facturaclic.pe', 'laura@sanjose.pe', 'l.saavedra@sanjose.pe', 'jose@sanjose.pe', 'jose.herrera@sanjose.pe'];
    return admins.some(a => email.includes(a)) || email.includes('jose');
  }, [session]);

  const fetchPosStats = useCallback(async (start?: string, end?: string) => {
    if (!canSeeAdminTabs) return;
    setLoading(true);
    const dateStart = start || reportDateStart;
    const dateEnd = end || reportDateEnd;

    try {
      // 1. Obtener Configuraciones de POS - Odoo v18 nos dice el estado real aquí
      const allConfigs = await client.searchRead('pos.config', [], ['name', 'id', 'current_session_id', 'current_session_state']);
      const filteredConfigs = allConfigs.filter((c: any) => {
        const name = c.name.toUpperCase();
        return (name.includes('BOTICA 1') || name.includes('BOTICA 2') || name.includes('BOTICA 3') || name.includes('BOTICA 4') || name.includes('BOTICA 0') || name.includes('BOTICA B')) &&
               !name.includes('TIENDA') && !name.includes('CRUZ') && !name.includes('P&P');
      });
      setPosConfigs(filteredConfigs);

      // 2. Buscar todas las sesiones que estén abiertas O que sean del rango de fechas
      // Importante: No filtramos por fecha las sesiones abiertas para no perder turnos que cruzaron medianoche
      const sessionDomain = [
        '&', ['config_id', 'in', filteredConfigs.map(c => c.id)],
        '|', 
          ['state', 'in', ['opened', 'opening_control', 'closing_control']], 
          '&', ['start_at', '>=', dateStart + ' 00:00:00'], ['start_at', '<=', dateEnd + ' 23:59:59']
      ];

      const sessions = await client.searchRead('pos.session', 
        sessionDomain, 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );
      const allSessionIds = sessions.map(s => s.id);

      // 3. Obtener Pedidos, Pagos y Líneas
      let orders: any[] = [];
      let payments: any[] = [];
      let orderLines: any[] = [];
      
      if (allSessionIds.length > 0) {
        orders = await client.searchRead('pos.order', [['session_id', 'in', allSessionIds]], ['amount_total', 'session_id', 'config_id', 'payment_ids', 'user_id', 'date_order'], { limit: 8000 });
        
        if (orders.length > 0) {
          const paymentIds = orders.flatMap(o => o.payment_ids);
          if (paymentIds.length > 0) {
            payments = await client.searchRead('pos.payment', [['id', 'in', paymentIds]], ['amount', 'payment_method_id', 'pos_order_id', 'session_id']);
          }
          orderLines = await client.searchRead('pos.order.line', [['order_id', 'in', orders.map(o => o.id)]], ['product_id', 'qty', 'price_subtotal_incl', 'price_subtotal', 'order_id', 'session_id'], { limit: 15000 });
        }
      }

      // 4. Obtener Costos para Utilidad
      const uniqueProductIds = [...new Set(orderLines.map((l: any) => l.product_id[0]))];
      let productCosts: Record<number, number> = {};
      if (uniqueProductIds.length > 0) {
        const costsData = await client.searchRead('product.product', [['id', 'in', uniqueProductIds]], ['id', 'standard_price']);
        costsData.forEach((p: any) => { productCosts[p.id] = p.standard_price || 0; });
      }

      const stats: any = {};
      for (const config of filteredConfigs) {
        // El estado real de Odoo 18
        const isOnline = config.current_session_state === 'opened' || config.current_session_state === 'opening_control';
        const configSessions = sessions.filter(s => s.config_id[0] === config.id);
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

          const productGroups: Record<string, any> = {};
          sLines.forEach(l => {
            const pid = l.product_id[0];
            const pName = l.product_id[1];
            if (!productGroups[pName]) productGroups[pName] = { name: pName, qty: 0, sale: 0, cost: productCosts[pid] || 0 };
            productGroups[pName].qty += l.qty;
            productGroups[pName].sale += l.price_subtotal_incl;
          });

          const productAnalysis = Object.values(productGroups).map((pg: any) => {
            const totalCost = pg.qty * pg.cost;
            const profit = pg.sale - totalCost;
            return {
              'Producto': pg.name,
              'Cantidad': pg.qty,
              'Venta Total (S/)': Number(pg.sale.toFixed(2)),
              'Costo Total (S/)': Number(totalCost.toFixed(2)),
              'Ganancia (S/)': Number(profit.toFixed(2)),
              'Margen %': pg.sale > 0 ? Number(((profit / pg.sale) * 100).toFixed(2)) : 0
            };
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

        // La venta del periodo es la suma de las sesiones cargadas
        const periodTotal = processedSessions.reduce((acc, s) => acc + s.total_vta, 0);

        stats[config.id] = {
          day_total: periodTotal,
          day_order_count: processedSessions.reduce((acc, s) => acc + s.order_count, 0),
          isOpened: isOnline,
          openedBy: isOnline && latestSession ? latestSession.user_id[1] : '---',
          cashBalance: latestSession?.cash_register_balance_end_real || 0,
          sessions: processedSessions
        };
      }
      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));

    } catch (e) {
      console.error("Error Sincronización:", e);
      setErrorLog("Error de red: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  }, [client, canSeeAdminTabs, reportDateStart, reportDateEnd]);

  // Funciones de Excel
  const exportSessionExcel = (sess: any, configName: string) => {
    const wb = XLSX.utils.book_new();
    const resumen = [
      { 'CAMPO': 'ID SESIÓN', 'VALOR': sess.id },
      { 'CAMPO': 'BOTICA', 'VALOR': configName },
      { 'CAMPO': 'RESPONSABLE', 'VALOR': sess.user_id[1] },
      { 'CAMPO': 'ESTADO', 'VALOR': sess.state.toUpperCase() },
      { 'CAMPO': 'APERTURA', 'VALOR': sess.start_at },
      { 'CAMPO': 'CIERRE', 'VALOR': sess.stop_at || 'TURNO EN CURSO' },
      { 'CAMPO': 'VENTA TOTAL', 'VALOR': 'S/ ' + sess.total_vta.toFixed(2) },
      { 'CAMPO': 'TRANSACCIONES', 'VALOR': sess.order_count },
      { 'CAMPO': '', 'VALOR': '' },
      ...Object.entries(sess.payments).map(([m, a]) => ({ 'CAMPO': 'Pago: ' + m, 'VALOR': 'S/ ' + Number(a).toFixed(2) }))
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Arqueo");
    if (sess.productAnalysis?.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sess.productAnalysis), "Detalle Rentabilidad");
    }
    XLSX.writeFile(wb, `Audit_SJS_${configName.replace(' ','_')}_${sess.id}.xlsx`);
  };

  const exportConsolidadoExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = posConfigs.map(config => {
      const d = posSalesData[config.id] || {};
      return {
        'Botica': config.name,
        'Venta Acumulada Periodo': d.day_total || 0,
        'Tickets': d.day_order_count || 0,
        'Estado Odoo': d.isOpened ? 'EN LÍNEA' : 'CERRADA',
        'Responsable': d.openedBy || '---',
        'Fondo de Caja': d.cashBalance || 0
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Consolidado");
    XLSX.writeFile(wb, `Consolidado_SanJose_${reportDateStart}.xlsx`);
  };

  const currentSessions = useMemo(() => {
    if (!selectedPosConfig || !posSalesData[selectedPosConfig.id]) return [];
    return posSalesData[selectedPosConfig.id].sessions;
  }, [selectedPosConfig, posSalesData]);

  const activeSessionDetail = useMemo(() => {
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
             <div className="flex items-center gap-6">
                <div>
                  <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                    {activeTab === 'sedes' ? 'Auditoría Red SJS v18' : activeTab === 'purchase' ? 'Generar Solicitud' : activeTab === 'requests' ? 'Seguimiento' : 'Dashboard Operativo'}
                  </h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    {lastSync ? <><Clock size={10} className="text-odoo-success"/> Actualizado: {lastSync}</> : 'Control Profesional Odoo'}
                  </p>
                </div>
                {activeTab === 'sedes' && (
                  <button onClick={() => fetchPosStats()} disabled={loading} className={`p-3 bg-odoo-primary text-white rounded-2xl shadow-lg active:scale-95 transition-all ${loading ? 'opacity-50' : 'hover:brightness-110'}`}>
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                  </button>
                )}
             </div>
             
             {activeTab === 'sedes' && (
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                     <Calendar size={14} className="text-odoo-primary"/>
                     <input type="date" value={reportDateStart} onChange={e => setReportDateStart(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <span className="text-[11px] font-black opacity-30">a</span>
                     <input type="date" value={reportDateEnd} onChange={e => setReportDateEnd(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28"/>
                     <button onClick={() => fetchPosStats()} className="p-1.5 bg-odoo-primary/10 hover:bg-odoo-primary/20 rounded-lg text-odoo-primary"><Search size={14}/></button>
                  </div>
                  <button onClick={exportConsolidadoExcel} className="o-btn-secondary flex items-center gap-2 border-green-200 text-green-600 font-black text-[10px] hover:bg-green-50 shadow-sm active:scale-95">
                    <FileSpreadsheet size={16}/> DESCARGAR RED
                  </button>
               </div>
             )}
          </header>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#F9FAFC]">
            {activeTab === 'sedes' && (
              <div className="max-w-7xl mx-auto space-y-12 o-animate-fade pb-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Red Hoy</p>
                      <p className="text-2xl font-black text-gray-800">S/ {Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.day_total || 0), 0)).toFixed(2)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cajas Activas</p>
                      <p className="text-2xl font-black text-odoo-success flex items-center gap-2">
                        {posConfigs.filter(c => posSalesData[c.id]?.isOpened).length} / {posConfigs.length}
                        <Activity size={20} className="animate-pulse text-odoo-success opacity-50"/>
                      </p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tickets Emitidos</p>
                      <p className="text-2xl font-black text-odoo-primary">{Object.values(posSalesData).reduce((a: number, b: any) => a + (b.day_order_count || 0), 0)}</p>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Estimado</p>
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
                                  <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-odoo-success animate-pulse shadow-[0_0_12px_rgba(0,160,157,0.6)]' : 'bg-gray-200'}`}></div>
                                  <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{config.name}</h4>
                               </div>
                               <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isOnline ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400'}`}>
                                 {isOnline ? 'EN LÍNEA' : 'CERRADA'}
                               </span>
                            </div>
                            <div className="space-y-4 cursor-pointer" onClick={() => { setSelectedPosConfig(config); setSelectedSessionId(null); }}>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable</p><p className="text-xs font-black text-gray-700">{sales.openedBy || '---'}</p></div>
                               <div className="flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Actual</p><p className="text-sm font-black text-amber-500">S/ {Number(sales.cashBalance || 0).toFixed(2)}</p></div>
                               <div className="flex justify-between items-center pt-4 border-t border-gray-50"><p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">Venta del Día</p><p className="text-xl font-black text-gray-800">S/ {Number(sales.day_total || 0).toFixed(2)}</p></div>
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
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><ListFilter size={16}/> TURNOS RECIENTES</h3>
                               <button onClick={() => fetchPosStats()} className="text-odoo-primary p-2 hover:bg-gray-50 rounded-xl transition-all"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                               {currentSessions.map((s: any) => (
                                 <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${activeSessionDetail?.id === s.id ? 'bg-odoo-primary text-white border-odoo-primary shadow-lg' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80">SESIÓN #{s.id}</p>
                                       <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${['opened', 'opening_control', 'closing_control'].includes(s.state) ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-400 text-white'}`}>
                                         {s.state === 'opened' ? 'ABIERTA' : s.state === 'closing_control' ? 'CERRANDO' : 'CERRADA'}
                                       </span>
                                    </div>
                                    <p className="text-xs font-black truncate">{s.user_id[1]}</p>
                                    <div className="flex justify-between items-end mt-3">
                                       <div className="flex flex-col">
                                          <span className="text-[8px] opacity-70 font-bold uppercase">Inicio</span>
                                          <span className="text-[9px] font-bold">{new Date(s.start_at).toLocaleTimeString('es-PE')}</span>
                                       </div>
                                       <span className="text-sm font-black">S/ {s.total_vta.toFixed(2)}</span>
                                    </div>
                                 </button>
                               ))}
                               {currentSessions.length === 0 && <p className="text-center py-10 text-[10px] font-black text-gray-300 uppercase italic">Esperando datos de Odoo...</p>}
                            </div>
                          </div>

                          {activeSessionDetail && (
                            <div className="pt-8 border-t border-gray-100 space-y-8 o-animate-fade">
                               <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2"><PieChart size={20} className="text-odoo-primary"/> AUDITORÍA</h3>
                                  <button onClick={() => exportSessionExcel(activeSessionDetail, selectedPosConfig.name)} className="bg-odoo-primary text-white px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                                    <Download size={14}/> EXPORTAR
                                  </button>
                               </div>

                               <div className="space-y-4">
                                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                     <p className="text-[10px] font-black text-amber-700 uppercase">Inicio Caja</p>
                                     <p className="text-xs font-black text-amber-700">S/ {activeSessionDetail.cash_register_balance_start.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="space-y-2 px-1">
                                     {Object.entries(activeSessionDetail.payments || {}).map(([method, amount]: [string, any]) => (
                                       <div key={method} className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                             {method.toLowerCase().includes('efectivo') ? <Banknote size={14} className="text-green-500"/> : <CreditCard size={14} className="text-blue-500"/>}
                                             <span className="text-[11px] font-bold text-gray-600">{method}</span>
                                          </div>
                                          <span className="text-[11px] font-black text-gray-800">S/ {Number(amount).toFixed(2)}</span>
                                       </div>
                                     ))}
                                  </div>

                                  <div className="pt-6 border-t border-gray-50">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16}/> VENTAS POR PERSONA</h3>
                                    <div className="space-y-2">
                                       {Object.entries(activeSessionDetail.users || {}).map(([user, amount]: [string, any]) => (
                                         <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                            <p className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[140px]">{user}</p>
                                            <p className="text-[11px] font-black text-odoo-primary">S/ {Number(amount).toFixed(2)}</p>
                                         </div>
                                       ))}
                                    </div>
                                  </div>

                                  {activeSessionDetail.productAnalysis && (
                                    <div className="pt-6 border-t border-gray-50">
                                       <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16}/> MARGEN BRUTO</h3>
                                       <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                                          <div>
                                            <p className="text-[8px] font-black text-green-700 uppercase opacity-70">Utilidad Proyectada</p>
                                            <p className="text-lg font-black text-green-800">S/ {activeSessionDetail.productAnalysis.reduce((acc: any, curr: any) => acc + curr['Ganancia (S/)'], 0).toFixed(2)}</p>
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
                       <div className="bg-gray-100/40 p-12 rounded-[3rem] border border-dashed border-gray-200 text-center">
                          <Activity size={40} className="mx-auto text-gray-300 mb-4 animate-pulse"/>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccione una caja para ver auditoría real</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-8 o-animate-fade py-10">
                <div className="bg-odoo-primary text-white p-12 rounded-[3rem] shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Operaciones SJS</h3>
                  <p className="text-sm opacity-80 max-w-md font-medium mb-8">Sistema inteligente de monitoreo. Todas las boticas sincronizadas en tiempo real con Odoo v18.</p>
                  <div className="flex gap-4 relative z-10">
                    <button onClick={() => setActiveTab('purchase')} className="bg-white text-odoo-primary px-8 py-3 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-all shadow-lg active:scale-95">Solicitar Mercadería</button>
                    {canSeeAdminTabs && <button onClick={() => setActiveTab('sedes')} className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-white/20 transition-all">Ver Red de Sedes</button>}
                  </div>
                </div>
              </div>
            )}

            {/* Pestañas de Almacén se mantienen integradas */}
            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 o-animate-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Destino (Botica)</label>
                    <select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black text-sm outline-none appearance-none" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                      <option value="">-- SELECCIONAR DESTINO --</option>
                      {warehouses.filter(w => w.id !== principal1?.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">Referencia / Glosa</label>
                    <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" placeholder="Urgente, Reposición, etc..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-[11px] font-black uppercase text-odoo-primary tracking-widest">Detalle del Pedido</h3>
                    <button onClick={() => { fetchProducts(); setShowProductModal(true); }} className="bg-odoo-primary text-white px-6 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:brightness-110 shadow-lg active:scale-95 transition-all"><Plus size={18}/> AGREGAR</button>
                  </div>
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex-1">
                          <p className="font-black text-sm text-gray-800 uppercase">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">SKU: {item.default_code || '---'}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-bold text-gray-400 mb-1 uppercase">CANT</span>
                            <input type="number" className="w-20 text-center bg-white border border-gray-100 rounded-xl p-2 font-black text-lg outline-none" value={item.qty} min="1" onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))} />
                          </div>
                          <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-300 hover:text-rose-500 transition-colors pt-4"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-widest italic">Seleccione productos para PRINCIPAL1</p>}
                  </div>
                  {cart.length > 0 && (
                    <button onClick={submitToOdoo} disabled={loading || !selectedWarehouseId} className="w-full bg-odoo-primary text-white py-5 rounded-[2rem] font-black text-xs tracking-[0.2em] shadow-2xl mt-8 flex justify-center items-center gap-3 active:scale-95 transition-all">
                      {loading ? <Loader2 className="animate-spin" size={24}/> : <><Send size={20}/> ENVIAR REQUERIMIENTO A ODOO</>}
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Destino: <span className="text-gray-600 font-black">{req.location_dest_id?.[1]}</span></p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase italic">Ref: {req.origin || 'App Web'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Día Solicitado</p>
                       <p className="text-xs font-black text-gray-700">{new Date(req.scheduled_date).toLocaleDateString('es-PE')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Catálogo Almacén</h3>
               <button onClick={() => setShowProductModal(false)} className="p-3 bg-white rounded-2xl text-gray-300 hover:text-rose-500 shadow-sm"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300"/>
                <input autoFocus type="text" className="w-full pl-12 pr-4 py-4.5 bg-gray-50 rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none text-sm font-black" placeholder="Nombre de medicamento o código..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
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
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">CÓDIGO: {p.default_code || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-odoo-success group-hover:scale-110 transition-transform">{Math.floor(p.qty_available)}</p>
                    <p className="text-[8px] font-black text-gray-400 uppercase">Disponible</p>
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
              <h3 className="text-4xl font-black uppercase tracking-tight">¡Enviado!</h3>
              <p className="text-lg opacity-80 font-medium">La solicitud ha sido registrada correctamente en Odoo.</p>
              <button onClick={() => { setOrderComplete(false); setActiveTab('requests'); }} className="bg-white text-odoo-primary px-10 py-4 rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:scale-105 transition-transform mt-8">Ver Solicitudes</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
