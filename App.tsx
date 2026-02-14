
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

  const loadAppData = useCallback(async (uid: number, companyId: number) => {
    setLoading(true);
    setSyncStatus('syncing');
    try {
      client.setAuth(uid, config.apiKey);
      const [wData, pTypes] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code', 'lot_stock_id']),
        client.searchRead('stock.picking.type', [['code', '=', 'incoming'], ['company_id', '=', companyId]], ['name', 'warehouse_id', 'sequence_code'])
      ]);

      const warehousesWithOps = wData.map((w: any) => ({
        ...w,
        incoming_picking_type: pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === w.id)?.id,
        picking_name: pTypes.find((p: any) => p.warehouse_id && p.warehouse_id[0] === w.id)?.name || 'Sin Operación'
      }));

      setWarehouses(warehousesWithOps);
      setSyncStatus('online');
    } catch (e: any) {
      setErrorLog("Error Odoo: " + e.message);
      setSyncStatus('offline');
    } finally { setLoading(false); }
  }, [client, config.apiKey]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    setErrorLog(null);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Acceso no autorizado.");

      const userSearch = await client.searchRead('res.users', [
        '|', '|',
        ['login', '=', loginInput],
        ['name', 'ilike', loginInput],
        ['email', '=', loginInput]
      ], ['id', 'name', 'login', 'company_id'], { limit: 1 });

      if (!userSearch || userSearch.length === 0) throw new Error("Usuario no encontrado.");

      const sessionData = {
        id: uid,
        odoo_user_id: userSearch[0].id,
        name: userSearch[0].name,
        login_email: userSearch[0].login,
        company_id: userSearch[0].company_id[0] || 1
      };

      setSession(sessionData);
      await loadAppData(uid, sessionData.company_id);
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const submitToOdoo = async () => {
    if (!cart.length || !selectedWarehouseId) return;
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
        notes: `SJS OPS: Requerimiento de ${session.name}\nDestino: ${warehouse?.name}\n${customNotes}`
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
        <div className="bg-white w-[380px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl border border-gray-100 relative overflow-hidden">
          {/* Decorative SaaS gradient */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-odoo-primary to-odoo-secondary"></div>
          
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
               {/* Clickable Logo for Root access */}
               <div 
                onClick={handleLogoClick}
                className={`w-14 h-14 bg-odoo-primary rounded-xl flex items-center justify-center text-white text-3xl font-bold italic shadow-lg cursor-default select-none transition-transform active:scale-95 ${isSupportUser ? 'hover:brightness-110' : ''}`}
               >
                 SJ
               </div>
               <h1 className="text-xl font-bold text-gray-800 tracking-tight mt-2">SJS Operations Hub</h1>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">San José Enterprise</p>
            </div>
            
            <form onSubmit={handleInitialAuth} className="w-full space-y-6">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 tracking-wider">Identificación</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-odoo-primary/20 focus:border-odoo-primary outline-none transition-all text-sm font-medium" 
                  placeholder="Usuario o correo corporativo" 
                  value={loginInput} 
                  onChange={e => setLoginInput(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="o-btn-primary w-full py-4 rounded-lg flex justify-center items-center gap-2 shadow-lg shadow-odoo-primary/20">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Ingresar al Portal'}
              </button>
            </form>

            {/* Este panel solo aparece tras el easter egg del usuario soporte */}
            {showConfig && isSupportUser && (
              <div className="w-full p-4 bg-odoo-primary/5 border border-odoo-primary/20 rounded-xl text-left space-y-3 animate-saas">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black text-odoo-primary uppercase tracking-widest">Ajustes Técnicos de Red</span>
                  <button onClick={() => setShowConfig(false)} className="text-odoo-primary"><X size={12}/></button>
                </div>
                <input className="w-full p-2 text-xs border border-gray-200 rounded bg-white outline-odoo-primary" placeholder="Endpoint Odoo" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} />
                <input className="w-full p-2 text-xs border border-gray-200 rounded bg-white outline-odoo-primary" placeholder="Base de Datos" value={config.db} onChange={e => setConfig({...config, db: e.target.value})} />
                <button onClick={() => { localStorage.setItem('odoo_ops_v18_config', JSON.stringify(config)); setShowConfig(false); }} className="o-btn-secondary w-full py-2 text-[10px] font-bold">Actualizar Servidor</button>
              </div>
            )}
            
            {errorLog && <div className="p-3 bg-red-50 text-red-600 text-[11px] font-bold border border-red-100 w-full rounded-lg flex items-center gap-2 o-animate-fade"><AlertCircle size={14}/> {errorLog}</div>}
            
            <p className="text-[10px] text-gray-400 font-medium">Versión 18.0.2-SJS</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-odoo-light text-odoo-text">
      {/* 1. ODOO SYSTEM BAR */}
      <header className="h-12 bg-odoo-primary text-white flex items-center justify-between px-4 shrink-0 z-[100] shadow-xl">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
            className={`p-2 rounded-lg transition-all ${showAppSwitcher ? 'bg-white/20 rotate-90' : 'hover:bg-white/10'}`}
          >
            <LayoutGrid size={22}/>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight bg-white/10 px-3 py-1 rounded-md">SJS HUB</span>
            <span className="text-[10px] font-bold opacity-40 hidden sm:block">|</span>
            <span className="text-xs font-medium opacity-70 hidden sm:block">San José Operaciones</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{syncStatus}</span>
          </div>
          <div className="flex items-center gap-3 hover:bg-white/10 px-3 py-1 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-xs font-black shadow-inner">
               {session?.name.slice(0,1).toUpperCase()}
            </div>
            <div className="flex flex-col text-left leading-none hidden sm:flex">
               <span className="text-xs font-bold">{session?.name}</span>
               <span className="text-[9px] opacity-50 font-medium uppercase mt-1">Sede Central</span>
            </div>
          </div>
          <button onClick={() => setView('login')} className="hover:bg-rose-500 p-2 rounded-lg transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      {/* APP SWITCHER OVERLAY */}
      {showAppSwitcher && (
        <div className="fixed inset-0 top-12 bg-odoo-primary/95 z-[90] flex flex-wrap content-start p-12 gap-10 backdrop-blur-md animate-saas">
           <button onClick={() => { setActiveTab('dashboard'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-odoo-secondary rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-active:scale-95 transition-all duration-300"><Home size={48}/></div>
              <span className="text-white font-black text-xs uppercase tracking-widest opacity-80 group-hover:opacity-100">Escritorio</span>
           </button>
           <button onClick={() => { setActiveTab('purchase'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-active:scale-95 transition-all duration-300"><ClipboardList size={48}/></div>
              <span className="text-white font-black text-xs uppercase tracking-widest opacity-80 group-hover:opacity-100">Logística</span>
           </button>
           <button onClick={() => { setActiveTab('monitor'); setShowAppSwitcher(false); }} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-active:scale-95 transition-all duration-300"><Building size={48}/></div>
              <span className="text-white font-black text-xs uppercase tracking-widest opacity-80 group-hover:opacity-100">Mis Sedes</span>
           </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* 2. SIDEBAR NAVIGATION */}
        <aside className="w-16 lg:w-[240px] bg-white border-r border-odoo-border flex flex-col shrink-0">
          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary/10 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <Home size={20}/><span className="hidden lg:block">Escritorio</span>
            </button>
            <button onClick={() => setActiveTab('purchase')} className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'purchase' ? 'bg-odoo-primary/10 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <ArrowRightLeft size={20}/><span className="hidden lg:block">Transferencias</span>
            </button>
            <button onClick={() => setActiveTab('monitor')} className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'monitor' ? 'bg-odoo-primary/10 text-odoo-primary shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
              <Store size={20}/><span className="hidden lg:block">Almacenes</span>
            </button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 3. CONTROL PANEL (ODOO SHEET STYLE) */}
          <div className="h-[80px] bg-white border-b border-odoo-border px-8 flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center text-[10px] font-black text-gray-300 gap-3 uppercase tracking-[0.2em]">
                <span>SJS</span> <ChevronRight size={12}/> 
                <span className="text-odoo-primary">{activeTab === 'purchase' ? 'INVENTARIO' : 'SISTEMAS'}</span>
              </div>
              <h2 className="text-2xl font-black text-odoo-dark tracking-tight">
                {activeTab === 'dashboard' ? 'Panel Principal' : activeTab === 'purchase' ? 'Nuevo Requerimiento' : 'Control de Stock'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => loadAppData(session.id, session.company_id)} className="o-btn-secondary flex items-center gap-2 border-gray-200">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualizar Datos
              </button>
              {activeTab === 'purchase' && (
                <button onClick={submitToOdoo} disabled={loading || cart.length === 0} className="o-btn-primary flex items-center gap-2 px-8">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> Validar Pedido</>}
                </button>
              )}
            </div>
          </div>

          {/* 4. MAIN CONTENT AREA */}
          <main className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] custom-scrollbar">
            
            {activeTab === 'dashboard' && (
               <div className="max-w-6xl mx-auto space-y-10 o-animate-fade">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="bg-white p-8 rounded-2xl border border-odoo-border shadow-sm flex items-center gap-6 group hover:border-odoo-primary transition-all">
                        <div className="w-14 h-14 bg-odoo-primary/5 text-odoo-primary rounded-2xl flex items-center justify-center group-hover:bg-odoo-primary group-hover:text-white transition-all"><Store size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sedes SJS</p><p className="text-3xl font-black">{warehouses.length}</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-2xl border border-odoo-border shadow-sm flex items-center gap-6 group hover:border-odoo-secondary transition-all">
                        <div className="w-14 h-14 bg-odoo-secondary/5 text-odoo-secondary rounded-2xl flex items-center justify-center group-hover:bg-odoo-secondary group-hover:text-white transition-all"><Package size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enlace RPC</p><p className="text-3xl font-black text-odoo-success uppercase text-xl tracking-tighter">Conectado</p></div>
                     </div>
                     <div className="bg-white p-8 rounded-2xl border border-odoo-border shadow-sm flex items-center gap-6 group hover:border-orange-500 transition-all">
                        <div className="w-14 h-14 bg-orange-500/5 text-orange-500 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all"><Activity size={28}/></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Versión Core</p><p className="text-3xl font-black tracking-tighter">v18.Enterprise</p></div>
                     </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-odoo-border p-20 text-center space-y-6">
                     <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto shadow-inner"><Activity size={48}/></div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Inicia una operación</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto font-medium">Usa el módulo de Transferencias para crear pedidos de reposición de medicamentos desde el almacén central.</p>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'purchase' && !orderComplete && (
              <div className="max-w-5xl mx-auto o-animate-fade bg-white p-12 rounded-2xl shadow-md border border-gray-100 mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-16">
                  <div className="space-y-8">
                    <div className="group">
                      <label className="o-form-label tracking-widest">Establecimiento Destino</label>
                      <select className="o-input-field font-black text-lg focus:border-odoo-secondary" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(Number(e.target.value))}>
                        <option value="">-- Seleccionar Tienda --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} · {w.code}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <label className="o-form-label tracking-widest">Referencias / Comentario</label>
                      <input type="text" className="o-input-field font-medium" placeholder="Escriba aquí (opcional)" value={customNotes} onChange={e => setCustomNotes(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b-2 border-odoo-primary/20 pb-4">
                    <h3 className="text-xs font-black uppercase text-odoo-primary tracking-[0.2em] flex items-center gap-3">
                       <div className="p-1.5 bg-odoo-primary/10 rounded-lg"><Package size={16}/></div>
                       Productos en Pedido
                    </h3>
                    <button onClick={() => {
                      if (products.length === 0) {
                        client.searchRead('product.template', [['purchase_ok', '=', true]], ['name', 'default_code', 'qty_available', 'uom_id'], { limit: 150 }).then(setProducts);
                      }
                      setShowProductModal(true);
                    }} className="bg-odoo-primary/5 hover:bg-odoo-primary text-odoo-primary hover:text-white px-5 py-2 rounded-xl text-[10px] font-black tracking-widest flex items-center gap-2 transition-all border border-odoo-primary/10">
                      <Plus size={18}/> AÑADIR LÍNEA
                    </button>
                  </div>

                  <div className="overflow-hidden border border-gray-100 rounded-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/80 border-b border-gray-100">
                        <tr>
                          <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Descripción</th>
                          <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center w-40">Unidades</th>
                          <th className="p-5 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-odoo-primary/5 transition-all group">
                            <td className="p-5">
                              <div className="font-black text-[15px] text-gray-800 tracking-tight">{item.name}</div>
                              <div className="text-[10px] font-bold text-odoo-primary/60 uppercase tracking-tighter mt-1">{item.default_code || 'N/A'}</div>
                            </td>
                            <td className="p-5 text-center">
                              <input 
                                type="number" 
                                className="w-24 text-center border-b-2 border-gray-100 bg-transparent outline-none focus:border-odoo-primary font-black text-lg py-1 transition-colors"
                                value={item.qty}
                                min="1"
                                onChange={(e) => setCart(cart.map((c, i) => i === idx ? {...c, qty: parseInt(e.target.value) || 0} : c))}
                              />
                            </td>
                            <td className="p-5 text-right">
                              <button onClick={() => setCart(cart.filter((_,i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-lg">
                                <Trash2 size={18}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {cart.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-32 text-gray-300 italic text-sm font-medium">El carrito de transferencias está vacío.</td>
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
                <div className="w-24 h-24 bg-green-50 text-odoo-success rounded-[2rem] flex items-center justify-center shadow-xl border border-green-100 rotate-12 transition-transform hover:rotate-0"><Check size={48}/></div>
                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-odoo-dark tracking-tight">¡Validación Exitosa!</h2>
                  <p className="text-gray-400 font-medium text-lg">La orden de transferencia ha sido enviada a Odoo Central.</p>
                </div>
                <button onClick={() => setOrderComplete(false)} className="o-btn-primary px-12 py-4 rounded-2xl shadow-xl">Crear Nueva Operación</button>
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 o-animate-fade pb-20">
                {warehouses.map(w => (
                  <div key={w.id} className="o-kanban-card group border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-odoo-primary/10 text-odoo-primary rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-odoo-primary group-hover:text-white transition-all">
                        {w.code.slice(-3)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${w.incoming_picking_type ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {w.incoming_picking_type ? 'ACTIVO' : 'ERROR CONFIG'}
                      </div>
                    </div>
                    <h3 className="font-black text-gray-800 text-base mb-6 leading-snug group-hover:text-odoo-primary transition-colors">{w.name}</h3>
                    <div className="space-y-3 border-t border-gray-50 pt-6">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Referencia:</span>
                        <span className="text-gray-900">{w.code}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Operación:</span>
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

      {/* 5. PRODUCT SELECTION MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-odoo-dark/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-saas">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="font-black text-xl text-gray-800 flex items-center gap-3">Catálogo SJS</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Busca y selecciona insumos</p>
               </div>
              <button onClick={() => setShowProductModal(false)} className="bg-white p-3 rounded-2xl text-gray-300 hover:text-rose-500 shadow-sm transition-all"><X size={24}/></button>
            </div>
            <div className="px-8 py-6 bg-white border-b">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-odoo-primary transition-colors" size={20}/>
                <input 
                  autoFocus 
                  type="text" 
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-odoo-primary/20 outline-none text-sm font-bold transition-all"
                  placeholder="Escribe el nombre del medicamento..."
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
                  }} className="w-full flex items-center justify-between p-5 bg-white hover:bg-odoo-primary/5 rounded-2xl border border-transparent hover:border-odoo-primary/20 transition-all text-left group">
                    <div className="max-w-[70%]">
                      <p className="font-black text-sm text-gray-800 group-hover:text-odoo-primary transition-colors uppercase tracking-tight">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">REF: {p.default_code || 'S/COD'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">STOCK</p>
                          <p className={`text-base font-black ${p.qty_available > 20 ? 'text-odoo-success' : 'text-rose-500'}`}>{Math.floor(p.qty_available)}</p>
                       </div>
                       <div className="p-2 bg-odoo-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
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
