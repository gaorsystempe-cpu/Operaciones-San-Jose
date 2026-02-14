
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building, Truck, MoveHorizontal
} from 'lucide-react';
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
  const [showConfig, setShowConfig] = useState(false);
  const [configClicks, setConfigClicks] = useState(0);
  const [session, setSession] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [principal1, setPrincipal1] = useState<any | null>(null);
  const [internalPickingTypeId, setInternalPickingTypeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('offline');
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [customNotes, setCustomNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  
  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const resolveSJSIdentity = useCallback(async () => {
    try {
      const companies = await client.searchRead('res.company', [['name', '=', config.companyName]], ['id', 'name'], { limit: 1 });
      if (!companies || companies.length === 0) {
        throw new Error(`La entidad "${config.companyName}" no fue encontrada.`);
      }
      return companies[0].id;
    } catch (e) {
      throw new Error("Error conectando con el servidor de San José.");
    }
  }, [client, config.companyName]);

  const loadAppData = useCallback(async (uid: number, companyId: number) => {
    setLoading(true);
    setSyncStatus('syncing');
    try {
      client.setAuth(uid, config.apiKey);
      
      const [wData, pTypes] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code', 'lot_stock_id']),
        client.searchRead('stock.picking.type', [['code', '=', 'internal'], ['company_id', '=', companyId]], ['name', 'warehouse_id', 'sequence_code'])
      ]);

      setWarehouses(wData);
      
      const p1 = wData.find((w: any) => w.name.toUpperCase().includes('PRINCIPAL1') || w.code.toUpperCase().includes('PRINCIPAL1'));
      if (p1) {
        setPrincipal1(p1);
        // Buscar el tipo de operación interno específico del almacén o el primero de la compañía
        const pickingType = pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === p1.id) || pTypes[0];
        if (pickingType) setInternalPickingTypeId(pickingType.id);
      }

      setSyncStatus('online');
    } catch (e: any) {
      setErrorLog("SJS Hub Error: " + e.message);
      setSyncStatus('offline');
    } finally { setLoading(false); }
  }, [client, config.apiKey]);

  const fetchProductsWithCentralStock = useCallback(async () => {
    if (!session || !principal1) return;
    setLoading(true);
    try {
      // IMPORTANTE: Consultar 'product.product' para tener IDs de variantes válidos para pickings
      const pData = await client.searchRead(
        'product.product', 
        [['sale_ok', '=', true], ['type', '=', 'consu']], // Usualmente productos almacenables o consumibles
        ['name', 'default_code', 'qty_available', 'uom_id'], 
        { 
          limit: 150,
          context: { warehouse: principal1.id } 
        }
      );
      setProducts(pData);
    } catch (e: any) {
      setErrorLog("Error Stock Central: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [client, session, principal1]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    setErrorLog(null);
    try {
      const adminUid = await client.authenticate(config.user, config.apiKey);
      if (!adminUid) throw new Error("Fallo de comunicación con Odoo.");

      const sjsId = await resolveSJSIdentity();

      const userSearch = await client.searchRead('res.users', [
        '|',
        ['login', '=', loginInput],
        ['name', 'ilike', loginInput]
      ], ['id', 'name', 'login', 'company_id', 'company_ids'], { limit: 1 });

      if (!userSearch || userSearch.length === 0) {
        throw new Error(`Usuario "${loginInput}" no registrado.`);
      }

      const user = userSearch[0];
      const isGlobalAdmin = user.login.toLowerCase() === config.user.toLowerCase();
      const hasSJSAccess = isGlobalAdmin || user.company_id[0] === sjsId || (Array.isArray(user.company_ids) && user.company_ids.includes(sjsId));

      if (!hasSJSAccess) throw new Error("Acceso Restringido a Boticas San José.");

      const sessionData = {
        id: adminUid,
        odoo_user_id: user.id,
        name: user.name,
        company_id: sjsId,
        company_name: config.companyName
      };

      setSession(sessionData);
      await loadAppData(adminUid, sjsId);
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const submitToOdoo = async () => {
    if (!cart.length || !selectedWarehouseId || !session || !principal1 || !internalPickingTypeId) {
      setErrorLog("Error: Verifique Almacén Destino y Conexión.");
      return;
    }
    setLoading(true);
    setErrorLog(null);
    try {
      const warehouseDest = warehouses.find(w => w.id === selectedWarehouseId);
      if (!warehouseDest || !warehouseDest.lot_stock_id) throw new Error("El almacén destino no tiene ubicación de stock configurada.");

      const pickingData = {
        picking_type_id: internalPickingTypeId,
        location_id: principal1.lot_stock_id[0], 
        location_dest_id: warehouseDest.lot_stock_id[0], 
        origin: `App SJS - ${session.name}`,
        note: customNotes,
        company_id: session.company_id,
        move_ids_without_package: cart.map(item => [0, 0, {
          name: item.name,
          product_id: item.id, // Ahora es el ID de product.product
          product_uom_qty: item.qty,
          product_uom: item.uom_id ? item.uom_id[0] : 1,
          location_id: principal1.lot_stock_id[0],
          location_dest_id: warehouseDest.lot_stock_id[0],
        }])
      };
      
      const resId = await client.create('stock.picking', pickingData);
      if (resId) {
        setCart([]);
        setOrderComplete(true);
      } else {
        throw new Error("Odoo no devolvió un ID de confirmación.");
      }
    } catch (e: any) { 
      setErrorLog("Fallo al registrar en Odoo: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const isSupportUser = loginInput.trim().toLowerCase() === config.user.toLowerCase();

  const handleLogoClick = () => {
    if (!isSupportUser) return;
    const newClicks = configClicks + 1;
    setConfigClicks(newClicks);
    if (newClicks >= 5) {
      setShowConfig(true);
      setConfigClicks(0);
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen bg-[#F8F9FA] flex items-center justify-center font-sans overflow-hidden">
        <div className="bg-white w-[380px] p-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-odoo-primary"></div>
          <div className="flex flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-3">
               <div onClick={handleLogoClick} className="w-16 h-16 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-4xl font-black italic shadow-xl cursor-default select-none active:scale-90 transition-transform">
                 SJ
               </div>
               <div className="text-center">
                 <h1 className="text-xl font-black text-gray-800 tracking-tight">Portal San José</h1>
                 <p className="text-[9px] font-black text-odoo-primary uppercase tracking-[0.3em] mt-1">Gestión de Pedidos SJS</p>
               </div>
            </div>
            <form onSubmit={handleInitialAuth} className="w-full space-y-8">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Credencial</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 focus:border-odoo-primary outline-none transition-all text-sm font-bold" placeholder="Usuario o Correo" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="o-btn-primary w-full py-4.5 rounded-2xl flex justify-center items-center gap-2 shadow-2xl shadow-odoo-primary/20 text-xs font-black tracking-widest">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'INGRESAR'}
              </button>
            </form>
            {showConfig && isSupportUser && (
              <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-3 o-animate-fade">
                <span className="text-[9px] font-black text-odoo-primary uppercase tracking-widest block">ADMIN SERVER</span>
                <input className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none" placeholder="URL" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} />
                <input className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none" placeholder="DB" value={config.db} onChange={e => setConfig({...config, db: e.target.value})} />
                <button onClick={() => { localStorage.setItem('odoo_ops_v18_config', JSON.stringify(config)); setShowConfig(false); }} className="o-btn-secondary w-full py-2 text-[10px] font-black uppercase">Guardar</button>
              </div>
            )}
            {errorLog && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black border border-red-100 w-full rounded-2xl flex items-center gap-3 o-animate-fade text-center justify-center leading-tight"><AlertCircle size={16} className="shrink-0"/> {errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white text-odoo-text">
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 z-[100] shadow-lg">
        <div className="flex items-center gap-5">
          <button onClick={() => setShowAppSwitcher(!showAppSwitcher)} className="p-2 rounded-lg hover:bg-white/10 transition-all"><LayoutGrid size={22}/></button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-widest bg-white/10 px-3 py-1.5 rounded-lg uppercase">SJS Hub</span>
            <span className="text-xs font-bold opacity-80 hidden sm:block tracking-tight uppercase truncate max-w-[300px]">Boticas San José S.A.C.</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-[10px] font-black uppercase">{session?.name.slice(0,1).toUpperCase()}</div>
            <span className="text-xs font-black hidden sm:block">{session?.name}</span>
          </div>
          <button onClick={() => setView('login')} className="hover:bg-rose-500 p-2 rounded-xl transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 lg:w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-sm">
          <div className="p-6 border-b border-gray-50 hidden lg:block bg-gray-50/20">
            <p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-1">Origen SJS</p>
            <p className="text-xs font-black text-gray-800 tracking-tight leading-tight uppercase">ALMACÉN PRINCIPAL1</p>
          </div>
          <nav className="p-4 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/><span className="hidden lg:block">Panel Principal</span></button>
            <button onClick={() => setActiveTab('purchase')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'purchase' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><ArrowRightLeft size={20}/><span className="hidden lg:block">Solicitar Pedido</span></button>
            <button onClick={() => setActiveTab('monitor')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'monitor' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}><Store size={20}/><span className="hidden lg:block">Sedes San José</span></button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-[80px] bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center text-[10px] font-black text-gray-300 gap-3 uppercase tracking-widest">
                <span>STOCK CENTRAL SJS</span> <ChevronRight size={12}/> 
                <span className="text-odoo-primary">{activeTab === 'purchase' ? 'PEDIDOS' : 'CENTRAL'}</span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">{activeTab === 'dashboard' ? 'HUB SAN JOSÉ' : activeTab === 'purchase' ? 'Nuevo Pedido' : 'Red de Sedes'}</h2>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => loadAppData(session.id, session.company_id)} className="o-btn-secondary flex items-center gap-2 border-gray-100 font-black text-[10px] tracking-widest"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> ACTUALIZAR</button>
              {activeTab === 'purchase' && (
                <button onClick={submitToOdoo} disabled={loading || cart.length === 0 || !selectedWarehouseId} className="o-btn-primary flex items-center gap-2 px-8 font-black text-[10px] tracking-widest shadow-xl shadow-odoo-primary/20">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> CREAR PEDIDO</>}
                </button>
              )}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-8 bg-[#f9fafc] custom-scrollbar">
            {activeTab === 'dashboard' && (
               <div className="max-w-6xl mx-auto space-y-10 o-animate-fade">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-odoo-primary transition-all">
                        <div className="w-14 h-14 bg-odoo-primary/5 text-odoo-primary rounded-2xl flex items-center justify-center group-hover:bg-odoo-primary group-hover:text-white transition-all"><Building size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede Central</p><p className="text-xl font-black tracking-tighter uppercase">PRINCIPAL1</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
                        <div className="w-14 h-14 bg-odoo-secondary/5 text-odoo-secondary rounded-2xl flex items-center justify-center"><Package size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sedes Destino</p><p className="text-3xl font-black text-odoo-primary tracking-tighter">{warehouses.filter(w => !w.name.toUpperCase().includes('PRINCIPAL1')).length}</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
                        <div className="w-14 h-14 bg-orange-500/5 text-orange-500 rounded-2xl flex items-center justify-center"><Activity size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</p><p className="text-lg font-black tracking-tighter uppercase text-odoo-success">SJS ONLINE</p></div>
                     </div>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 p-20 text-center space-y-6 shadow-sm">
                     <div className="w-24 h-24 bg-odoo-primary/5 text-odoo-primary rounded-full flex items-center justify-center mx-auto shadow-inner"><MoveHorizontal size={48}/></div>
                     <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">SISTEMA DE PEDIDOS SAN JOSÉ</h3>
                     <p className="text-sm text-gray-400 max-w-md mx-auto font-medium">Genere solicitudes de abastecimiento. Las órdenes se registran en el sistema central para su procesamiento desde PRINCIPAL1 hacia las sedes.</p>
                  </div>
               </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto o-animate-fade bg-white p-12 rounded-[2.5rem] shadow-sm border border-gray-100 mb-20 relative">
                {errorLog && <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3"><AlertCircle size={20}/> {errorLog}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-16">
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">TIENDA DESTINO (Botica San José)</label>
                      <select className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-4 focus:ring-odoo-primary/5 outline-none cursor-pointer appearance-none" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                        <option value="">-- SELECCIONE DESTINO --</option>
                        {warehouses.filter(w => w.id !== principal1?.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2 mt-2 text-[9px] font-black uppercase text-odoo-primary/60 tracking-widest"><Truck size={14}/> Abastecimiento: Almacén Principal1</div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mb-2 block">COMENTARIO DEL PEDIDO</label>
                      <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 focus:ring-odoo-primary/5 outline-none" placeholder="Motivo o referencia..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                    <h3 className="text-[11px] font-black uppercase text-odoo-primary tracking-widest flex items-center gap-3">
                       <div className="p-2 bg-odoo-primary/5 rounded-xl"><Package size={18}/></div>
                       LISTADO DE PRODUCTOS (STOCK PRINCIPAL1)
                    </h3>
                    <button onClick={() => { fetchProductsWithCentralStock(); setShowProductModal(true); }} className="bg-odoo-primary text-white px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest flex items-center gap-2 hover:brightness-110 shadow-lg active:scale-95 transition-all"><Search size={20}/> BUSCAR PRODUCTO</button>
                  </div>
                  <div className="overflow-hidden border border-gray-100 rounded-3xl">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">PRODUCTO SJS</th>
                          <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-40">CANTIDAD</th>
                          <th className="p-6 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-odoo-primary/5 transition-all">
                            <td className="p-6">
                              <div className="font-black text-base text-gray-800 tracking-tight">{item.name}</div>
                              <div className="text-[9px] font-bold text-odoo-primary/40 uppercase tracking-widest mt-1">ID VARIANT: {item.id} | REF: {item.default_code || 'S/REF'}</div>
                            </td>
                            <td className="p-6 text-center">
                              <input type="number" className="w-24 text-center border-b-2 border-gray-100 bg-transparent outline-none focus:border-odoo-primary font-black text-xl py-2" value={item.qty} min="1" onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))} />
                            </td>
                            <td className="p-6 text-right">
                              <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-all p-3 hover:bg-rose-50 rounded-2xl"><Trash2 size={20}/></button>
                            </td>
                          </tr>
                        ))}
                        {cart.length === 0 && (
                          <tr><td colSpan={3} className="text-center py-32 text-gray-300 italic text-sm font-semibold uppercase tracking-widest opacity-50">Seleccione productos para su pedido.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchase' && orderComplete && (
              <div className="h-full flex flex-col items-center justify-center space-y-8 o-animate-fade">
                <div className="w-24 h-24 bg-green-50 text-odoo-success rounded-[2.5rem] flex items-center justify-center shadow-xl border border-green-100"><Check size={48} strokeWidth={3}/></div>
                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-gray-800 tracking-tight uppercase">¡PEDIDO REGISTRADO!</h2>
                  <p className="text-gray-400 font-bold text-sm max-w-sm mx-auto uppercase tracking-widest text-center">La solicitud ha sido enviada exitosamente al sistema central.</p>
                </div>
                <button onClick={() => setOrderComplete(false)} className="o-btn-primary px-12 py-4 rounded-2xl shadow-xl font-black text-xs tracking-widest uppercase">Generar Nuevo Pedido</button>
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 o-animate-fade pb-20">
                {warehouses.map(w => (
                  <div key={w.id} className={`bg-white group border shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all p-8 rounded-[2.5rem] ${w.id === principal1?.id ? 'border-odoo-primary border-2 shadow-odoo-primary/5' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${w.id === principal1?.id ? 'bg-odoo-primary text-white' : 'bg-odoo-primary/10 text-odoo-primary group-hover:bg-odoo-primary group-hover:text-white'}`}>{w.code.slice(-3)}</div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${w.id === principal1?.id ? 'bg-odoo-primary text-white' : 'bg-green-100 text-green-700'}`}>{w.id === principal1?.id ? 'CENTRO MATRIZ' : 'SEDE ACTIVA'}</div>
                    </div>
                    <h3 className="font-black text-gray-800 text-base mb-6 leading-tight group-hover:text-odoo-primary transition-colors uppercase">{w.name}</h3>
                    <div className="space-y-3 border-t border-gray-50 pt-6">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>IDENTIFICADOR:</span><span className="text-gray-900">{w.code}</span></div>
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>UBICACIÓN STOCK:</span><span className="text-odoo-primary text-right font-black uppercase">{w.lot_stock_id?.[1].split('/').pop()}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[85vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden animate-saas">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="font-black text-xl text-gray-800 tracking-tighter uppercase">CATÁLOGO CENTRAL SJS</h3>
                  <p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest mt-1">Consultando Variantes en PRINCIPAL1</p>
               </div>
              <button onClick={() => setShowProductModal(false)} className="bg-white p-3 rounded-2xl text-gray-300 hover:text-rose-500 shadow-sm transition-all"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
                <input autoFocus type="text" className="w-full pl-14 pr-6 py-4.5 bg-gray-50 rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none text-sm font-black transition-all" placeholder="FILTRAR MEDICAMENTOS..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-odoo-primary" size={40}/></div>}
              <div className="space-y-2">
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => {
                    const exists = cart.find(c => c.id === p.id);
                    if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                    else setCart([...cart, {...p, qty: 1}]);
                    setShowProductModal(false);
                  }} className="w-full flex items-center justify-between p-6 bg-white hover:bg-odoo-primary/5 rounded-[2rem] border border-transparent hover:border-odoo-primary/10 transition-all text-left group">
                    <div className="max-w-[70%]">
                      <p className="font-black text-sm text-gray-800 group-hover:text-odoo-primary uppercase tracking-tight leading-tight">{p.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">SJS-VAR: {p.id} | {p.default_code || 'S/REF'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">DISPONIBLE CENTRAL</p>
                          <p className={`text-base font-black ${p.qty_available > 0 ? 'text-odoo-success' : 'text-rose-500'}`}>{Math.floor(p.qty_available)}</p>
                       </div>
                       <div className="p-2.5 bg-odoo-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={20} className="text-odoo-primary"/></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
