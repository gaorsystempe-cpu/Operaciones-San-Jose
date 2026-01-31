
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Warehouse as WarehouseIcon, Check, MessageSquare, Layers, 
  Building2, Save, Wifi, AlertTriangle, ClipboardList, Database,
  Users as UsersIcon, Clock, Calendar as CalendarIcon, MapPin, Briefcase,
  CalendarDays, Zap, Trash, Info, ShieldCheck, Lock, UserCheck, Truck
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { Product, AppConfig, UserSession, Warehouse, Employee } from './types';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe/",
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<string>('purchase');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('offline');
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>(() => {
    const saved = localStorage.getItem('sanjose_cart_draft');
    return saved ? JSON.parse(saved) : [];
  });
  const [manualComments, setManualComments] = useState(() => localStorage.getItem('sanjose_notes_draft') || "");
  const [originWarehouseId, setOriginWarehouseId] = useState<number | ''>(() => {
    const saved = localStorage.getItem('sanjose_warehouse_draft');
    return saved ? parseInt(saved) : '';
  });

  const [priority, setPriority] = useState("0"); 
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [monitorWarehouseId, setMonitorWarehouseId] = useState<number | ''>('');
  const [stockLevelFilter, setStockLevelFilter] = useState<number>(15);
  const [criticalProducts, setCriticalProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hrFilterBranch, setHrFilterBranch] = useState<number | 'all'>('all');
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  useEffect(() => { localStorage.setItem('sanjose_cart_draft', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('sanjose_notes_draft', manualComments); }, [manualComments]);
  useEffect(() => { if (originWarehouseId) localStorage.setItem('sanjose_warehouse_draft', originWarehouseId.toString()); }, [originWarehouseId]);

  const getContext = useCallback((companyId: number, warehouseId?: number) => ({
    company_id: companyId,
    allowed_company_ids: [companyId],
    active_test: true,
    ...(warehouseId ? { warehouse: warehouseId } : {})
  }), []);

  const loadAppData = useCallback(async (uid: number, companyId: number, userName: string) => {
    setLoading(true);
    setSyncStatus('syncing');
    try {
      client.setAuth(uid, config.apiKey);
      const context = getContext(companyId);
      const [wData, eData] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code'], { context }),
        client.searchRead('hr.employee', [['company_id', '=', companyId]], ['name', 'job_title', 'work_email', 'work_phone', 'department_id', 'resource_calendar_id'], { limit: 100, context })
      ]);
      setWarehouses(wData || []);
      setEmployees(eData || []);
      const myEmployee = eData.find((e: any) => e.name.toLowerCase().includes(userName.toLowerCase()));
      if (myEmployee) setSession((prev: any) => ({ ...prev, employee_data: myEmployee }));
      if (wData.length > 0) {
        if (!originWarehouseId) setOriginWarehouseId(wData[0].id);
        setMonitorWarehouseId(prev => prev || wData[0].id);
        const pData = await client.searchRead('product.template', [['purchase_ok', '=', true]], ['name', 'default_code', 'qty_available', 'product_variant_id', 'uom_id'], { limit: 400, context: getContext(companyId, Number(wData[0].id)) });
        setProducts(pData || []);
      }
      setSyncStatus('online');
    } catch (e: any) {
      setErrorLog("Sincronización fallida.");
      setSyncStatus('offline');
    } finally { setLoading(false); }
  }, [client, config.apiKey, getContext, originWarehouseId]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      const userSearch = await client.searchRead('res.users', ['|', ['login', '=', loginInput.trim()], ['name', 'ilike', loginInput.trim()]], ['id', 'name', 'login'], { limit: 1 });
      const companies = await client.searchRead('res.company', [], ['name']);
      const targetCompany = companies.find((c: any) => c.name.includes("SAN JOSE")) || companies[0];

      if (!userSearch || userSearch.length === 0) throw new Error("Usuario no encontrado.");

      const loginEmail = userSearch[0].login.toLowerCase();
      const userName = userSearch[0].name;

      // LÓGICA DE ROLES SEGÚN SOLICITUD
      let role: 'superadmin' | 'admin' | 'employee' = 'employee';
      
      // Superadmins: soporte y Jose Herrera
      if (loginEmail === 'soporte@facturaclic.pe' || loginEmail === 'soporte@sanjose.pe' || userName.toLowerCase().includes('jose herrera')) {
        role = 'superadmin';
      } 
      // Admins: admin1 y Lourdes
      else if (loginEmail === 'admin1@sanjose.pe' || userName.toLowerCase().includes('lourdes')) {
        role = 'admin';
      }

      setSession({
        id: uid,
        odoo_user_id: userSearch[0].id,
        name: userName,
        login_email: loginEmail,
        role: role,
        company_id: targetCompany.id,
        company_name: targetCompany.name
      });
      loadAppData(uid, targetCompany.id, userName);
      setView('app');
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  const loadMonitorStock = useCallback(async (wId: number) => {
    if (!session?.company_id) return;
    setLoading(true);
    try {
      const data = await client.searchRead('product.template', [['purchase_ok', '=', true], ['qty_available', '<=', stockLevelFilter]], ['name', 'default_code', 'qty_available', 'product_variant_id'], { limit: 100, context: getContext(session.company_id, wId), order: 'qty_available asc' });
      setCriticalProducts(data || []);
      setMonitorWarehouseId(wId);
    } catch (e: any) { setErrorLog("Error de inventario."); } finally { setLoading(false); }
  }, [client, session, getContext, stockLevelFilter]);

  useEffect(() => { if (activeTab === 'monitor' && monitorWarehouseId) loadMonitorStock(Number(monitorWarehouseId)); }, [activeTab, monitorWarehouseId, stockLevelFilter, loadMonitorStock]);

  const submitToOdoo = async () => {
    if (!cart.length || !originWarehouseId || !session?.company_id) return;
    setLoading(true);
    try {
      const companyId = session.company_id;
      const partners = await client.searchRead('res.partner', [['name', '=', 'CADENA DE BOTICAS SAN JOSE S.A.C.']], ['id'], { limit: 1 });
      let partnerId = partners?.[0]?.id || 1;
      const pickingTypes = await client.searchRead('stock.picking.type', [['warehouse_id', '=', originWarehouseId], ['code', '=', 'incoming']], ['id'], { limit: 1 });
      const orderLines = cart.map(item => [0, 0, {
        product_id: Array.isArray(item.product_variant_id) ? item.product_variant_id[0] : item.product_variant_id,
        name: item.name,
        product_qty: item.qty,
        product_uom: Array.isArray(item.uom_id) ? item.uom_id[0] : (item.uom_id || 1),
        price_unit: 0.0,
        date_planned: scheduledDate + " 23:59:59"
      }]);
      await client.create('purchase.order', { partner_id: partnerId, company_id: companyId, user_id: session.odoo_user_id, picking_type_id: pickingTypes?.[0]?.id, order_line: orderLines, priority: priority, notes: `Notas: ${manualComments}` }, getContext(companyId));
      setCart([]); setOrderComplete(true);
    } catch (e: any) { setErrorLog(e.message); } finally { setLoading(false); }
  };

  const navigation = useMemo(() => {
    return [
      { id: 'purchase', label: 'Requerimientos', icon: ClipboardList, roles: ['superadmin', 'admin', 'employee'] },
      { id: 'monitor', label: 'Monitor Stock', icon: LayoutGrid, roles: ['superadmin', 'admin', 'employee'] },
      { id: 'hr', label: (session?.role === 'employee' ? 'Mi Horario' : 'Personal / RRHH'), icon: UsersIcon, roles: ['superadmin', 'admin', 'employee'] },
      { id: 'settings', label: 'Ajustes', icon: Settings, roles: ['superadmin'] }
    ].filter(i => i.roles.includes(session?.role));
  }, [session]);

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-odoo-gray/30 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl h-[560px] rounded-3xl shadow-2xl flex overflow-hidden animate-saas border border-odoo-border">
          <div className="hidden lg:block w-1/2 odoo-gradient relative p-12">
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="text-4xl font-black text-white italic">O</div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">OPERACIONES<br/>SAN JOSÉ</h1>
                <p className="text-white/60 text-sm font-medium">Gestión inteligente de logística y capital humano para Boticas San José.</p>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center gap-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-odoo-dark uppercase">Bienvenido</h2>
              <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">Portal Administrativo Enterprise</p>
            </div>
            <form onSubmit={handleInitialAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-odoo-text uppercase tracking-widest ml-1">Email / Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-text/30" size={18}/>
                  <input type="text" className="w-full pl-12 pr-6 py-4 bg-odoo-gray/50 border-2 border-transparent focus:border-odoo-purple rounded-2xl text-sm font-bold outline-none transition-all" placeholder="usuario@sanjose.pe" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Acceder'}
              </button>
              {errorLog && <p className="text-center text-rose-500 text-[10px] font-bold uppercase">{errorLog}</p>}
            </form>
            <div className="pt-8 border-t border-odoo-border flex justify-between text-[9px] font-black text-odoo-text/30 uppercase tracking-widest">
              <span>© San José HUB</span>
              <div className="flex gap-2"><div className="w-2 h-2 bg-odoo-teal rounded-full"></div><div className="w-2 h-2 bg-odoo-purple rounded-full"></div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-odoo-gray/30 overflow-hidden font-sans">
      <aside className="w-20 lg:w-72 bg-odoo-dark shrink-0 flex flex-col z-50">
        <div className="h-20 flex items-center px-6 lg:px-8 border-b border-white/5">
          <div className="w-10 h-10 odoo-gradient rounded-xl flex items-center justify-center text-white italic font-black text-xl">O</div>
          <div className="ml-4 hidden lg:block overflow-hidden">
            <h2 className="font-black text-white text-xs uppercase tracking-tighter">OPERACIONES</h2>
            <p className="text-odoo-teal text-[8px] font-bold tracking-widest">SaaS PORTAL</p>
          </div>
        </div>
        <nav className="flex-1 p-3 lg:p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setOrderComplete(false); }} className={`w-full group flex items-center p-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-odoo-purple text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-odoo-teal'} />
              <div className="ml-4 text-left hidden lg:block">
                <p className="font-black text-[11px] uppercase tracking-wider leading-none">{item.label}</p>
                <p className={`text-[8px] mt-1 font-bold uppercase ${activeTab === item.id ? 'text-white/50' : 'text-gray-600'}`}>Módulo</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => setView('login')} className="w-full flex items-center p-3.5 rounded-2xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">
            <LogOut size={20} /><span className="ml-4 font-black text-[10px] hidden lg:block uppercase tracking-widest">Desconectar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 glass-header flex items-center justify-between px-6 lg:px-10 shrink-0 z-40">
           <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 odoo-gradient rounded-xl flex items-center justify-center text-white font-black text-sm uppercase shadow-lg rotate-3">{session?.name.slice(0,2)}</div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-odoo-dark uppercase">{session?.name}</span>
                  <span className="px-1.5 py-0.5 bg-odoo-purple/10 text-odoo-purple text-[7px] font-black rounded uppercase border border-odoo-purple/10">{session?.role}</span>
                </div>
                <span className="text-[8px] font-bold text-odoo-teal uppercase tracking-widest">{session?.company_name}</span>
              </div>
           </div>
           <div className="flex items-center gap-4">
              {cart.length > 0 && <div className="hidden md:flex px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 text-[8px] font-black uppercase tracking-widest">Borrador: {cart.length} Ítems</div>}
              <div className={`px-4 py-2 rounded-xl border text-[8px] font-black uppercase flex items-center gap-2 ${syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div> {syncStatus}
              </div>
              <button onClick={() => session && loadAppData(session.id, session.company_id || 0, session.name)} className="p-2.5 bg-white border border-odoo-border rounded-xl saas-shadow group"><RefreshCw size={18} className={loading ? 'animate-spin text-odoo-purple' : 'text-odoo-text'} /></button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-odoo-gray/20 custom-scrollbar text-left">
          {errorLog && (
            <div className="mb-6 bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl flex items-center gap-4 animate-saas">
              <AlertCircle className="text-rose-500 shrink-0" size={24}/>
              <p className="text-rose-600 text-[11px] font-bold uppercase">{errorLog}</p>
              <button onClick={() => setErrorLog(null)} className="ml-auto opacity-30 hover:opacity-100"><Trash2 size={16}/></button>
            </div>
          )}

          {activeTab === 'purchase' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {!orderComplete ? (
                <div className="bg-white rounded-3xl saas-shadow border border-odoo-border overflow-hidden animate-saas">
                  <div className="p-8 bg-odoo-gray/40 border-b border-odoo-border flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-odoo-dark uppercase">Requerimiento</h2>
                      <p className="text-[9px] font-bold text-odoo-text/40 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Persistencia activa 24h</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { if(confirm("¿Limpiar borrador?")) setCart([]); }} className="p-3 bg-white text-rose-500 rounded-xl border border-odoo-border hover:bg-rose-50 transition-all"><Trash size={18}/></button>
                      <button onClick={() => setShowProductModal(true)} className="odoo-gradient text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:translate-y-[-2px] transition-all"><Plus size={18}/> Añadir Ítem</button>
                    </div>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><WarehouseIcon size={10}/> Sede</label>
                        <select className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none" value={originWarehouseId} onChange={e => setOriginWarehouseId(Number(e.target.value))}>
                          <option value="">Seleccionar Local...</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><Zap size={10}/> Urgencia</label>
                        <select className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none" value={priority} onChange={e => setPriority(e.target.value)}><option value="0">Normal</option><option value="1">Urgente</option></select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><CalendarDays size={10}/> Entrega</label>
                        <input type="date" className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-odoo-border overflow-hidden bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-odoo-gray text-[9px] font-black uppercase text-odoo-text/50 border-b border-odoo-border">
                          <tr><th className="px-6 py-4">Producto / SKU</th><th className="px-6 py-4 text-center">Cant.</th><th className="px-6 py-4 text-right"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-odoo-border">
                          {cart.map((item, idx) => (
                            <tr key={idx} className="hover:bg-odoo-gray/20 transition-all">
                              <td className="px-6 py-4">
                                <p className="font-bold text-odoo-dark text-[11px] uppercase">{item.name}</p>
                                <p className="text-[8px] text-odoo-teal font-black uppercase tracking-widest mt-0.5">{item.default_code || '---'}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="inline-flex items-center gap-3 bg-odoo-gray p-1.5 rounded-xl border border-odoo-border shadow-inner">
                                  <button onClick={() => setCart(cart.map((c, i) => i === idx ? {...c, qty: Math.max(1, c.qty - 1)} : c))} className="w-7 h-7 rounded-lg bg-white shadow flex items-center justify-center font-black text-odoo-purple hover:bg-odoo-purple hover:text-white transition-all">-</button>
                                  <span className="font-black text-[12px] w-8 text-center text-odoo-dark">{item.qty}</span>
                                  <button onClick={() => setCart(cart.map((c, i) => i === idx ? {...c, qty: c.qty + 1} : c))} className="w-7 h-7 rounded-lg bg-white shadow flex items-center justify-center font-black text-odoo-purple hover:bg-odoo-purple hover:text-white transition-all">+</button>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-odoo-text/20 hover:text-rose-500 transition-all p-2 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                          {cart.length === 0 && <tr><td colSpan={3} className="px-6 py-20 text-center text-odoo-text/20 font-black uppercase text-[10px] tracking-widest">Borrador vacío</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <button disabled={!cart.length || loading || !originWarehouseId} onClick={submitToOdoo} className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-20 hover:brightness-110 active:scale-95 transition-all">
                      {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Finalizar y Enviar a Odoo'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-saas bg-white rounded-3xl border border-odoo-border saas-shadow p-12">
                   <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border-4 border-emerald-100 animate-bounce"><Check size={48} strokeWidth={3}/></div>
                   <div className="space-y-2">
                      <h2 className="text-3xl font-black text-odoo-dark uppercase">¡Enviado!</h2>
                      <p className="text-odoo-text/50 font-bold uppercase text-[10px] tracking-widest">El pedido está en la cola de Odoo.</p>
                   </div>
                   <button onClick={() => setOrderComplete(false)} className="px-12 py-4 bg-odoo-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-odoo-purple transition-all shadow-xl">Nuevo Pedido</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 animate-saas">
               <aside className="w-full lg:w-72 space-y-6 shrink-0">
                  <div className="bg-white p-6 rounded-3xl border border-odoo-border saas-shadow space-y-6">
                     <h3 className="text-[10px] font-black text-odoo-dark uppercase tracking-widest">Sedes San José</h3>
                     <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar text-left">
                        {warehouses.map(w => (
                           <button key={w.id} onClick={() => loadMonitorStock(w.id)} className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${monitorWarehouseId === w.id ? 'bg-odoo-purple border-odoo-purple text-white shadow-lg' : 'bg-odoo-gray/50 border-transparent hover:border-odoo-border text-odoo-text'}`}>
                              <span className="text-[11px] font-black uppercase tracking-tight truncate">{w.name}</span>
                              <ChevronRight size={14} className={monitorWarehouseId === w.id ? 'text-white' : 'text-odoo-border'}/>
                           </button>
                        ))}
                     </div>
                     <div className="pt-4 border-t border-odoo-border">
                        <div className="flex justify-between items-center mb-4 text-[9px] font-black text-odoo-text uppercase tracking-widest"><span>Stock Crítico</span><span className="text-odoo-purple italic">&lt; {stockLevelFilter}</span></div>
                        <input type="range" min="0" max="150" className="w-full accent-odoo-purple" value={stockLevelFilter} onChange={e => setStockLevelFilter(parseInt(e.target.value))} />
                     </div>
                  </div>
               </aside>
               <section className="flex-1">
                  <div className="bg-white p-8 rounded-3xl border border-odoo-border saas-shadow space-y-8 overflow-hidden">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1 text-left">
                           <h2 className="text-2xl font-black text-odoo-dark uppercase flex items-center gap-4 italic">Existencias <Layers className="text-odoo-teal" size={24}/></h2>
                           <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">{warehouses.find(w => w.id === monitorWarehouseId)?.name || '...'}</p>
                        </div>
                        <div className="px-4 py-2 bg-odoo-gray rounded-xl border border-odoo-border"><p className="text-[16px] font-black text-rose-500">{criticalProducts.length} <span className="text-[8px] uppercase tracking-widest text-odoo-text/40 ml-1">Alertas</span></p></div>
                     </div>
                     <div className="rounded-2xl border border-odoo-border overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-odoo-gray text-[9px] font-black uppercase text-odoo-text/50 border-b"><tr><th className="px-8 py-5">Insumo</th><th className="px-8 py-5 text-center">Físico</th><th className="px-8 py-5 text-right"></th></tr></thead>
                           <tbody className="divide-y divide-odoo-border">
                             {criticalProducts.map((p) => (
                               <tr key={p.id} className="hover:bg-odoo-gray/10">
                                 <td className="px-8 py-4">
                                   <p className="font-bold text-odoo-dark text-[11px] uppercase">{p.name}</p>
                                   <p className="text-[8px] text-odoo-text/40 font-mono mt-0.5">{p.default_code || '---'}</p>
                                 </td>
                                 <td className="px-8 py-4 text-center">
                                   <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 font-black text-sm italic ${p.qty_available <= 5 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>{p.qty_available}</div>
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                   <button onClick={() => {
                                      const exists = cart.find(c => c.id === p.id);
                                      if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                                      else setCart([...cart, { ...p, qty: 1 }]);
                                      setActiveTab('purchase');
                                   }} className="px-6 py-2 bg-odoo-purple text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">Pedir</button>
                                 </td>
                               </tr>
                             ))}
                             {criticalProducts.length === 0 && <tr><td colSpan={3} className="px-8 py-20 text-center text-odoo-text/10 font-black uppercase text-[10px] tracking-widest">Todo en orden</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </section>
            </div>
          )}

          {activeTab === 'hr' && (
             <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-saas text-left">
                {session?.role === 'employee' ? (
                   // VISTA PRIVADA PARA EMPLEADOS: SOLO SU USUARIO
                   <div className="bg-white p-10 rounded-3xl border border-odoo-border saas-shadow grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                      <div className="lg:col-span-1 space-y-6">
                        <div className="w-16 h-16 odoo-gradient rounded-2xl flex items-center justify-center text-white italic font-black text-2xl mb-8 shadow-lg rotate-3">{session?.name.slice(0,2)}</div>
                        <h2 className="text-3xl font-black text-odoo-dark uppercase leading-none">{session?.name}</h2>
                        <div className="space-y-4 pt-4 border-t border-odoo-border">
                           <div className="flex items-center gap-3"><Briefcase size={16} className="text-odoo-teal"/><p className="text-[11px] font-bold text-odoo-dark uppercase">{session?.employee_data?.job_title || 'Colaborador San José'}</p></div>
                           <div className="flex items-center gap-3"><MapPin size={16} className="text-odoo-teal"/><p className="text-[11px] font-bold text-odoo-dark uppercase">{session?.employee_data?.department_id?.[1] || 'Sede Asignada'}</p></div>
                        </div>
                      </div>
                      <div className="lg:col-span-2 bg-odoo-purple/5 p-8 rounded-3xl border border-odoo-purple/10 space-y-6">
                        <div className="flex justify-between items-center text-[10px] font-black text-odoo-purple uppercase tracking-widest"><span>Mi Jornada Semanal</span> <Clock size={16}/></div>
                        <div className="grid grid-cols-7 gap-2">
                           {['L','M','X','J','V','S','D'].map((d, i) => <div key={i} className={`h-16 rounded-xl flex items-center justify-center font-black ${i < 6 ? 'bg-white border border-odoo-purple/20 text-odoo-dark shadow-sm' : 'bg-rose-50 text-rose-300'}`}>{d}</div>)}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4 p-4 bg-white/50 rounded-xl border border-dashed border-odoo-purple/20">
                           <Info size={14} className="text-odoo-purple"/>
                           <p className="text-[9px] font-bold text-odoo-purple/70 uppercase italic">Calendario asignado: {session?.employee_data?.resource_calendar_id?.[1] || 'Horario Estándar'}</p>
                        </div>
                      </div>
                   </div>
                ) : (
                   // VISTA PARA ADMINS Y SUPERADMINS: DIRECTORIO COMPLETO
                   <div className="bg-white p-10 rounded-3xl border border-odoo-border saas-shadow space-y-10 text-left">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1"><h2 className="text-3xl font-black text-odoo-dark uppercase flex items-center gap-4 italic">Capital Humano <UsersIcon className="text-odoo-purple" size={32}/></h2></div>
                        <select className="bg-odoo-gray border-2 border-odoo-border p-3.5 rounded-xl text-[10px] font-black uppercase outline-none focus:border-odoo-purple transition-all" value={hrFilterBranch} onChange={e => setHrFilterBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                           <option value="all">Ver Todas las Sedes</option>
                           {Array.from(new Set(employees.filter(e => e.department_id).map(e => JSON.stringify(e.department_id)))).map(d => { const dj = JSON.parse(d as string); return <option key={dj[0]} value={dj[0]}>{dj[1]}</option>; })}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(hrFilterBranch === 'all' ? employees : employees.filter(e => e.department_id && e.department_id[0] === hrFilterBranch)).map(emp => (
                           <div key={emp.id} className="bg-white border border-odoo-border rounded-2xl p-6 hover:border-odoo-purple transition-all group relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 bg-emerald-50 text-emerald-500 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity"><UserCheck size={14}/></div>
                              <div className="w-10 h-10 bg-odoo-gray rounded-xl flex items-center justify-center text-odoo-purple font-black text-[12px] group-hover:bg-odoo-purple group-hover:text-white mb-4 italic transition-all shadow-inner">{emp.name.slice(0,2).toUpperCase()}</div>
                              <h4 className="font-black text-odoo-dark text-xs uppercase mb-1 line-clamp-1 group-hover:text-odoo-purple transition-colors">{emp.name}</h4>
                              <p className="text-[8px] font-bold text-odoo-teal uppercase truncate">{emp.job_title || 'Colaborador'}</p>
                              <div className="mt-4 pt-4 border-t border-odoo-border flex justify-between text-[8px] font-black text-odoo-text/30 uppercase tracking-tighter">
                                 <span>Contacto:</span> <span className="text-odoo-purple font-bold">{emp.work_phone || '---'}</span>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>
                )}
             </div>
          )}

          {activeTab === 'settings' && session?.role === 'superadmin' && (
             <div className="max-w-2xl mx-auto pt-10 animate-saas text-left">
               <div className="bg-white p-12 rounded-3xl saas-shadow border border-odoo-border space-y-10">
                  <div className="text-center space-y-4">
                     <div className="w-16 h-16 odoo-gradient text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl rotate-3"><Database size={32}/></div>
                     <h2 className="text-2xl font-black text-odoo-dark uppercase italic tracking-tighter leading-none">Configuración SaaS</h2>
                     <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">Acceso exclusivo a Soporte y Dirección</p>
                  </div>
                  <div className="space-y-6 pt-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-odoo-text uppercase ml-2 tracking-widest">Endpoint Odoo URL</label>
                       <div className="relative">
                          <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-purple/30" size={18}/>
                          <input className="w-full bg-odoo-gray border-2 border-transparent px-12 py-4 rounded-2xl text-[12px] font-bold outline-none focus:border-odoo-purple shadow-inner transition-all" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-odoo-text uppercase ml-2 tracking-widest">Base de Datos</label>
                       <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-purple/30" size={18}/>
                          <input className="w-full bg-odoo-gray border-2 border-transparent px-12 py-4 rounded-2xl text-[12px] font-bold outline-none focus:border-odoo-purple shadow-inner transition-all" value={config.db} onChange={e => setConfig({...config, db: e.target.value})} />
                       </div>
                    </div>
                  </div>
                  <button onClick={() => { localStorage.setItem('odoo_ops_v18_config', JSON.stringify(config)); alert("Configuración actualizada."); }} className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all">Reconfigurar Servidor</button>
               </div>
             </div>
          )}
        </main>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[100] bg-odoo-dark/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-saas flex flex-col max-h-[85vh] border border-white/10 text-left">
             <div className="p-8 border-b border-odoo-border flex items-center justify-between bg-odoo-gray/30">
                <div className="space-y-1"><h3 className="font-black text-odoo-dark uppercase text-xl italic leading-none">Maestro de Insumos</h3><p className="text-[9px] font-bold text-odoo-teal uppercase tracking-widest">Odoo Enterprise v19</p></div>
                <button onClick={() => setShowProductModal(false)} className="text-odoo-text/30 hover:text-odoo-purple transition-all p-2 rounded-full hover:bg-white"><Plus size={32} className="rotate-45"/></button>
             </div>
             <div className="p-6 bg-white border-b border-odoo-border">
                <div className="relative"><input type="text" autoFocus className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple pl-12 pr-6 py-4 rounded-2xl text-[13px] font-bold outline-none shadow-inner" placeholder="Buscar por Nombre o SKU..." value={productSearch} onChange={e => setProductSearch(e.target.value)} /><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-purple" size={20}/></div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3 custom-scrollbar bg-odoo-gray/5">
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.default_code && p.default_code.toLowerCase().includes(productSearch.toLowerCase()))).map(p => (
                   <button key={p.id} onClick={() => { 
                      const exists = cart.find(c => c.id === p.id);
                      if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                      else setCart([...cart, {...p, qty: 1}]); 
                      setShowProductModal(false); 
                    }} className="w-full flex items-center justify-between p-4 bg-white hover:bg-odoo-purple/[0.03] rounded-2xl border border-odoo-border hover:border-odoo-purple group transition-all text-left">
                     <div className="space-y-1">
                        <p className="font-black text-odoo-dark text-[11px] uppercase group-hover:text-odoo-purple transition-colors">{p.name}</p>
                        <div className="flex items-center gap-3 text-[8px] font-black uppercase text-odoo-text/40 tracking-widest">
                           <span className="flex items-center gap-2"><Barcode size={12}/> {p.default_code || '---'}</span>
                           <span className={`px-2 py-0.5 rounded-md border font-bold ${p.qty_available <= 5 ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-odoo-teal border-emerald-100'}`}>Físico: {p.qty_available}</span>
                        </div>
                     </div>
                     <div className="bg-odoo-purple text-white p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg shadow-odoo-purple/20"><Plus size={18}/></div>
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
