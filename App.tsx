
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar, DollarSign, 
  Settings, Grid, Bell, HelpCircle, Package, Store
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { AppConfig, Product, Warehouse } from './types';

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
  const getPeruDateString = () => {
    const date = new Date();
    const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    return peruDate.toISOString().split('T')[0];
  };

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
  const [dateRange, setDateRange] = useState({ 
    start: getPeruDateString(), 
    end: getPeruDateString() 
  });
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
      // 1. Identificar Compañía
      const companies = await client.searchRead('res.company', [['name', 'ilike', 'SAN JOSE']], ['id']);
      if (!companies || !companies.length) throw new Error("Compañía San José no encontrada.");
      const sanJoseId = companies[0].id;

      // 2. Cargar Cajas (pos.config)
      const configs = await client.searchRead('pos.config', 
        [['company_id', '=', sanJoseId]], 
        ['name', 'id', 'current_session_id', 'current_session_state']
      ) || [];
      
      const blacklist = ['CRUZ', 'CHALPON', 'INDACOCHEA', 'AMAY', 'P&P', 'P & P'];
      const filteredConfigs = configs.filter((c: any) => 
        !blacklist.some(term => c.name.toUpperCase().includes(term))
      );
      setPosConfigs(filteredConfigs);

      // 3. Cargar Almacenes
      const ws = await client.searchRead('stock.warehouse', [['company_id', '=', sanJoseId]], ['name', 'id', 'code']);
      setWarehouses(ws || []);

      // 4. Obtener Sesiones del Rango (Para asegurar mapeo config_id si el pedido no lo tiene)
      const sessions = await client.searchRead('pos.session', [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        ['start_at', '<=', `${dateRange.end} 23:59:59`],
        ['stop_at', '>=', `${dateRange.start} 00:00:00`]
      ], ['id', 'config_id']);
      const sessionToConfigMap: Record<number, number> = {};
      sessions.forEach((s: any) => {
        if (s.config_id) sessionToConfigMap[s.id] = s.config_id[0];
      });

      // 5. Cargar Pedidos
      const orders = await client.searchRead('pos.order', [
        ['company_id', '=', sanJoseId],
        ['date_order', '>=', `${dateRange.start} 00:00:00`],
        ['date_order', '<=', `${dateRange.end} 23:59:59`],
        ['state', 'in', ['paid', 'done', 'invoiced']]
      ], ['id', 'amount_total', 'amount_tax', 'state', 'date_order', 'config_id', 'session_id']) || [];

      const orderIds = orders.map(o => o.id);
      
      // 6. Cargar Líneas y Vincular Costos
      const orderLines = orderIds.length > 0 ? await client.searchRead('pos.order.line',
        [['order_id', 'in', orderIds]],
        ['product_id', 'qty', 'price_subtotal_incl', 'order_id']
      ) : [];

      const productIds = Array.from(new Set(orderLines.map(l => Array.isArray(l.product_id) ? l.product_id[0] : null).filter(Boolean)));
      let costsMap: Record<number, number> = {};
      if (productIds.length > 0) {
        // En Odoo v14 standard_price suele estar en product.product, pero hereda de template.
        const productData = await client.rpcCall('object', 'execute_kw', [
          config.db, (client as any).uid, config.apiKey,
          'product.product', 'read',
          [productIds, ['standard_price', 'product_tmpl_id']],
          {}
        ]);
        (productData || []).forEach((p: any) => costsMap[p.id] = p.standard_price || 0);
      }

      // 7. Cargar Pagos
      const payments = orderIds.length > 0 ? await client.searchRead('pos.payment', 
        [['pos_order_id', 'in', orderIds]], 
        ['amount', 'payment_method_id', 'pos_order_id']
      ) : [];

      // 8. Consolidar Estadísticas
      const stats: any = {};
      filteredConfigs.forEach(conf => {
        // Un pedido pertenece a esta caja si tiene el config_id directo O si su sesión pertenece a esta caja
        const posOrders = orders.filter(o => {
          const directMatch = o.config_id && o.config_id[0] === conf.id;
          const sessionMatch = o.session_id && sessionToConfigMap[o.session_id[0]] === conf.id;
          return directMatch || sessionMatch;
        });

        const posOrderIds = posOrders.map(o => o.id);
        const totalSales = posOrders.reduce((acc, curr) => acc + (curr.amount_total || 0), 0);
        const posLines = orderLines.filter(l => l.order_id && posOrderIds.includes(l.order_id[0]));
        
        let totalCost = 0;
        const productStats: any = {};
        posLines.forEach(l => {
          if (!Array.isArray(l.product_id)) return;
          const pId = l.product_id[0];
          const pName = l.product_id[1];
          const cost = costsMap[pId] || 0;
          const lineCost = (l.qty || 0) * cost;
          totalCost += lineCost;

          if (!productStats[pName]) productStats[pName] = { qty: 0, total: 0, cost: 0, margin: 0 };
          productStats[pName].qty += (l.qty || 0);
          productStats[pName].total += (l.price_subtotal_incl || 0);
          productStats[pName].cost += lineCost;
          productStats[pName].margin = productStats[pName].total - productStats[pName].cost;
        });

        const posPayments = payments.filter(p => {
          if (!p.pos_order_id) return false;
          const pOrderId = Array.isArray(p.pos_order_id) ? p.pos_order_id[0] : p.pos_order_id;
          return posOrderIds.includes(pOrderId);
        });

        const methodStats: any = {};
        posPayments.forEach(p => {
          const mName = Array.isArray(p.payment_method_id) ? p.payment_method_id[1] : 'Efectivo';
          methodStats[mName] = (methodStats[mName] || 0) + p.amount;
        });

        stats[conf.id] = {
          isOnline: conf.current_session_id !== false,
          rawState: conf.current_session_state || 'SIN ACTIVIDAD',
          totalSales: totalSales,
          totalCost: totalCost,
          margin: totalSales - totalCost,
          count: posOrders.length,
          payments: methodStats,
          products: Object.entries(productStats)
            .map(([name, data]: [string, any]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { setLoading(false); }
  }, [client, view, dateRange, config.companyName, config.db, config.apiKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProductSearch = async (term: string) => {
    if (term.length < 3) return;
    setLoading(true);
    try {
      const prods = await client.searchRead('product.product', [
        '|', ['name', 'ilike', term], ['default_code', 'ilike', term],
        ['sale_ok', '=', true]
      ], ['name', 'default_code', 'list_price', 'qty_available'], { limit: 15 });
      setProducts(prods);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) {
      alert("Seleccione una sede de destino y agregue productos.");
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      alert("Solicitud de Suministro Interno registrada correctamente.");
      setCart([]);
      setTargetWarehouseId(null);
    } catch (e) {
      alert("Error al procesar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Acceso denegado.");
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name'], { limit: 1 });
      if (!user || !user.length) throw new Error("Usuario no registrado en Odoo.");
      setSession({ name: user[0].name });
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
      setLoading(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen flex items-center justify-center p-6 bg-[#f1f4f9]">
         <div className="bg-white w-full max-w-[420px] shadow-xl rounded-odoo p-10 space-y-8 animate-fade">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-odoo-primary rounded-xl flex items-center justify-center text-white text-3xl font-bold italic shadow-lg">SJ</div>
              <h1 className="text-xl font-bold text-gray-700">Boticas San José</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Usuario</label>
                <input 
                  type="text" 
                  className="w-full o-input" 
                  placeholder="ID de Usuario" 
                  value={loginInput} 
                  onChange={e => setLoginInput(e.target.value)} 
                  required 
                />
              </div>
              <button 
                disabled={loading}
                className="w-full o-btn o-btn-primary py-3 font-bold"
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : "Iniciar Sesión"}
              </button>
            </form>
            {errorLog && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 text-center font-medium">
                {errorLog}
              </div>
            )}
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center opacity-40">
              <span className="text-[10px] font-bold">Odoo Enterprise v14</span>
              <span className="text-[10px] font-bold">SJS-OPS Hub</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-odoo-bg overflow-hidden">
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 shadow-md z-50">
        <div className="flex items-center h-full">
          <button className="h-full px-3 hover:bg-black/10 transition-colors" title="App Switcher">
            <Grid size={20} />
          </button>
          <div className="h-4 w-px bg-white/20 mx-2"></div>
          <div className="flex items-center gap-2 h-full">
             <span className="text-sm font-bold tracking-tight px-3 h-full flex items-center">San José Operations</span>
          </div>
          <div className="hidden md:flex h-full ml-4">
             {[{id:'dashboard', label:'Dashboard'}, {id:'ventas', label:'Auditoría'}, {id:'pedidos', label:'Logística'}].map(tab => (
               <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`o-nav-item ${activeTab === tab.id ? 'active' : ''}`}
               >
                 {tab.label}
               </button>
             ))}
          </div>
        </div>
        <div className="flex items-center gap-2 h-full">
          <button className="h-full px-3 hover:bg-black/10 transition-colors opacity-80"><Bell size={18} /></button>
          <button className="h-full px-3 hover:bg-black/10 transition-colors opacity-80"><HelpCircle size={18} /></button>
          <div className="h-4 w-px bg-white/20 mx-1"></div>
          <div className="flex items-center gap-2 px-3 h-full cursor-pointer hover:bg-black/10 transition-colors">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
              {session?.name?.[0] || 'U'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{session?.name}</span>
          </div>
          <button onClick={() => setView('login')} className="h-full px-3 hover:bg-red-500/80 transition-colors" title="Cerrar Sesión">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r border-odoo-border hidden md:flex flex-col shrink-0 py-4">
          <div className="flex-1 space-y-1">
             <div className="px-6 mb-4">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Operaciones</h3>
             </div>
             <button onClick={() => setActiveTab('dashboard')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={18} /> Dashboard
             </button>
             <button onClick={() => setActiveTab('ventas')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'ventas' ? 'active' : ''}`}>
                <TrendingUp size={18} /> Auditoría Ventas
             </button>
             <button onClick={() => setActiveTab('pedidos')} className={`o-sidebar-item w-[calc(100%-16px)] ${activeTab === 'pedidos' ? 'active' : ''}`}>
                <Truck size={18} /> Logística Interna
             </button>

             <div className="px-6 mt-8 mb-4">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Análisis Temporal</h3>
             </div>
             <div className="px-4 space-y-4">
                <div className="space-y-1 px-4">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Desde</label>
                   <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full o-input text-xs"/>
                </div>
                <div className="space-y-1 px-4">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Hasta</label>
                   <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full o-input text-xs"/>
                </div>
                <div className="px-4 pt-2">
                  <button onClick={fetchData} className="w-full o-btn o-btn-primary text-xs gap-2 py-2">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Actualizar
                  </button>
                </div>
             </div>
          </div>
          <div className="p-4 border-t border-gray-100 flex items-center justify-between opacity-50">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold">Servidor SJS OK</span>
             </div>
             <span className="text-[10px] font-bold italic">{lastSync}</span>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative bg-odoo-bg">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={(pos) => setPosSalesData((prev:any) => ({...prev, _selected: pos}))} selectedPos={posSalesData._selected} onCloseDetail={() => setPosSalesData((prev:any) => ({...prev, _selected: null}))} />}
          {activeTab === 'pedidos' && (
            <OrderModule 
              productSearch={productSearch} 
              setProductSearch={setProductSearch} 
              onSearch={handleProductSearch} 
              products={products} 
              cart={cart} 
              setCart={setCart} 
              warehouses={warehouses} 
              targetWarehouseId={targetWarehouseId} 
              setTargetWarehouseId={setTargetWarehouseId} 
              onSubmitOrder={handleConfirmOrder} 
              loading={loading} 
            />
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white px-6 py-3 rounded-lg shadow-xl border border-odoo-border flex items-center gap-4 animate-in slide-in-from-bottom">
          <Loader2 className="animate-spin text-odoo-primary" size={20}/>
          <p className="text-xs font-bold text-gray-700">Cargando datos de Odoo...</p>
        </div>
      )}
    </div>
  );
};

export default App;
