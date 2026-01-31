
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, LogOut, Plus, Search, Trash2, Send, RefreshCw, 
  ChevronRight, AlertCircle, User as UserIcon, LayoutGrid, Loader2, Barcode, 
  Warehouse as WarehouseIcon, Check, MessageSquare, Layers, 
  Building2, Save, Wifi, AlertTriangle, ClipboardList, Database,
  Users as UsersIcon, Clock, Calendar as CalendarIcon, MapPin, Briefcase,
  CalendarDays, Zap, Trash, Info, ShieldCheck, Lock, UserCheck, Store,
  InfoIcon,
  HelpCircle,
  Map,
  FileText
} from 'lucide-react';
import { OdooClient } from './services/odooService';
import { Product, AppConfig, UserSession, Warehouse, Employee, PosConfig } from './types';

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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [posConfigs, setPosConfigs] = useState<PosConfig[]>([]);
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
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [customNotes, setCustomNotes] = useState("");
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

  const getContext = useCallback((companyId: number, warehouseId?: number) => ({
    company_id: companyId,
    allowed_company_ids: [companyId],
    active_test: true,
    ...(warehouseId ? { warehouse: warehouseId } : {})
  }), []);

  const loadAppData = useCallback(async (uid: number, companyId: number, userName: string, userEmail: string, odooUserId: number) => {
    setLoading(true);
    setSyncStatus('syncing');
    setErrorLog(null);
    try {
      client.setAuth(uid, config.apiKey);
      const context = getContext(companyId);
      
      const [wData, eData, pConfigs] = await Promise.all([
        client.searchRead('stock.warehouse', [['company_id', '=', companyId]], ['name', 'code'], { context }),
        client.searchRead('hr.employee', [['company_id', '=', companyId]], ['name', 'job_title', 'work_email', 'work_phone', 'department_id', 'resource_calendar_id', 'user_id'], { limit: 500, context }),
        client.searchRead('pos.config', [['company_id', '=', companyId]], ['name'], { context })
      ]);

      setWarehouses(wData || []);
      setEmployees(eData || []);
      setPosConfigs(pConfigs || []);

      const myEmployee = eData.find((e: any) => 
        (e.user_id && e.user_id[0] === odooUserId) ||
        (e.work_email && e.work_email.toLowerCase() === userEmail.toLowerCase())
      );

      if (myEmployee) {
        setSession((prev: any) => ({ ...prev, employee_data: myEmployee }));
        if (myEmployee.department_id) {
          const deptName = myEmployee.department_id[1].toLowerCase();
          const matchedWarehouse = wData.find((w: any) => 
            w.name.toLowerCase().includes(deptName) || deptName.includes(w.name.toLowerCase())
          );
          if (matchedWarehouse) {
            setSelectedWarehouseId(matchedWarehouse.id);
            setMonitorWarehouseId(matchedWarehouse.id);
          }
        }
      }

      const currentWId = selectedWarehouseId || monitorWarehouseId || (wData[0]?.id);
      if (currentWId) {
        setMonitorWarehouseId(currentWId);
        const pData = await client.searchRead('product.template', [['purchase_ok', '=', true]], ['name', 'default_code', 'qty_available', 'product_variant_id', 'uom_id'], { limit: 400, context: getContext(companyId, Number(currentWId)) });
        // Ordenamiento: Cantidad 0 a más
        const sortedPData = (pData || []).sort((a: any, b: any) => (a.qty_available || 0) - (b.qty_available || 0));
        setProducts(sortedPData);
      }
      
      setSyncStatus('online');
    } catch (e: any) {
      setErrorLog(`Error de Conexión: ${e.message}`);
      setSyncStatus('offline');
    } finally { setLoading(false); }
  }, [client, config.apiKey, getContext, monitorWarehouseId, selectedWarehouseId]);

  const handleInitialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = loginInput.trim();
    if (!input) return;
    
    setLoading(true);
    setErrorLog(null);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      if (!uid) throw new Error("Fallo de autenticación XML-RPC.");

      const companySearch = await client.searchRead('res.company', [['name', 'ilike', config.companyName]], ['id', 'name'], { limit: 1 });
      if (!companySearch || companySearch.length === 0) throw new Error(`SJS: Compañía "${config.companyName}" no encontrada.`);
      const sjCompanyId = companySearch[0].id;

      const userSearch = await client.searchRead('res.users', ['|', ['login', '=', input], ['name', 'ilike', input]], ['id', 'name', 'login'], { limit: 1 });
      if (!userSearch || userSearch.length === 0) throw new Error(`El usuario "${input}" no existe.`);

      const loginEmail = userSearch[0].login.toLowerCase();
      const userName = userSearch[0].name;
      const odooUserId = userSearch[0].id;

      let role: 'superadmin' | 'admin' | 'employee' = 'employee';
      if (loginEmail === 'soporte@facturaclic.pe') {
        role = 'superadmin';
      } else if (loginEmail === 'admin1@sanjose.pe' || userName.toLowerCase().includes('jose herrera')) {
        role = 'admin';
      }

      setSession({
        id: uid,
        odoo_user_id: odooUserId,
        name: userName,
        login_email: loginEmail,
        role: role,
        company_id: sjCompanyId
      });

      await loadAppData(uid, sjCompanyId, userName, loginEmail, odooUserId);
      setView('app');
    } catch (e: any) { 
      setErrorLog(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadMonitorStock = useCallback(async (wId: number) => {
    if (!session?.company_id) return;
    setLoading(true);
    try {
      // Ordenamiento por cantidad: 0 a más
      const data = await client.searchRead('product.template', [['purchase_ok', '=', true], ['qty_available', '<=', stockLevelFilter]], ['name', 'default_code', 'qty_available', 'product_variant_id'], { limit: 100, context: getContext(session.company_id, wId), order: 'qty_available asc' });
      const sortedData = (data || []).sort((a: any, b: any) => (a.qty_available || 0) - (b.qty_available || 0));
      setCriticalProducts(sortedData);
      setMonitorWarehouseId(wId);
    } catch (e: any) { 
      setErrorLog(`Error Stock: ${e.message}`); 
    } finally { 
      setLoading(false); 
    }
  }, [client, session, getContext, stockLevelFilter]);

  useEffect(() => { if (activeTab === 'monitor' && monitorWarehouseId) loadMonitorStock(Number(monitorWarehouseId)); }, [activeTab, monitorWarehouseId, stockLevelFilter, loadMonitorStock]);

  const submitToOdoo = async () => {
    if (!cart.length || !selectedWarehouseId || !session?.company_id) {
      setErrorLog("Faltan datos para procesar el envío: Almacén o Productos.");
      return;
    }
    
    setLoading(true);
    setErrorLog(null);
    try {
      const warehouseId = Number(selectedWarehouseId);
      const warehouseName = warehouses.find(w => w.id === warehouseId)?.name || 'Desconocido';
      
      // Proveedor exacto: CADENA DE BOTICAS SAN JOSE S.A.C.
      let partnerId = 1;
      const partnerSearch = await client.searchRead('res.partner', [['name', '=', "CADENA DE BOTICAS SAN JOSE S.A.C."]], ['id'], { limit: 1 });
      if (partnerSearch && partnerSearch.length > 0) {
        partnerId = partnerSearch[0].id;
      } else {
        const fallbackSearch = await client.searchRead('res.partner', [['name', 'ilike', 'SAN JOSE']], ['id'], { limit: 1 });
        if (fallbackSearch && fallbackSearch.length > 0) partnerId = fallbackSearch[0].id;
      }

      const pickingTypes = await client.searchRead('stock.picking.type', [['warehouse_id', '=', warehouseId], ['code', '=', 'incoming']], ['id'], { limit: 1 });
      
      const orderLines = cart.map(item => [0, 0, {
        product_id: Array.isArray(item.product_variant_id) ? item.product_variant_id[0] : (item.product_variant_id || item.id),
        name: item.name,
        product_qty: item.qty,
        product_uom: Array.isArray(item.uom_id) ? item.uom_id[0] : (item.uom_id || 1),
        price_unit: 0.0,
        date_planned: scheduledDate + " 23:59:59"
      }]);

      // Formato solicitado según la imagen
      const formattedNotes = `REQUERIMIENTO APP OPERACIONES\nSolicitado por: ${session.name}\nSede Destino: ${warehouseName}\nNotas: ${customNotes || 'Sin observaciones'}`;

      const orderData = { 
        partner_id: partnerId, 
        company_id: session.company_id, 
        user_id: session.odoo_user_id, 
        picking_type_id: pickingTypes?.[0]?.id || 1, 
        order_line: orderLines, 
        date_order: new Date().toISOString().split('T')[0] + " 12:00:00",
        notes: formattedNotes
      };

      const resId = await client.create('purchase.order', orderData, getContext(session.company_id));
      
      if (resId) {
        setCart([]); 
        setCustomNotes("");
        setOrderComplete(true);
      } else {
        throw new Error("Odoo no devolvió un ID de confirmación.");
      }
    } catch (e: any) { 
      setErrorLog(`Error al generar pedido: ${e.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const getRelatedPos = (wId: number) => {
    const warehouse = warehouses.find(w => w.id === wId);
    if (!warehouse) return [];
    
    const wName = warehouse.name.toLowerCase();
    
    if (wName.includes('b5')) {
       return posConfigs.filter(p => p.name.toLowerCase().includes('botica 0') || p.name.toLowerCase().includes('botica0'));
    }

    const match = wName.match(/b(\d+)/i);
    const sedeNum = match ? match[1] : null;

    return posConfigs.filter(p => {
      const pName = p.name.toLowerCase();
      if (sedeNum) {
        return pName.includes(`botica ${sedeNum}`) || pName.includes(`botica${sedeNum}`) || pName.match(new RegExp(`\\b${sedeNum}\\b`));
      }
      return pName.includes(wName) || wName.includes(pName);
    });
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
      <div className="min-h-screen bg-odoo-gray/30 flex items-center justify-center p-4 text-left">
        <div className="bg-white w-full max-w-4xl h-[560px] rounded-3xl shadow-2xl flex overflow-hidden animate-saas border border-odoo-border">
          <div className="hidden lg:block w-1/2 odoo-gradient relative p-12">
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000" className="absolute inset-0 w-full h-full object-cover opacity-10" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="text-4xl font-black text-white italic">O</div>
              <div className="space-y-4 text-left">
                <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">CENTRO DE<br/>OPERACIONES<br/>BOTICA SAN JOSE</h1>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">CADENA DE BOTICAS SAN JOSE S.A.C.</p>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center gap-10">
            <div className="space-y-2 text-left">
              <h2 className="text-2xl font-black text-odoo-dark uppercase italic">Iniciar Sesión</h2>
              <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">Portal Maestro de Operaciones</p>
            </div>
            <form onSubmit={handleInitialAuth} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-odoo-text uppercase tracking-widest ml-1">Email o Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-text/30" size={18}/>
                  <input type="text" className="w-full pl-12 pr-6 py-4 bg-odoo-gray/50 border-2 border-transparent focus:border-odoo-purple rounded-2xl text-sm font-bold outline-none transition-all" placeholder="ej. usuario.sjs" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Acceder al Centro'}
              </button>
              {errorLog && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600 text-[10px] font-bold uppercase leading-tight animate-pulse"><AlertCircle size={16} className="shrink-0 mt-0.5"/> {errorLog}</div>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-odoo-gray/30 overflow-hidden font-sans text-left">
      <aside className="w-20 lg:w-72 bg-odoo-dark shrink-0 flex flex-col z-50">
        <div className="h-20 flex items-center px-6 lg:px-8 border-b border-white/5">
          <div className="w-10 h-10 odoo-gradient rounded-xl flex items-center justify-center text-white italic font-black text-xl shadow-lg rotate-3 shadow-odoo-purple/20">O</div>
          <div className="ml-4 hidden lg:block overflow-hidden text-left">
            <h2 className="font-black text-white text-[11px] uppercase tracking-tighter italic leading-none">CENTRO SJS</h2>
            <p className="text-odoo-teal text-[8px] font-bold tracking-widest uppercase mt-1">Boticas San José</p>
          </div>
        </div>
        <nav className="flex-1 p-3 lg:p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setOrderComplete(false); }} className={`w-full group flex items-center p-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-odoo-purple text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5'}`}>
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-odoo-teal'} />
              <div className="ml-4 text-left hidden lg:block">
                <p className="font-black text-[11px] uppercase tracking-wider leading-none">{item.label}</p>
                <p className={`text-[8px] mt-1 font-bold uppercase ${activeTab === item.id ? 'text-white/50' : 'text-gray-600'}`}>SJS Operaciones</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => setView('login')} className="w-full flex items-center p-3.5 rounded-2xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">
            <LogOut size={20} /><span className="ml-4 font-black text-[10px] hidden lg:block uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 glass-header flex items-center justify-between px-6 lg:px-10 shrink-0 z-40">
           <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 odoo-gradient rounded-xl flex items-center justify-center text-white font-black text-sm uppercase shadow-lg shadow-odoo-purple/20 italic">{session?.name.slice(0,2)}</div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-odoo-dark uppercase italic">{session?.name}</span>
                  <span className="px-1.5 py-0.5 bg-odoo-purple/10 text-odoo-purple text-[7px] font-black rounded uppercase border border-odoo-purple/10">{session?.role}</span>
                </div>
                <span className="text-[8px] font-bold text-odoo-teal uppercase tracking-widest">{warehouses.find(w => w.id === selectedWarehouseId)?.name || 'POR FAVOR SELECCIONE SEDE'}</span>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-xl border text-[8px] font-black uppercase flex items-center gap-2 ${syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : (syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100')}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : (syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}`}></div> {syncStatus}
              </div>
              <button onClick={() => session && loadAppData(session.id, session.company_id, session.name, session.login_email, session.odoo_user_id)} className="p-2.5 bg-white border border-odoo-border rounded-xl saas-shadow group hover:border-odoo-purple transition-all"><RefreshCw size={18} className={loading ? 'animate-spin text-odoo-purple' : 'text-odoo-text'} /></button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-odoo-gray/20 custom-scrollbar text-left">
          {errorLog && (
            <div className="mb-6 bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl flex items-center gap-4 animate-saas shadow-sm">
              <AlertCircle className="text-rose-500 shrink-0" size={24}/>
              <p className="text-rose-600 text-[11px] font-bold uppercase italic">{errorLog}</p>
            </div>
          )}

          {activeTab === 'purchase' && (
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
              {!orderComplete ? (
                <div className="bg-white rounded-3xl saas-shadow border border-odoo-border overflow-hidden animate-saas">
                  <div className="p-8 bg-odoo-gray/40 border-b border-odoo-border flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-1 text-left">
                      <h2 className="text-xl font-black text-odoo-dark uppercase italic leading-none">Nuevo Requerimiento</h2>
                      <p className="text-[9px] font-bold text-odoo-text/40 uppercase tracking-widest">Pedido Directo a Compras San José</p>
                    </div>
                    <button onClick={() => setShowProductModal(true)} className="odoo-gradient text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"><Plus size={18}/> Añadir Insumo</button>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 text-left">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><Building2 size={10}/> ¿En qué sede se encuentra hoy?</label>
                           <select 
                             className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none shadow-inner transition-all"
                             value={selectedWarehouseId} 
                             onChange={e => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : '')}
                           >
                             <option value="">-- SELECCIONE ALMACÉN / SEDE --</option>
                             {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                           </select>
                        </div>
                        
                        {selectedWarehouseId && (
                           <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-5 animate-saas shadow-sm">
                              <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">
                                 <Store size={14}/> Sede Vinculada (SJS)
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[8px] font-bold text-emerald-800/60 uppercase tracking-tight italic leading-relaxed">Usted está pidiendo insumos para:</p>
                                 <div className="flex flex-wrap gap-2">
                                    {getRelatedPos(Number(selectedWarehouseId)).length > 0 ? (
                                       getRelatedPos(Number(selectedWarehouseId)).map(pos => (
                                          <span key={pos.id} className="bg-white px-4 py-2 rounded-xl border border-emerald-200 text-[11px] font-black text-odoo-dark uppercase italic flex items-center gap-2 shadow-sm">
                                             <Check size={12} className="text-emerald-500"/> {pos.name}
                                          </span>
                                       ))
                                    ) : (
                                       <span className="text-[9px] font-black text-rose-400 italic bg-white p-2 rounded-lg border border-rose-100">Sin mapeo visual.</span>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )}
                      </div>
                      <div className="space-y-4 text-left">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><CalendarDays size={10}/> Fecha de Entrega Solicitada</label>
                           <input type="date" className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none shadow-inner" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-odoo-text uppercase tracking-widest ml-1 flex items-center gap-2"><FileText size={10}/> Notas / Observaciones Adicionales</label>
                           <textarea 
                             className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple p-3.5 rounded-2xl text-[11px] font-bold outline-none shadow-inner resize-none h-24"
                             placeholder="Ej. Entregar antes de las 9am, productos frágiles, etc."
                             value={customNotes}
                             onChange={e => setCustomNotes(e.target.value)}
                           />
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border border-odoo-border overflow-hidden bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-odoo-gray text-[9px] font-black uppercase text-odoo-text/50 border-b">
                          <tr><th className="px-6 py-4">Insumo San José</th><th className="px-6 py-4 text-center">Cantidad</th><th className="px-6 py-4 text-right"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-odoo-border">
                          {cart.map((item, idx) => (
                            <tr key={idx} className="hover:bg-odoo-gray/20 transition-all">
                              <td className="px-6 py-4">
                                <p className="font-bold text-odoo-dark text-[11px] uppercase italic">{item.name}</p>
                                <p className="text-[8px] text-odoo-teal font-black uppercase tracking-widest">{item.default_code || 'S/C'}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="inline-flex items-center gap-3 bg-odoo-gray p-1 rounded-xl border border-odoo-border">
                                  <button onClick={() => setCart(cart.map((c, i) => i === idx ? {...c, qty: Math.max(1, c.qty - 1)} : c))} className="w-6 h-6 rounded bg-white shadow flex items-center justify-center font-black text-odoo-purple">-</button>
                                  <span className="font-black text-[12px] w-6 text-center">{item.qty}</span>
                                  <button onClick={() => setCart(cart.map((c, i) => i === idx ? {...c, qty: c.qty + 1} : c))} className="w-6 h-6 rounded bg-white shadow flex items-center justify-center font-black text-odoo-purple">+</button>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                          {cart.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-odoo-text/20 font-black uppercase text-[10px] italic">No hay productos en la lista</td></tr>}
                        </tbody>
                      </table>
                    </div>

                    <button 
                      disabled={!cart.length || loading || !selectedWarehouseId} 
                      onClick={submitToOdoo} 
                      className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-20 hover:scale-[1.01] active:scale-95 transition-all shadow-odoo-purple/20"
                    >
                      {loading ? <div className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={20}/> ENVIANDO A ODOO...</div> : 'Confirmar y Enviar Pedido a Odoo'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-saas bg-white rounded-3xl border border-odoo-border saas-shadow p-12">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border-4 border-emerald-100 animate-bounce shadow-xl shadow-emerald-500/10"><Check size={40} strokeWidth={3}/></div>
                   <div className="space-y-2">
                      <h2 className="text-3xl font-black text-odoo-dark uppercase italic">¡Pedido Creado con Éxito!</h2>
                      <p className="text-odoo-text/40 font-bold uppercase text-[10px] tracking-widest italic leading-relaxed">El requerimiento se ha generado como borrador en Compras.<br/>Proveedor: {config.companyName}</p>
                   </div>
                   <button onClick={() => setOrderComplete(false)} className="px-12 py-4 bg-odoo-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-odoo-purple transition-all shadow-xl">Nuevo Requerimiento</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 animate-saas text-left">
               <aside className="w-full lg:w-72 space-y-6 shrink-0">
                  <div className="bg-white p-6 rounded-3xl border border-odoo-border saas-shadow space-y-6">
                     <h3 className="text-[10px] font-black text-odoo-dark uppercase tracking-widest italic leading-none">Almacenes SJS</h3>
                     <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {warehouses.map(w => (
                           <button 
                             key={w.id} 
                             onClick={() => loadMonitorStock(w.id)} 
                             className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${monitorWarehouseId === w.id ? 'bg-odoo-purple border-odoo-purple text-white shadow-lg' : 'bg-odoo-gray/50 border-transparent hover:border-odoo-border text-odoo-text'}`}
                           >
                              <span className="text-[11px] font-black uppercase tracking-tight truncate">{w.name}</span>
                              <ChevronRight size={14} className={monitorWarehouseId === w.id ? 'text-white' : 'text-odoo-border'}/>
                           </button>
                        ))}
                     </div>
                  </div>
               </aside>
               <section className="flex-1">
                  <div className="bg-white p-8 rounded-3xl border border-odoo-border saas-shadow space-y-8 overflow-hidden">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1 text-left">
                           <h2 className="text-2xl font-black text-odoo-dark uppercase flex items-center gap-4 italic leading-none">Stock Disponible <Layers className="text-odoo-teal" size={24}/></h2>
                           <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">{warehouses.find(w => w.id === monitorWarehouseId)?.name || 'Seleccione Sede'}</p>
                        </div>
                        <div className="px-4 py-2 bg-odoo-gray rounded-xl border border-odoo-border"><p className="text-[16px] font-black text-rose-500">{criticalProducts.length} <span className="text-[8px] uppercase tracking-widest text-odoo-text/40 ml-1">Alertas</span></p></div>
                     </div>
                     <div className="rounded-2xl border border-odoo-border overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-odoo-gray text-[9px] font-black uppercase text-odoo-text/50 border-b"><tr><th className="px-8 py-5">Insumo Maestro</th><th className="px-8 py-5 text-center">Cantidad</th><th className="px-8 py-5 text-right"></th></tr></thead>
                           <tbody className="divide-y divide-odoo-border">
                             {criticalProducts.map((p) => (
                               <tr key={p.id} className="hover:bg-odoo-gray/10 transition-colors">
                                 <td className="px-8 py-4">
                                   <p className="font-bold text-odoo-dark text-[11px] uppercase italic">{p.name}</p>
                                   <p className="text-[8px] text-odoo-text/40 font-mono mt-0.5">{p.default_code || 'S/C'}</p>
                                 </td>
                                 <td className="px-8 py-4 text-center">
                                   <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 font-black text-sm italic ${p.qty_available <= 5 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-emerald-50 border-emerald-100 text-odoo-teal'}`}>{p.qty_available}</div>
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                   <button onClick={() => {
                                      const exists = cart.find(c => c.id === p.id);
                                      if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                                      else setCart([...cart, { ...p, qty: 1 }]);
                                      setSelectedWarehouseId(monitorWarehouseId);
                                      setActiveTab('purchase');
                                   }} className="px-6 py-2 bg-odoo-purple text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all italic">Pedir</button>
                                 </td>
                               </tr>
                             ))}
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
                   <div className="bg-white p-10 rounded-3xl border border-odoo-border saas-shadow grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1 space-y-6 text-left">
                        <div className="w-16 h-16 odoo-gradient rounded-2xl flex items-center justify-center text-white italic font-black text-2xl shadow-xl rotate-3 shadow-odoo-purple/20">{session?.name.slice(0,2)}</div>
                        <h2 className="text-3xl font-black text-odoo-dark uppercase leading-none italic">{session?.name}</h2>
                        <div className="space-y-4 pt-4 border-t border-odoo-border">
                           <div className="flex items-center gap-3"><Briefcase size={16} className="text-odoo-teal"/><p className="text-[11px] font-bold text-odoo-dark uppercase italic">{session?.employee_data?.job_title || 'Colaborador SJS'}</p></div>
                           <div className="flex items-center gap-3"><MapPin size={16} className="text-odoo-teal"/><p className="text-[11px] font-bold text-odoo-dark uppercase italic">{session?.employee_data?.department_id?.[1] || 'Botica San José'}</p></div>
                        </div>
                      </div>
                      <div className="lg:col-span-2 bg-odoo-purple/5 p-8 rounded-3xl border border-odoo-purple/10 space-y-6 text-left">
                        <div className="flex justify-between items-center text-[10px] font-black text-odoo-purple uppercase tracking-widest"><span>Jornada de Trabajo SJS</span> <Clock size={16}/></div>
                        <div className="grid grid-cols-7 gap-2">
                           {['L','M','X','J','V','S','D'].map((d, i) => <div key={i} className={`h-16 rounded-xl flex items-center justify-center font-black ${i < 6 ? 'bg-white border border-odoo-purple/20 text-odoo-dark shadow-sm' : 'bg-rose-50 text-rose-300'}`}>{d}</div>)}
                        </div>
                        <div className="p-5 bg-white rounded-2xl border border-odoo-border flex items-center gap-4">
                           <div className="p-3 bg-odoo-teal/10 rounded-xl text-odoo-teal"><CalendarIcon size={24}/></div>
                           <div>
                              <p className="text-[9px] font-black text-odoo-text/40 uppercase tracking-widest">Régimen San José</p>
                              <p className="text-[12px] font-black text-odoo-dark uppercase italic">{session?.employee_data?.resource_calendar_id?.[1] || 'SJS Estándar'}</p>
                           </div>
                        </div>
                      </div>
                   </div>
                ) : (
                   <div className="bg-white p-10 rounded-3xl border border-odoo-border saas-shadow space-y-10 text-left">
                      <div className="flex justify-between items-end flex-wrap gap-4">
                        <div className="space-y-1 text-left"><h2 className="text-3xl font-black text-odoo-dark uppercase italic flex items-center gap-4">Personal San José <UsersIcon className="text-odoo-purple" size={32}/></h2></div>
                        <div className="flex gap-4">
                           <select className="bg-odoo-gray border-2 border-odoo-border p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:border-odoo-purple" value={hrFilterBranch} onChange={e => setHrFilterBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                              <option value="all">Ver Todas las Boticas</option>
                              {Array.from(new Set(employees.filter(e => e.department_id).map(e => JSON.stringify(e.department_id)))).map(d => { const dj = JSON.parse(d as string); return <option key={dj[0]} value={dj[0]}>{dj[1]}</option>; })}
                           </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(hrFilterBranch === 'all' ? employees : employees.filter(e => e.department_id && e.department_id[0] === hrFilterBranch)).map(emp => (
                           <div key={emp.id} className="bg-white border border-odoo-border rounded-2xl p-6 hover:border-odoo-purple hover:shadow-lg transition-all group relative overflow-hidden text-left">
                              <div className="w-10 h-10 bg-odoo-gray rounded-xl flex items-center justify-center text-odoo-purple font-black text-[12px] group-hover:bg-odoo-purple group-hover:text-white mb-4 italic shadow-inner uppercase">{emp.name.slice(0,2)}</div>
                              <h4 className="font-black text-odoo-dark text-xs uppercase mb-1 line-clamp-1 italic">{emp.name}</h4>
                              <p className="text-[8px] font-bold text-odoo-teal uppercase italic truncate">{emp.department_id?.[1] || 'SJS Botica'}</p>
                              <div className="mt-4 pt-4 border-t border-odoo-border flex justify-between text-[8px] font-black text-odoo-text/30 uppercase tracking-tighter">
                                 <span>Contacto:</span> <span className="text-odoo-purple font-bold italic">{emp.work_phone || '---'}</span>
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
                     <div className="w-16 h-16 odoo-gradient text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl rotate-3 shadow-odoo-purple/40"><Database size={32}/></div>
                     <h2 className="text-2xl font-black text-odoo-dark uppercase italic tracking-tighter leading-none">Ajustes SJS</h2>
                     <p className="text-[10px] font-bold text-odoo-text/40 uppercase tracking-widest">Instancia v14-v18 Enterprise</p>
                  </div>
                  <div className="space-y-6 pt-6 text-left">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-odoo-text uppercase ml-2 tracking-widest">Ruta del Servidor</label>
                       <input className="w-full bg-odoo-gray border-2 border-transparent px-6 py-4 rounded-2xl text-[12px] font-bold outline-none focus:border-odoo-purple shadow-inner" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={() => { localStorage.setItem('odoo_ops_v18_config', JSON.stringify(config)); alert("Conexión Guardada."); }} className="w-full odoo-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">Guardar Ajustes</button>
               </div>
             </div>
          )}
        </main>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[100] bg-odoo-dark/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-saas flex flex-col max-h-[85vh] border border-white/10 text-left">
             <div className="p-8 border-b border-odoo-border flex items-center justify-between bg-odoo-gray/30">
                <div className="space-y-1 text-left"><h3 className="font-black text-odoo-dark uppercase text-xl italic leading-none">Insumos San José</h3><p className="text-[9px] font-bold text-odoo-teal uppercase tracking-widest">Maestro de Productos</p></div>
                <button onClick={() => setShowProductModal(false)} className="text-odoo-text/30 hover:text-odoo-purple transition-all p-2 rounded-full hover:bg-white"><Plus size={32} className="rotate-45"/></button>
             </div>
             <div className="p-6 bg-white border-b border-odoo-border text-left">
                <div className="relative"><input type="text" autoFocus className="w-full bg-odoo-gray border-2 border-transparent focus:border-odoo-purple pl-12 pr-6 py-4 rounded-2xl text-[13px] font-bold outline-none shadow-inner" placeholder="Escriba el insumo..." value={productSearch} onChange={e => setProductSearch(e.target.value)} /><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-odoo-purple" size={20}/></div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3 custom-scrollbar bg-odoo-gray/5 text-left">
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.default_code && p.default_code.toLowerCase().includes(productSearch.toLowerCase()))).map(p => (
                   <button key={p.id} onClick={() => { 
                      const exists = cart.find(c => c.id === p.id);
                      if (exists) setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c));
                      else setCart([...cart, {...p, qty: 1}]); 
                      setShowProductModal(false); 
                    }} className="w-full flex items-center justify-between p-4 bg-white hover:bg-odoo-purple/[0.03] rounded-2xl border border-odoo-border hover:border-odoo-purple group transition-all text-left">
                     <div className="space-y-1">
                        <p className="font-black text-odoo-dark text-[11px] uppercase italic group-hover:text-odoo-purple transition-colors">{p.name}</p>
                        <div className="flex items-center gap-3 text-[8px] font-black uppercase text-odoo-text/40 tracking-widest">
                           <span className="flex items-center gap-1"><Barcode size={10}/> {p.default_code || '---'}</span>
                           <span className={`px-2 py-0.5 rounded-md border font-bold ${p.qty_available <= 5 ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-odoo-teal border-emerald-100'}`}>Stock: {p.qty_available}</span>
                        </div>
                     </div>
                     <div className="bg-odoo-purple text-white p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg italic font-black text-[10px] uppercase flex items-center gap-1"><Plus size={16}/> Añadir</div>
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
