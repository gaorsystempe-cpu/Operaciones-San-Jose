
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar, DollarSign
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { AppConfig } from './types';

// Importación de módulos refactorizados
import { Dashboard } from './components/Dashboard';
import { AuditModule } from './components/AuditModule';
import { OrderModule } from './components/OrderModule';

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
  
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [selectedPos, setSelectedPos] = useState<any>(null);
  // Rango de fechas mejorado
  const [dateRange, setDateRange] = useState({ start: formatDate(getPeruDate()), end: formatDate(getPeruDate()) });
  
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const fetchMyOrders = useCallback(async () => {
    if (!session?.name) return;
    try {
      const orders = await client.searchRead('stock.picking', 
        [['origin', 'ilike', `PEDIDO APP - ${session.name}`]], 
        ['name', 'state', 'location_dest_id', 'scheduled_date'],
        { order: 'id desc', limit: 5 }
      );
      setMyOrders(orders);
    } catch (e) { console.error(e); }
  }, [client, session]);

  const fetchData = useCallback(async () => {
    if (view !== 'app') return;
    setLoading(true);
    try {
      const companies = await client.searchRead('res.company', [['name', '=', config.companyName]], ['id']);
      if (!companies.length) throw new Error("Compañía San José no encontrada.");
      const sanJoseId = companies[0].id;

      const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];

      // 1. Obtener Cajas
      const configs = await client.searchRead('pos.config', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'current_session_id', 'current_session_state']
      );
      const filteredConfigs = configs.filter((c: any) => 
        !blacklist.some(term => c.name.toUpperCase().includes(term))
      );
      setPosConfigs(filteredConfigs);

      // 2. Almacenes
      const ws = await client.searchRead('stock.warehouse', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'lot_stock_id', 'company_id']
      );
      setWarehouses(ws.filter((w: any) => !blacklist.some(term => w.name.toUpperCase().includes(term))));

      // 3. Sesiones en rango de fecha
      const sessionDomain = [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        ['start_at', '>=', `${dateRange.start} 00:00:00`], 
        ['start_at', '<=', `${dateRange.end} 23:59:59`]
      ];
      const sessions = await client.searchRead('pos.session', sessionDomain, 
        ['id', 'config_id', 'user_id', 'start_at', 'state', 'total_payments_amount'], 
        { order: 'start_at desc' }
      );

      const sessionIds = sessions.map(s => s.id);

      // 4. Pagos y Pedidos
      const payments = sessionIds.length > 0 ? await client.searchRead('pos.payment', 
        [['session_id', 'in', sessionIds]], 
        ['amount', 'payment_method_id', 'session_id']
      ) : [];

      const orders = sessionIds.length > 0 ? await client.searchRead('pos.order',
        [['session_id', 'in', sessionIds]],
        ['id', 'session_id', 'amount_total']
      ) : [];
      
      const orderIds = orders.map(o => o.id);
      const orderLines = orderIds.length > 0 ? await client.searchRead('pos.order.line',
        [['order_id', 'in', orderIds]],
        ['product_id', 'qty', 'price_subtotal_incl', 'order_id']
      ) : [];

      // 5. CÁLCULO DE MÁRGENES (Consultar costos de productos en lote)
      const productIds = Array.from(new Set(orderLines.map(l => l.product_id[0])));
      const productCostsData = productIds.length > 0 ? await client.searchRead('product.product',
        [['id', 'in', productIds]],
        ['id', 'standard_price']
      ) : [];
      
      const costsMap: Record<number, number> = {};
      productCostsData.forEach((p: any) => costsMap[p.id] = p.standard_price || 0);

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id[0] === conf.id);
        const confSessionIds = confSessions.map(s => s.id);
        
        // Pagos por método
        const methodStats: any = {};
        payments.filter(p => confSessionIds.includes(p.session_id[0])).forEach(p => {
          const mName = p.payment_method_id[1];
          methodStats[mName] = (methodStats[mName] || 0) + p.amount;
        });

        // Rentabilidad por POS
        const posOrders = orders.filter(o => confSessionIds.includes(o.session_id[0]));
        const posOrderIds = posOrders.map(o => o.id);
        const posLines = orderLines.filter(l => posOrderIds.includes(l.order_id[0]));
        
        let totalCost = 0;
        const productStats: any = {};
        posLines.forEach(l => {
          const pId = l.product_id[0];
          const pName = l.product_id[1];
          const cost = costsMap[pId] || 0;
          const lineCost = l.qty * cost;
          totalCost += lineCost;

          if (!productStats[pName]) productStats[pName] = { qty: 0, total: 0, cost: 0, margin: 0 };
          productStats[pName].qty += l.qty;
          productStats[pName].total += l.price_subtotal_incl;
          productStats[pName].cost += lineCost;
          productStats[pName].margin = productStats[pName].total - productStats[pName].cost;
        });

        const totalSales = confSessions.reduce((a, b) => a + (b.total_payments_amount || 0), 0);

        stats[conf.id] = {
          // Mapeo exacto de estado Odoo
          isOnline: conf.current_session_state === 'opened' || conf.current_session_state === 'opening_control',
          rawState: conf.current_session_state,
          totalSales: totalSales,
          totalCost: totalCost,
          margin: totalSales - totalCost,
          count: confSessions.length,
          sessions: confSessions,
          payments: methodStats,
          products: Object.entries(productStats)
            .map(([name, data]: [string, any]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
      fetchMyOrders();
    } catch (e: any) { 
      setErrorLog(e.message || "Fallo en sincronización Odoo."); 
    } finally { setLoading(false); }
  }, [client, view, dateRange, config.companyName, fetchMyOrders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProductSearch = async (term: string) => {
    if (term.length < 2) return;
    try {
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL1'));
      if (!mainWarehouse) return;
      const results = await client.rpcCall('object', 'execute_kw', [
        config.db, (client as any).uid, config.apiKey,
        'product.product', 'search_read',
        [['|', ['name', 'ilike', term], ['default_code', 'ilike', term], ['qty_available', '>', 0]]],
        { fields: ['name', 'default_code', 'list_price', 'qty_available', 'uom_id'], limit: 12, context: { location: mainWarehouse.lot_stock_id[0] } }
      ]);
      setProducts(results);
    } catch (e) {}
  };

  const createWarehouseOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) return alert("Seleccione botica destino.");
    setLoading(true);
    try {
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL1'));
      const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
      const pickingTypes = await client.searchRead('stock.picking.type', [['code', '=', 'internal'], ['warehouse_id', '=', mainWarehouse.id]], ['id']);
      const pickingId = await client.create('stock.picking', {
        picking_type_id: pickingTypes[0].id,
        location_id: mainWarehouse.lot_stock_id[0],
        location_dest_id: targetWarehouse.lot_stock_id[0],
        origin: `PEDIDO APP - ${session.name}`,
        company_id: mainWarehouse.company_id[0], 
        user_id: (client as any).uid
      });
      for (const item of cart) {
        await client.create('stock.move', {
          name: item.name, product_id: item.id, product_uom_qty: item.qty, product_uom: item.uom_id[0],
          picking_id: pickingId, company_id: mainWarehouse.company_id[0],
          location_id: mainWarehouse.lot_stock_id[0], location_dest_id: targetWarehouse.lot_stock_id[0],
        });
      }
      alert("Transferencia borrador creada en Odoo.");
      setCart([]); fetchMyOrders(); setActiveTab('pedidos');
    } catch (e: any) { alert("Error: " + e.message); } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error();
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name'], { limit: 1 });
      if (!user.length) throw new Error();
      setSession({ name: user[0].name });
      setView('app');
    } catch { setErrorLog("Usuario no reconocido."); } finally { setLoading(false); }
  };

  if (view === 'login') return (
    <div className="h-screen bg-[#F0F2F5] flex items-center justify-center p-6 text-odoo-text">
      <div className="bg-white w-full max-w-[440px] shadow-2xl rounded-sm border-t-4 border-odoo-primary overflow-hidden">
        <div className="p-10 space-y-8 text-center">
          <div className="w-24 h-24 bg-odoo-primary rounded-lg flex items-center justify-center text-white text-5xl font-bold italic mx-auto shadow-inner">SJ</div>
          <div><h1 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">Boticas San José</h1><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sistemas de Gestión de Activos</p></div>
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase">Credencial de Acceso</label><input type="text" className="w-full p-4 bg-gray-50 border border-gray-300 rounded outline-none font-bold focus:border-odoo-primary" placeholder="Ej. soporte" value={loginInput} onChange={e => setLoginInput(e.target.value)} required /></div>
            <button className="w-full bg-odoo-primary text-white py-4 rounded-sm font-black uppercase tracking-widest shadow-md hover:bg-[#5a3c52] transition-colors">{loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Iniciar Sesión'}</button>
          </form>
          {errorLog && <div className="text-red-600 text-[10px] font-black uppercase flex items-center gap-2 justify-center bg-red-50 p-3 rounded border border-red-100"><AlertTriangle size={14}/> {errorLog}</div>}
        </div>
        <div className="bg-gray-50 p-4 border-t text-center space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 CADENA DE BOTICAS SAN JOSE S.A.C.</p><p className="text-[9px] text-gray-400 font-medium">Desarrollado por <a href="#" className="text-odoo-primary font-bold">GAORSYSTEM PERU</a></p></div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F1F3F6] text-odoo-text">
      <header className="h-14 bg-odoo-primary text-white flex items-center justify-between px-6 shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center gap-3 font-black px-2 h-full cursor-pointer group"><div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center text-odoo-primary text-sm font-black italic shadow-sm group-hover:scale-110 transition-transform">SJ</div><span className="text-sm tracking-tight uppercase">Operaciones Central</span></div>
          {[{ id: 'dashboard', label: 'Tablero BI' }, { id: 'ventas', label: 'Auditoría' }, { id: 'pedidos', label: 'Logística' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 h-full flex items-center text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white/10 border-b-2 border-white' : 'opacity-70 hover:opacity-100 hover:bg-white/5'}`}>{tab.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-2 px-4 h-full border-l border-white/10 text-[10px] font-black uppercase tracking-wider"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> {session?.name}</div>
          <button onClick={() => setView('login')} className="px-5 h-full border-l border-white/10 hover:bg-red-500/30 transition-colors"><LogOut size={16}/></button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0 shadow-sm">
          <div className="p-6 border-b bg-gray-50/50 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><Calendar size={14} className="text-odoo-primary"/> Periodo de Consulta</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">Desde</label>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full p-2.5 text-xs border rounded font-bold outline-none focus:border-odoo-primary"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">Hasta</label>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full p-2.5 text-xs border rounded font-bold outline-none focus:border-odoo-primary"/>
                </div>
                <button onClick={fetchData} className="w-full p-3 bg-odoo-primary text-white rounded-sm text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#5a3c52] transition-all flex items-center justify-center gap-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Sincronizar Odoo</button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {activeTab === 'pedidos' && myOrders.length > 0 && (
               <div className="animate-in slide-in-from-left duration-300"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Status Logístico</p>
                  {myOrders.map(o => (<div key={o.id} className="text-[10px] bg-gray-50 p-3 rounded-sm mb-3 border border-gray-100"><div className="flex justify-between font-black mb-1"><span>{o.name}</span><span className={`px-1.5 rounded-full ${o.state === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.state.toUpperCase()}</span></div><p className="text-gray-400 font-bold truncate">{o.location_dest_id[1]}</p></div>))}
               </div>
             )}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={setSelectedPos} selectedPos={selectedPos} onCloseDetail={() => setSelectedPos(null)} />}
          {activeTab === 'pedidos' && (<OrderModule productSearch={productSearch} setProductSearch={setProductSearch} onSearch={handleProductSearch} products={products} cart={cart} setCart={setCart} warehouses={warehouses} targetWarehouseId={targetWarehouseId} setTargetWarehouseId={setTargetWarehouseId} onSubmitOrder={createWarehouseOrder} loading={loading} />)}
        </main>
      </div>
      {loading && (<div className="fixed bottom-8 right-8 z-[200] bg-white px-8 py-5 rounded shadow-2xl border-l-4 border-odoo-primary flex items-center gap-5 animate-in slide-in-from-right"><Loader2 className="animate-spin text-odoo-primary" size={24}/><div className="space-y-1"><p className="text-[11px] font-black uppercase text-gray-800 tracking-widest">BI Intelligence Sync</p><p className="text-[9px] font-bold text-gray-400">Calculando márgenes y rotación de stock...</p></div></div>)}
    </div>
  );
};

export default App;
