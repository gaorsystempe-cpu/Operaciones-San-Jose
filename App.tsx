
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, RefreshCw, User as UserIcon, Loader2, 
  LayoutDashboard, Truck, TrendingUp, AlertTriangle, Calendar
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
  
  // Estados de datos centralizados
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [selectedPos, setSelectedPos] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: formatDate(getPeruDate()), end: formatDate(getPeruDate()) });
  
  // Estados de Inventario
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
      const configs = await client.searchRead('pos.config', [], ['name', 'id', 'current_session_id', 'current_session_state']);
      const filteredConfigs = configs.filter((c: any) => c.name.toUpperCase().includes('BOTICA') && !c.name.toUpperCase().includes('CRUZ'));
      setPosConfigs(filteredConfigs);

      const ws = await client.searchRead('stock.warehouse', [], ['name', 'id', 'lot_stock_id']);
      setWarehouses(ws);

      const sessionDomain = [['config_id', 'in', filteredConfigs.map(c => c.id)], ['start_at', '>=', `${dateRange.start} 00:00:00`], ['start_at', '<=', `${dateRange.end} 23:59:59`]];
      const sessions = await client.searchRead('pos.session', sessionDomain, ['id', 'config_id', 'user_id', 'start_at', 'state', 'cash_register_balance_end_real'], { order: 'start_at desc' });

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id[0] === conf.id);
        stats[conf.id] = {
          total: 0,
          count: confSessions.length,
          isOnline: conf.current_session_state === 'opened',
          balance: confSessions.reduce((a, b) => a + (b.cash_register_balance_end_real || 0), 0),
          sessions: confSessions
        };
      });
      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
      fetchMyOrders();
    } catch (e) { setErrorLog("Fallo al conectar con el servidor RPC de Odoo."); }
    finally { setLoading(false); }
  }, [client, view, dateRange, fetchMyOrders]);

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
        { 
          fields: ['name', 'default_code', 'list_price', 'qty_available', 'uom_id'], 
          limit: 12,
          context: { location: mainWarehouse.lot_stock_id[0] } 
        }
      ]);
      setProducts(results);
    } catch (e) {}
  };

  const createWarehouseOrder = async () => {
    if (!targetWarehouseId || cart.length === 0) return alert("Seleccione botica destino y productos.");
    setLoading(true);
    try {
      const mainWarehouse = warehouses.find(w => w.name.toUpperCase().includes('PRINCIPAL1'));
      const targetWarehouse = warehouses.find(w => w.id === targetWarehouseId);
      
      const pickingTypes = await client.searchRead('stock.picking.type', [['code', '=', 'internal'], ['warehouse_id', '=', mainWarehouse.id]], ['id']);
      if (!pickingTypes.length) throw new Error("Operación interna no configurada en Odoo.");

      const pickingId = await client.create('stock.picking', {
        picking_type_id: pickingTypes[0].id,
        location_id: mainWarehouse.lot_stock_id[0],
        location_dest_id: targetWarehouse.lot_stock_id[0],
        origin: `PEDIDO APP - ${session.name}`,
        move_type: 'direct',
        user_id: (client as any).uid
      });

      for (const item of cart) {
        await client.create('stock.move', {
          name: item.name,
          product_id: item.id,
          product_uom_qty: item.qty,
          product_uom: item.uom_id[0],
          picking_id: pickingId,
          location_id: mainWarehouse.lot_stock_id[0],
          location_dest_id: targetWarehouse.lot_stock_id[0],
        });
      }

      await client.rpcCall('object', 'execute_kw', [
        config.db, (client as any).uid, config.apiKey,
        'stock.picking', 'action_confirm', [[pickingId]]
      ]);

      alert("¡Transferencia creada exitosamente en Odoo!");
      setCart([]);
      fetchMyOrders();
      setActiveTab('pedidos');
    } catch (e: any) {
      alert("Error Odoo: " + e.message);
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorLog(null);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error();
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name'], { limit: 1 });
      if (!user.length) throw new Error();
      setSession({ name: user[0].name });
      setView('app');
    } catch { setErrorLog("Acceso denegado. Usuario no encontrado."); }
    finally { setLoading(false); }
  };

  if (view === 'login') return (
    <div className="h-screen bg-[#F0F2F5] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-[440px] shadow-2xl rounded-sm border-t-4 border-odoo-primary overflow-hidden">
        <div className="p-10 space-y-8 text-center">
          <div className="w-24 h-24 bg-odoo-primary rounded-lg flex items-center justify-center text-white text-5xl font-bold italic mx-auto shadow-inner">SJ</div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Boticas San José</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Gestión de Operaciones</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase">ID de Usuario</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-300 rounded outline-none font-semibold focus:border-odoo-primary" placeholder="Ej. jose.herrera" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
            </div>
            <button className="w-full bg-odoo-primary text-white py-3.5 rounded font-bold uppercase tracking-wider shadow-md hover:bg-[#5a3c52]">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Entrar al Sistema'}
            </button>
          </form>
          {errorLog && <div className="text-red-600 text-[10px] font-black uppercase flex items-center gap-2 justify-center"><AlertTriangle size={14}/> {errorLog}</div>}
        </div>
        <div className="bg-gray-50 p-4 border-t text-center space-y-1">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 CADENA DE BOTICAS SAN JOSE S.A.C.</p>
           <p className="text-[9px] text-gray-400 font-medium">
             Desarrollado por <a href="https://gaorsystem.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-odoo-primary hover:underline font-bold transition-all">GAORSYSTEM PERU</a>
           </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      {/* Navbar Superior Odoo */}
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 shadow-md z-50">
        <div className="flex items-center gap-6 h-full font-medium">
          <div className="flex items-center gap-2 font-bold px-3 h-full hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center text-odoo-primary text-[10px] font-black italic">SJ</div>
            <span className="text-sm">Operaciones</span>
          </div>
          {[
            { id: 'dashboard', label: 'Tablero' },
            { id: 'ventas', label: 'Auditoría' },
            { id: 'pedidos', label: 'Suministro' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 h-full flex items-center transition-colors ${activeTab === tab.id ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-2 px-3 h-full border-l border-white/10 text-xs font-bold"><UserIcon size={14}/> {session?.name}</div>
          <button onClick={() => setView('login')} className="px-4 h-full border-l border-white/10 hover:bg-red-500/20"><LogOut size={14}/></button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Barra Lateral Odoo Apps */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0">
          <div className="p-4 border-b bg-gray-50/50">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-odoo-primary"/> Filtro Global</h3>
            <div className="mt-4 space-y-3">
               <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full p-2 text-xs border rounded font-medium outline-none focus:border-odoo-primary"/>
               <button onClick={fetchData} className="w-full p-2 bg-odoo-primary text-white rounded text-[10px] font-black uppercase tracking-widest shadow-sm">Actualizar Todo</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {activeTab === 'pedidos' && myOrders.length > 0 && (
               <div className="animate-in slide-in-from-left duration-300">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Transferencias Recientes</p>
                  {myOrders.map(o => (
                    <div key={o.id} className="text-[10px] border-b border-gray-100 pb-3 mb-3 last:border-0">
                       <div className="flex justify-between font-bold mb-1"><span>{o.name}</span><span className={`px-1.5 rounded-full ${o.state === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.state}</span></div>
                       <p className="text-gray-400 truncate">{o.location_dest_id[1]}</p>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </aside>

        {/* Zona de Renderizado */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard posConfigs={posConfigs} posSalesData={posSalesData} lastSync={lastSync} />}
          {activeTab === 'ventas' && <AuditModule posConfigs={posConfigs} posSalesData={posSalesData} onSelect={setSelectedPos} selectedPos={selectedPos} onCloseDetail={() => setSelectedPos(null)} />}
          {activeTab === 'pedidos' && (
            <OrderModule 
              productSearch={productSearch} setProductSearch={setProductSearch} onSearch={handleProductSearch}
              products={products} cart={cart} setCart={setCart} warehouses={warehouses}
              targetWarehouseId={targetWarehouseId} setTargetWarehouseId={setTargetWarehouseId}
              onSubmitOrder={createWarehouseOrder} loading={loading}
            />
          )}
        </main>
      </div>

      {/* Indicador de Carga */}
      {loading && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white px-6 py-4 rounded shadow-2xl border flex items-center gap-4 animate-in slide-in-from-right">
          <Loader2 className="animate-spin text-odoo-primary" size={20}/>
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Conectando con SJS-DB...</span>
        </div>
      )}
    </div>
  );
};

export default App;
