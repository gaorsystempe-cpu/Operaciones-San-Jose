
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, MoreVertical, Layers, 
  ArrowRightLeft, Package, Home, Building
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

  // Función para obtener el ID real de la empresa San José en Odoo
  const getSJSCompanyId = useCallback(async () => {
    const companies = await client.searchRead('res.company', [['name', 'ilike', config.companyName]], ['id'], { limit: 1 });
    if (!companies || companies.length === 0) {
      throw new Error(`No se encontró la empresa "${config.companyName}" en Odoo.`);
    }
    return companies[0].id;
  }, [client, config.companyName]);

  const loadAppData = useCallback(async (uid: number, companyId: number) => {
    setLoading(true);
    setSyncStatus('syncing');
    try {
      client.setAuth(uid, config.apiKey);
      
      // FILTRO ESTRICTO POR COMPAÑÍA SAN JOSÉ
      const [wData, pTypes] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code', 'lot_stock_id']),
        client.searchRead('stock.picking.type', [['code', '=', 'incoming'], ['company_id', '=', companyId]], ['name', 'warehouse_id', 'sequence_code'])
      ]);

      const warehousesWithOps = wData.map((w: any) => ({
        ...w,
        incoming_picking_type: pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === w.id)?.id,
        picking_name: pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === w.id)?.name || 'Recepción Estándar'
      }));

      setWarehouses(warehousesWithOps);
      setSyncStatus('online');
    } catch (e: any) {
      setErrorLog("Error de Sincronización: " + e.message);
      setSyncStatus('offline');
    } finally { setLoading(false); }
  }, [client, config.apiKey]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    setErrorLog(null);
    try {
      // 1. Autenticar con cuenta de soporte/admin para búsqueda
      const adminUid = await client.authenticate(config.user, config.apiKey);
      if (!adminUid) throw new Error("Fallo de conexión con el servidor Odoo.");

      // 2. Obtener el ID de la empresa San José obligatoriamente
      const targetCompanyId = await getSJSCompanyId();

      // 3. Buscar al usuario pero RESTRINGIDO a la compañía San José
      const userSearch = await client.searchRead('res.users', [
        '&',
        ['company_id', '=', targetCompanyId],
        '|', '|',
        ['login', '=', loginInput],
        ['name', 'ilike', loginInput],
        ['email', '=', loginInput]
      ], ['id', 'name', 'login', 'company_id'], { limit: 1 });

      if (!userSearch || userSearch.length === 0) {
        throw new Error(`El usuario no tiene acceso a la empresa ${config.companyName}.`);
      }

      const sessionData = {
        id: adminUid, // Usamos el UID de soporte para las operaciones RPC
        odoo_user_id: userSearch[0].id,
        name: userSearch[0].name,
        login_email: userSearch[0].login,
        company_id: targetCompanyId,
        company_name: config.companyName
      };

      setSession(sessionData);
      await loadAppData(adminUid, targetCompanyId);
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const submitToOdoo = async () => {
    if (!cart.length || !selectedWarehouseId || !session) return;
    setLoading(true);
    try {
      const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
      const orderData = { 
        partner_id: 1, 
        company_id: session.company_id,
        picking_type_id: warehouse?.incoming_picking_type || false,
        order_line: cart.map(item => [0, 0, {
          product_id: Array.isArray(item.product_variant_id) ? item.product_variant_id[0] : item.id,
          name: item.name,
          product_qty: item.qty,
          product_uom: item.uom_id ? item.uom_id[0] : 1,
          price_unit: 0.0,
          date_planned: new Date().toISOString().split('T')[0]
        }]),
        notes: `SJS PORTAL: Requerimiento de ${session.name}\nDestino: ${warehouse?.name}\n${customNotes}`
      };
      const resId = await client.create('purchase.order', orderData);
      if (resId) {
        setCart([]);
        setOrderComplete(true);
      }
    } catch (e: any) { 
      setErrorLog(e.message); 
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
        <div className="bg-white w-[380px] p-10 shadow-[0_30px_60px_-12px_rgba(50,50,93,0.25),0_18px_36px_-18px_rgba(0,0,0,0.3)] rounded-3xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-odoo-primary"></div>
          
          <div className="flex flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-3">
               <div 
                onClick={handleLogoClick}
                className={`w-16 h-16 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-4xl font-black italic shadow-xl cursor-default select-none transition-all active:scale-95`}
               >
                 SJ
               </div>
               <div className="text-center">
                 <h1 className="text-xl font-black text-gray-800 tracking-tight">Portal de Operaciones</h1>
                 <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-[0.2em] mt-1">Boticas San José</p>
               </div>
            </div>
            
            <form onSubmit={handleInitialAuth} className="w-full space-y-8">
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-black text-gray-400 uppercase ml-1 tracking-widest">Usuario Corporativo</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-odoo-primary/5 focus:border-odoo-primary outline-none transition-all text-sm font-semibold" 
                  placeholder="Ej: j.perez" 
                  value={loginInput} 
                  onChange={e => setLoginInput(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="o-btn-primary w-full py-4.5 rounded-xl flex justify-center items-center gap-2 shadow-xl shadow-odoo-primary/20 text-sm font-black">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'INGRESAR'}
              </button>
            </form>

            {showConfig && isSupportUser && (
              <div className="w-full p-4 bg-gray-50 border border-odoo-primary/10 rounded-2xl text-left space-y-3 o-animate-fade">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-odoo-primary uppercase tracking-widest">Soporte Técnico</span>
                  <button onClick={() => setShowConfig(false)} className="text-gray-300"><X size={14}/></button>
                </div>
                <input className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-odoo-primary" placeholder="URL Odoo" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} />
                <input className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-odoo-primary" placeholder="Base de Datos" value={config.db} onChange={e => setConfig({...config, db: e.target.value})} />
                <button onClick={() => { localStorage.setItem('odoo_ops_v18_config', JSON.stringify(config)); setShowConfig(false); }} className="o-btn-secondary w-full py-2 text-[10px] font-bold border-odoo-primary/20">Configurar Servidor</button>
              </div>
            )}
            
            {errorLog && <div className="p-4 bg-red-50 text-red-600 text-[11px] font-bold border border-red-100 w-full rounded-xl flex items-center gap-3 o-animate-fade"><AlertCircle size={16}/> {errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-odoo-light text-odoo-text">
      {/* CABECERA ESTÁTICA SJS */}
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 z-[100] shadow-xl">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
            className={`p-2 rounded-lg transition-all ${showAppSwitcher ? 'bg-white/20 rotate-90' : 'hover:bg-white/10'}`}
          >
            <LayoutGrid size={22}/>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-[0.15em] bg-white/10 px-3 py-1.5 rounded-lg">SJS HUB</span>
            <span className="text-[10px] font-bold opacity-30 hidden sm:block">|</span>
            <span className="text-xs font-semibold opacity-80 hidden sm:block tracking-tight uppercase truncate max-w-[200px]">{config.companyName}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">{syncStatus}</span>
          </div>
          <div className="flex items-center gap-3 hover:bg-white/10 px-3 py-1.5 rounded-xl cursor-pointer transition-all">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner">
               {session?.name.slice(0,1).toUpperCase()}
            </div>
            <div className="flex flex-col text-left leading-none hidden sm:flex">
               <span className="text-xs font-black tracking-tight">{session?.name}</span>
               <span className="text-[9px] opacity-50 font-bold uppercase mt-1 tracking-tighter">Entorno SJS</span>
            </div>
          </div>
          <button onClick={() => setView('login')} className="hover:bg-rose-500 p-2 rounded-xl transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      {showAppSwitcher && (
        <div className="fixed inset-0 top-12 bg-odoo-primary/95 z-[90] flex flex-wrap content-start p-12 gap-10 backdrop-blur-md animate-saas">
           <button onClick={() => { setActiveTab('dashboard'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-odoo-secondary rounded-[2rem] flex items-center justify-center text-white shadow-2xl group-hover:scale-105 group-active:scale-95 transition-all duration-300"><Home size={44}/></div>
              <span className="text-white font-black text-[11px] uppercase tracking-widest opacity-70 group-hover:opacity-100">Escritorio</span>
           </button>
           <button onClick={() => { setActiveTab('purchase'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl group-hover:scale-105 group-active:scale-95 transition-all duration-300"><ClipboardList size={44}/></div>
              <span className="text-white font-black text-[11px] uppercase tracking-widest opacity-70 group-hover:opacity-100">Logística</span>
           </button>
           <button onClick={() => { setActiveTab('monitor'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-blue-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl group-hover:scale-105 group-active:scale-95 transition-all duration-300"><Building size={44}/></div>
              <span className="text-white font-black text-[11px] uppercase tracking-widest opacity-70 group-hover:opacity-100">Mis Tiendas</span>
           </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 lg:w-[260px] bg-white border-r border-odoo-border flex flex-col shrink-0 shadow-sm">
          <div className="p-6 border-b border-gray-50 hidden lg:block bg-gray-50/30">
            <p className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.2em] mb-1">Empresa Certificada</p>
            <p className="text-xs font-black text-gray-800 tracking-tight leading-tight">{config.companyName}</p>
          </div>
          <nav className="p-4 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <Home size={20}/><span className="hidden lg:block">Escritorio</span>
            </button>
            <button onClick={() => setActiveTab('purchase')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'purchase' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <ArrowRightLeft size={20}/><span className="hidden lg:block">Transferencias</span>
            </button>
            <button onClick={() => setActiveTab('monitor')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'monitor' ? 'bg-odoo-primary/5 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <Store size={20}/><span className="hidden lg:block">Mis Tiendas SJS</span>
            </button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-[80px] bg-white border-b border-odoo-border px-8 flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center text-[10px] font-black text-gray-300 gap-3 uppercase tracking-[0.2em]">
                <span>SAN JOSÉ</span> <ChevronRight size={12}/> 
                <span className="text-odoo-primary">{activeTab === 'purchase' ? 'INVENTARIO' : activeTab === 'monitor' ? 'LOGÍSTICA' : 'SISTEMAS'}</span>
              </div>
              <h2 className="text-2xl font-black text-odoo-dark tracking-tighter uppercase">
                {activeTab === 'dashboard' ? 'Dashboard SJS' : activeTab === 'purchase' ? 'Nuevo Requerimiento' : 'Control de Sedes'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => loadAppData(session.id, session.company_id)} className="o-btn-secondary flex items-center gap-2 border-gray-200 font-black text-[11px] tracking-wider">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> SINCRONIZAR SJS
              </button>
              {activeTab === 'purchase' && (
                <button onClick={submitToOdoo} disabled={loading || cart.length === 0} className="o-btn-primary flex items-center gap-2 px-8 font-black text-[11px] tracking-wider shadow-lg">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> VALIDAR SJS</>}
                </button>
              )}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-8 bg-[#f9fafc] custom-scrollbar">
            {activeTab === 'dashboard' && (
               <div className="max-w-6xl mx-auto space-y-10 o-animate-fade">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="bg-white p-8 rounded-3xl border border-odoo-border shadow-sm flex items-center gap-6 group hover:border-odoo-primary transition-all">
                        <div className="w-14 h-14 bg-odoo-primary/5 text-odoo-primary rounded-2xl flex items-center justify-center group-hover:bg-odoo-primary group-hover:text-white transition-all"><Store size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiendas SJS</p><p className="text-3xl font-black tracking-tighter">{warehouses.length}</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-3xl border border-odoo-border shadow-sm flex items-center gap-6 group">
                        <div className="w-14 h-14 bg-odoo-secondary/5 text-odoo-secondary rounded-2xl flex items-center justify-center"><Package size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seguridad</p><p className="text-3xl font-black text-odoo-success uppercase text-xl tracking-tighter">Cifrado SSL</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-3xl border border-odoo-border shadow-sm flex items-center gap-6 group">
                        <div className="w-14 h-14 bg-orange-500/5 text-orange-500 rounded-2xl flex items-center justify-center"><Activity size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</p><p className="text-3xl font-black tracking-tighter">v18.0.2</p></div>
                     </div>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-odoo-border p-20 text-center space-y-6 shadow-sm">
                     <div className="w-24 h-24 bg-odoo-primary/5 text-odoo-primary rounded-full flex items-center justify-center mx-auto"><Store size={48}/></div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-[0.15em]">Terminal de Boticas San José</h3>
                        <p className="text-sm text-gray-400 max-w-md mx-auto font-medium">Este portal está configurado exclusivamente para la gestión logística de la cadena San José. Todos los datos están filtrados por compañía.</p>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto o-animate-fade bg-white p-12 rounded-[2.5rem] shadow-sm border border-gray-100 mb-20 relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-16">
                  <div className="space-y-8">
                    <div>
                      <label className="o-form-label tracking-widest font-black text-[10px]">TIENDA DESTINO (FILTRO SJS)</label>
                      <select className="o-input-field font-black text-xl focus:border-odoo-secondary appearance-none cursor-pointer" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                        <option value="">-- Seleccionar Establecimiento --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} · {w.code}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <label className="o-form-label tracking-widest font-black text-[10px]">COMENTARIOS DE OPERACIÓN</label>
                      <input type="text" className="o-input-field font-semibold" placeholder="Indique prioridad o detalles..." value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b-2 border-odoo-primary/10 pb-6">
                    <h3 className="text-xs font-black uppercase text-odoo-primary tracking-[0.25em] flex items-center gap-3">
                       <div className="p-2 bg-odoo-primary/5 rounded-xl"><Package size={18}/></div>
                       Productos SJS en Pedido
                    </h3>
                    <button onClick={() => {
                      if (products.length === 0) {
                        client.searchRead('product.template', [['purchase_ok', '=', true]], ['name', 'default_code', 'qty_available', 'uom_id'], { limit: 150 }).then(setProducts);
                      }
                      setShowProductModal(true);
                    }} className="bg-odoo-primary text-white px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.1em] flex items-center gap-2 hover:brightness-110 shadow-lg shadow-odoo-primary/20 transition-all active:scale-95">
                      <Plus size={20}/> BUSCAR PRODUCTO
                    </button>
                  </div>
                  <div className="overflow-hidden border border-gray-50 rounded-3xl">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-50">
                        <tr>
                          <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicamento SJS</th>
                          <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-40">Unidades</th>
                          <th className="p-6 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-odoo-primary/5 transition-all group">
                            <td className="p-6">
                              <div className="font-black text-base text-gray-800 tracking-tight leading-tight">{item.name}</div>
                              <div className="text-[10px] font-bold text-odoo-primary/40 uppercase tracking-widest mt-1">REF: {item.default_code || 'S/COD'}</div>
                            </td>
                            <td className="p-6 text-center">
                              <input 
                                type="number" 
                                className="w-24 text-center border-b-2 border-gray-100 bg-transparent outline-none focus:border-odoo-primary font-black text-xl py-2 transition-colors"
                                value={item.qty}
                                min="1"
                                onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))}
                              />
                            </td>
                            <td className="p-6 text-right">
                              <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-all p-3 hover:bg-rose-50 rounded-2xl">
                                <Trash2 size={20}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {cart.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-32 text-gray-300 italic text-sm font-semibold tracking-tight">Cero líneas de requerimiento para SJS.</td>
                          </tr>
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
                  <h2 className="text-4xl font-black text-odoo-dark tracking-tight">¡Validado por San José!</h2>
                  <p className="text-gray-400 font-semibold text-lg max-w-sm mx-auto">La solicitud ha sido registrada en Odoo Central bajo la entidad SJS.</p>
                </div>
                <button onClick={() => setOrderComplete(false)} className="o-btn-primary px-12 py-4 rounded-[1.5rem] shadow-2xl font-black text-xs tracking-widest">NUEVA SOLICITUD SJS</button>
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 o-animate-fade pb-20">
                {warehouses.map(w => (
                  <div key={w.id} className="o-kanban-card group border-none shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all p-8 rounded-3xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-odoo-primary/10 text-odoo-primary rounded-2xl flex items-center justify-center font-black text-sm group-hover:bg-odoo-primary group-hover:text-white transition-all">
                        {w.code.slice(-3)}
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${w.incoming_picking_type ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {w.incoming_picking_type ? 'SJS ACTIVO' : 'PENDIENTE'}
                      </div>
                    </div>
                    <h3 className="font-black text-gray-800 text-base mb-6 leading-tight group-hover:text-odoo-primary transition-colors">{w.name}</h3>
                    <div className="space-y-3 border-t border-gray-50 pt-6">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Código SJS:</span>
                        <span className="text-gray-900">{w.code}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Recepción:</span>
                        <span className="text-odoo-primary text-right font-black">{w.picking_name.split('/').pop()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-odoo-dark/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-saas">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="font-black text-xl text-gray-800 flex items-center gap-3 tracking-tighter">Inventario Central SJS</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Solo productos de San José</p>
               </div>
              <button onClick={() => setShowProductModal(false)} className="bg-white p-3 rounded-2xl text-gray-300 hover:text-rose-500 shadow-sm transition-all active:scale-90"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-odoo-primary transition-colors" size={20}/>
                <input 
                  autoFocus 
                  type="text" 
                  className="w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border-none rounded-2xl focus:ring-4 focus:ring-odoo-primary/5 outline-none text-sm font-black transition-all"
                  placeholder="Medicamento o insumo..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-2">
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => {
                    const exists = cart.find(c => c.id === p.id);
                    if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                    else setCart([...cart, {...p, qty: 1}]);
                    setShowProductModal(false);
                  }} className="w-full flex items-center justify-between p-6 bg-white hover:bg-odoo-primary/5 rounded-[1.5rem] border border-transparent hover:border-odoo-primary/10 transition-all text-left group">
                    <div className="max-w-[70%]">
                      <p className="font-black text-sm text-gray-800 group-hover:text-odoo-primary transition-colors uppercase tracking-tight leading-tight">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">SJS-REF: {p.default_code || 'S/COD'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">STOCK SJS</p>
                          <p className={`text-base font-black ${p.qty_available > 15 ? 'text-odoo-success' : 'text-rose-500'}`}>{Math.floor(p.qty_available)}</p>
                       </div>
                       <div className="p-2.5 bg-odoo-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                         <Plus size={20} className="text-odoo-primary"/>
                       </div>
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
