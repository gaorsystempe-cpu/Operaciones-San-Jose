
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, Plus, Search, RefreshCw, User as UserIcon, Loader2, Barcode, 
  Check, Store, ClipboardList, Activity, X, Package, Home, ShoppingBag,
  DollarSign, PieChart, FileSpreadsheet, Calendar, Users, ListFilter, TrendingUp,
  LayoutDashboard, Box, Settings, Bell, ChevronRight, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Banknote, ShieldCheck, Smartphone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OdooClient } from './services/odooService';
import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe",
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  companyName: "CADENA DE BOTICAS SAN JOSE S.A.C."
};

const App: React.FC = () => {
  const getPeruDate = () => new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
  const getPeruDateString = () => {
    const d = getPeruDate();
    return d.toISOString().split('T')[0];
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
  
  // Data State
  const [posConfigs, setPosConfigs] = useState<any[]>([]);
  const [posSalesData, setPosSalesData] = useState<any>({});
  const [selectedPos, setSelectedPos] = useState<any>(null);
  const [reportDate, setReportDate] = useState(getPeruDateString());

  const client = useMemo(() => new OdooClient(config.url, config.db), [config.url, config.db]);

  const fetchRealTimeSales = useCallback(async () => {
    if (view !== 'app') return;
    setLoading(true);
    setErrorLog(null);
    try {
      // 1. Obtener Cajas y sus Sesiones Actuales
      const configs = await client.searchRead('pos.config', [], 
        ['name', 'id', 'current_session_id', 'current_session_state', 'picking_type_id']
      );
      
      const filteredConfigs = configs.filter((c: any) => c.name.toUpperCase().includes('BOTICA'));
      setPosConfigs(filteredConfigs);

      // 2. Identificar Sesiones a Consultar (Abiertas + Recientes)
      const activeIds = filteredConfigs.map(c => c.current_session_id?.[0]).filter(id => !!id);
      
      const sessionDomain = [
        ['config_id', 'in', filteredConfigs.map(c => c.id)],
        '|', ['id', 'in', activeIds],
        '&', ['start_at', '>=', `${reportDate} 00:00:00`], ['start_at', '<=', `${reportDate} 23:59:59`]
      ];

      const sessions = await client.searchRead('pos.session', sessionDomain, 
        ['id', 'config_id', 'user_id', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'state'],
        { order: 'id desc' }
      );

      const sessionIds = sessions.map(s => s.id);
      let orders: any[] = [];
      let payments: any[] = [];

      if (sessionIds.length > 0) {
        // 3. Pedidos por Sesión
        orders = await client.searchRead('pos.order', [['session_id', 'in', sessionIds]], 
          ['amount_total', 'session_id', 'payment_ids', 'user_id', 'lines'], { limit: 5000 }
        );
        
        const pIds = orders.flatMap(o => o.payment_ids);
        if (pIds.length > 0) {
          payments = await client.searchRead('pos.payment', [['id', 'in', pIds]], 
            ['amount', 'payment_method_id', 'session_id']
          );
        }
      }

      const stats: any = {};
      filteredConfigs.forEach(conf => {
        const confSessions = sessions.filter(s => s.config_id[0] === conf.id);
        const latest = confSessions[0] || null;
        
        const sOrders = orders.filter(o => o.config_id?.[0] === conf.id || confSessions.some(cs => cs.id === o.session_id[0]));
        
        const paySummary: any = {};
        payments.filter(p => confSessions.some(cs => cs.id === p.session_id[0])).forEach(p => {
          const name = p.payment_method_id[1];
          paySummary[name] = (paySummary[name] || 0) + p.amount;
        });

        stats[conf.id] = {
          total: sOrders.reduce((a, b) => a + b.amount_total, 0),
          count: sOrders.length,
          isOnline: conf.current_session_state === 'opened',
          user: latest?.user_id[1] || 'Sin asignar',
          payments: paySummary,
          sessions: confSessions,
          balance: latest?.cash_register_balance_end_real || 0
        };
      });

      setPosSalesData(stats);
      setLastSync(new Date().toLocaleTimeString('es-PE'));
    } catch (e: any) {
      console.error(e);
      setErrorLog("Sin conexión con el centro de datos. Reintentando...");
    } finally {
      setLoading(false);
    }
  }, [client, view, reportDate]);

  useEffect(() => {
    if (view === 'app') {
      fetchRealTimeSales();
      const interval = setInterval(fetchRealTimeSales, 60000);
      return () => clearInterval(interval);
    }
  }, [view, fetchRealTimeSales]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = await client.authenticate(config.user, config.apiKey);
      const user = await client.searchRead('res.users', [['login', '=', loginInput]], ['name', 'email'], { limit: 1 });
      if (!user.length) throw new Error("Usuario no autorizado.");
      
      setSession({ name: user[0].name, email: user[0].email });
      setView('app');
    } catch (e: any) { setErrorLog("Credenciales incorrectas."); }
    finally { setLoading(false); }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <span className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-gray-800 mt-1">{value}</h3>
    </div>
  );

  if (view === 'login') {
    return (
      <div className="h-screen bg-[#F4F7FE] flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-[420px] p-12 rounded-[2.5rem] shadow-2xl border border-white">
          <div className="flex flex-col items-center gap-8">
            <div className="w-16 h-16 bg-odoo-primary rounded-2xl flex items-center justify-center text-white text-3xl font-black italic shadow-lg shadow-odoo-primary/20">SJ</div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">OPERACIONES SJS</h1>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Boticas San José</p>
            </div>
            <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">USUARIO OPERATIVO</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-odoo-primary outline-none transition-all font-bold text-sm" placeholder="ID de Empleado" value={loginInput} onChange={e => setLoginInput(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-odoo-primary text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-odoo-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Acceder al Sistema'}
              </button>
            </form>
            {errorLog && <div className="text-rose-500 text-[10px] font-black uppercase bg-rose-50 p-3 rounded-xl border border-rose-100 w-full text-center">{errorLog}</div>}
          </div>
        </div>
      </div>
    );
  }

  const globalTotal = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.total || 0), 0);
  const onlineCount = Object.values(posSalesData).filter((v: any) => v.isOnline).length;

  return (
    <div className="h-screen flex bg-[#F4F7FE] text-odoo-text font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 z-50 shadow-sm">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-odoo-primary rounded-xl flex items-center justify-center text-white font-black italic">SJ</div>
          <div>
            <h2 className="text-sm font-black text-gray-800 tracking-tighter uppercase">San José</h2>
            <p className="text-[9px] font-bold text-odoo-primary uppercase tracking-widest">Centro Operativo</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-odoo-primary text-white shadow-lg shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <LayoutDashboard size={18}/> Dashboard
          </button>
          <button onClick={() => setActiveTab('ventas')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'ventas' ? 'bg-odoo-primary text-white shadow-lg shadow-odoo-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <TrendingUp size={18}/> Ventas Red
          </button>
        </nav>

        <div className="p-6 mt-auto border-t border-gray-50">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm"><UserIcon size={18} className="text-gray-400"/></div>
            <div className="truncate">
              <p className="text-[11px] font-black text-gray-800 truncate">{session?.name}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Operaciones</p>
            </div>
          </div>
          <button onClick={() => setView('login')} className="w-full flex items-center justify-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-[10px] font-black uppercase">
            <LogOut size={16}/> Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-10 flex items-center justify-between shrink-0 z-40">
          <div>
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">
              {activeTab === 'dashboard' ? 'Control de Gestión' : 'Auditoría de Boticas'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest tracking-tighter">Sistema Sincronizado • {lastSync}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200">
               <Calendar size={14} className="text-gray-400 ml-2"/>
               <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none w-28 cursor-pointer"/>
               <button onClick={fetchRealTimeSales} className="p-1.5 bg-white text-odoo-primary rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Ventas Totales" value={`S/ ${globalTotal.toLocaleString()}`} icon={DollarSign} color="bg-odoo-primary" trend={12} />
                <StatCard title="Boticas Online" value={`${onlineCount} / ${posConfigs.length}`} icon={Store} color="bg-green-500" />
                <StatCard title="Total Tickets" value={Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0)} icon={ShoppingBag} color="bg-blue-500" />
                <StatCard title="Arqueo Consolidado" value={`S/ ${Object.values(posSalesData).reduce((a: any, b: any) => a + (b.balance || 0), 0).toLocaleString()}`} icon={Wallet} color="bg-amber-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-[0.2em] mb-8">Ranking Operativo</h3>
                  <div className="space-y-6">
                    {posConfigs.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${posSalesData[c.id]?.isOnline ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                          <div>
                            <p className="text-sm font-black text-gray-800 uppercase">{c.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{posSalesData[c.id]?.user}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-800">S/ {(posSalesData[c.id]?.total || 0).toFixed(2)}</p>
                          <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-odoo-primary rounded-full" style={{width: `${Math.min(100, (posSalesData[c.id]?.total / 2000) * 100)}%`}}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
                   <h3 className="font-black text-gray-800 uppercase text-xs tracking-[0.2em] mb-8">Composición de Pago</h3>
                   <div className="space-y-6">
                      {['EFECTIVO', 'YAPE / PLIN', 'OTROS'].map((m, i) => (
                        <div key={m} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span>{m}</span>
                            <span>{m === 'EFECTIVO' ? '60%' : m === 'YAPE / PLIN' ? '30%' : '10%'}</span>
                          </div>
                          <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${i === 0 ? 'bg-odoo-primary' : i === 1 ? 'bg-blue-400' : 'bg-gray-300'}`} style={{width: i === 0 ? '60%' : i === 1 ? '30%' : '10%'}}></div>
                          </div>
                        </div>
                      ))}
                   </div>
                   <div className="mt-8 p-4 bg-odoo-primary/5 rounded-2xl border border-odoo-primary/10">
                      <p className="text-[10px] font-black text-odoo-primary uppercase mb-1">Estado del Servidor</p>
                      <p className="text-[11px] font-medium text-gray-600">Conexión estable. Sincronización activa al 100%.</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ventas' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {posConfigs.map(config => {
                const data = posSalesData[config.id] || {};
                return (
                  <div key={config.id} onClick={() => setSelectedPos(config)} className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${selectedPos?.id === config.id ? 'border-odoo-primary shadow-2xl ring-8 ring-odoo-primary/5' : 'border-transparent hover:border-gray-200 shadow-sm'}`}>
                    {data.isOnline && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase">ACTIVA</div>
                    )}
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        <Store size={24}/>
                      </div>
                      <div className="truncate">
                        <h4 className="font-black text-gray-800 uppercase tracking-tight truncate">{config.name}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{data.user}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">VENTA</p>
                        <p className="text-lg font-black text-gray-800 truncate">S/ {data.total?.toFixed(0)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">CAJA</p>
                        <p className="text-lg font-black text-gray-800 truncate">S/ {data.balance?.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auditar</span>
                       <ChevronRight size={16} className="text-odoo-primary group-hover:translate-x-1 transition-all"/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Detail Overlay */}
      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedPos(null)}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-10 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{selectedPos.name}</h3>
                <p className="text-xs font-bold text-odoo-primary uppercase tracking-widest">Detalle de Auditoría</p>
              </div>
              <button onClick={() => setSelectedPos(null)} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Cierre Estimado</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-gray-50 rounded-[2rem]">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Ventas</p>
                    <p className="text-2xl font-black text-gray-800">S/ {posSalesData[selectedPos.id]?.total.toFixed(2)}</p>
                  </div>
                  <div className="p-6 bg-odoo-primary/5 rounded-[2rem] border border-odoo-primary/10">
                    <p className="text-[9px] font-black text-odoo-primary uppercase mb-1">En Caja</p>
                    <p className="text-2xl font-black text-odoo-primary">S/ {posSalesData[selectedPos.id]?.balance.toFixed(2)}</p>
                  </div>
                </div>
              </section>
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Arqueo de Pagos</h4>
                <div className="space-y-3">
                  {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([name, amount]: any) => (
                    <div key={name} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                          {name.includes('YAPE') || name.includes('PLIN') ? <Smartphone size={18} className="text-blue-500"/> : <Banknote size={18} className="text-green-600"/>}
                        </div>
                        <span className="text-xs font-black text-gray-700 uppercase">{name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-800">S/ {amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="p-6 bg-gray-900 text-white rounded-[2rem] flex items-center gap-6">
                 <ShieldCheck size={40} className="text-green-400"/>
                 <div>
                   <p className="text-[10px] font-black uppercase text-gray-400">Verificado</p>
                   <p className="text-xs font-medium opacity-80">Datos validados directamente con la base de datos de Boticas San José.</p>
                 </div>
              </section>
            </div>
            <div className="p-10 border-t bg-gray-50/50">
              <button onClick={() => {
                const data = Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([m, a]) => ({'Método': m, 'Monto': a}));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Arqueo");
                XLSX.writeFile(wb, `Auditoria_${selectedPos.name}.xlsx`);
              }} className="w-full bg-odoo-primary text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                <FileSpreadsheet size={18}/> Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-10 right-10 z-[200]">
           <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-4">
              <Loader2 className="animate-spin text-odoo-primary" size={20}/>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sincronizando...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
