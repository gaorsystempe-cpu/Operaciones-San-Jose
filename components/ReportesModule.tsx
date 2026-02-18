
import React, { useEffect, useState } from 'react';
import { reportService } from '../services/supabaseService';
import { 
  Calendar, Store, CheckCircle2, Clock, Wallet, ShoppingBag, 
  Loader2, RefreshCw, Send, Info, Copy, Check, Terminal, Zap,
  Smartphone, CreditCard, Banknote, Settings2, BellRing
} from 'lucide-react';

export const ReportesModule: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduledHour, setScheduledHour] = useState('23');
  const [savingConfig, setSavingConfig] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsData, configHour] = await Promise.all([
        reportService.getDailyClosings(),
        reportService.getReportConfig()
      ]);
      setReports(reportsData || []);
      setScheduledHour(configHour);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdateHour = async (newHour: string) => {
    setSavingConfig(true);
    try {
      await reportService.updateReportConfig(newHour);
      setScheduledHour(newHour);
      setShowConfig(false);
    } catch (e) {
      alert("Error al guardar configuración");
    } finally {
      setSavingConfig(false);
    }
  };

  const copyTestJson = () => {
    const testJson = {
      pos_id: 101,
      pos_nombre: "BOTICA SJ - TEST",
      total_monto: 1250.50,
      conteo_tickets: 45,
      fecha: new Date().toISOString().split('T')[0],
      pagos: {
        "Efectivo": 450.00,
        "Yape": 600.50,
        "Visa": 200.00
      }
    };
    navigator.clipboard.writeText(JSON.stringify(testJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPaymentIcon = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('yape') || m.includes('plin')) return <Smartphone size={12} className="text-purple-500" />;
    if (m.includes('efectivo')) return <Banknote size={12} className="text-emerald-500" />;
    return <CreditCard size={12} className="text-blue-500" />;
  };

  const formatHour = (h: string) => {
    const hour = parseInt(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-24">
      {/* Header con Stats Rápidas */}
      <div className="bg-white p-10 border border-slate-200 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-odoo-primary/10 rounded-3xl text-odoo-primary shadow-inner">
            <Send size={32}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Reportes Automáticos SJ</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Programado: {formatHour(scheduledHour)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${showConfig ? 'bg-odoo-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Settings2 size={18}/> {showConfig ? 'Cerrar Ajustes' : 'Cambiar Horario'}
          </button>
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${showGuide ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Terminal size={18}/> Consola n8n
          </button>
          <button onClick={loadData} className="o-btn o-btn-primary gap-3 py-4 px-8 shadow-xl shadow-odoo-primary/20">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/> Sincronizar
          </button>
        </div>
      </div>

      {/* Selector de Horario Dynamico */}
      {showConfig && (
        <div className="bg-white border-4 border-odoo-primary/20 rounded-[40px] p-10 animate-fade shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <BellRing size={120} className="text-odoo-primary" />
          </div>
          <div className="relative z-10 max-w-xl">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3">
               <Clock size={20} className="text-odoo-primary"/> Programación de Sincronización
             </h3>
             <p className="text-xs text-slate-400 font-bold uppercase mb-8 leading-relaxed">
               Define a qué hora n8n debe extraer los cierres de Odoo y enviarlos a WhatsApp. El sistema guardará este valor en la nube.
             </p>
             <div className="flex flex-wrap gap-3">
                {Array.from({ length: 24 }).map((_, h) => (
                  <button 
                    key={h}
                    disabled={savingConfig}
                    onClick={() => handleUpdateHour(h.toString())}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${scheduledHour === h.toString() ? 'bg-odoo-primary text-white border-odoo-primary shadow-lg scale-110' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-odoo-primary/30 hover:bg-white'}`}
                  >
                    {h % 12 || 12} {h >= 12 ? 'PM' : 'AM'}
                  </button>
                ))}
             </div>
             {savingConfig && (
               <div className="mt-6 flex items-center gap-3 text-odoo-primary animate-pulse">
                 <Loader2 size={16} className="animate-spin" />
                 <span className="text-[10px] font-black uppercase">Actualizando n8n...</span>
               </div>
             )}
          </div>
        </div>
      )}

      {showGuide && (
        <div className="bg-slate-900 rounded-[32px] p-8 animate-fade border border-slate-700 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap size={200} className="text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
              <Terminal size={20} className="text-emerald-400"/> Generador de Cargas de Prueba
            </h3>
            <p className="text-slate-400 text-xs font-medium mb-8 max-w-2xl">
              Copia este JSON para probar el Webhook de n8n.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 relative group">
                <button 
                  onClick={copyTestJson}
                  className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-emerald-500 text-white rounded-lg transition-all"
                >
                  {copied ? <Check size={16}/> : <Copy size={16}/>}
                </button>
                <code className="text-[10px] text-emerald-400 font-mono leading-relaxed block whitespace-pre">
                  {`{
  "pos_id": 101,
  "pos_nombre": "BOTICA SJ - TEST",
  "total_monto": 1250.50,
  "conteo_tickets": 45,
  "fecha": "${new Date().toISOString().split('T')[0]}",
  "pagos": {
    "Efectivo": 450.00,
    "Yape": 600.50,
    "Visa": 200.00
  }
}`}
                </code>
              </div>
              <div className="space-y-4">
                 <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">Paso 1: Cron en n8n</p>
                    <p className="text-[11px] text-slate-300">Configura el Cron para ejecutarse cada 1 hora (0 * * * *).</p>
                 </div>
                 <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-sky-400 uppercase mb-2">Paso 2: Validar Hora</p>
                    <p className="text-[11px] text-slate-300">Lee la tabla 'app_settings'. Si 'value' == Hora Actual, sigue.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-odoo-primary mb-4" size={48}/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white border border-dashed border-slate-200 rounded-[40px] opacity-60">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
               <Send size={40}/>
             </div>
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin reportes aún</p>
          </div>
        ) : reports.map((rpt) => (
          <div key={rpt.id} className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            {/* Header del Reporte */}
            <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center group-hover:bg-odoo-primary/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                  <Calendar size={14} className="text-odoo-primary"/>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase">{new Date(rpt.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${rpt.enviado_whatsapp ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {rpt.enviado_whatsapp ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                {rpt.enviado_whatsapp ? 'Enviado WS' : 'En Cola WS'}
              </div>
            </div>

            {/* Cuerpo del Reporte */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-odoo-primary to-purple-800 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-odoo-primary/20">
                  {rpt.pos_nombre.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase leading-none mb-1.5">{rpt.pos_nombre}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Store size={10}/> ID Sede: {rpt.pos_id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Recaudación</p>
                    <p className="text-lg font-black text-slate-800 tracking-tighter">S/ {rpt.total_monto.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Operaciones</p>
                    <p className="text-lg font-black text-slate-800 tracking-tighter">{rpt.conteo_tickets} <span className="text-[10px] opacity-40">DOCS</span></p>
                 </div>
              </div>

              {rpt.pagos && (
                <div className="pt-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                     <Wallet size={14} className="text-odoo-primary"/> Mix de Pagos
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {Object.entries(rpt.pagos).map(([method, amount]: any, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 pl-2.5 pr-4 py-2 rounded-2xl text-[10px] font-bold text-slate-600 flex items-center gap-2 shadow-sm hover:border-odoo-primary/20 transition-all">
                          <div className="w-5 h-5 bg-slate-50 rounded-lg flex items-center justify-center">
                            {getPaymentIcon(method)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-300 uppercase leading-none mb-0.5">{method}</span>
                            <span>S/ {amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t bg-slate-50/50 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase italic tracking-widest">
               <span>Sync Log: {rpt.id.slice(0,18)}...</span>
               <div className="flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                 <span className="text-emerald-600/60">OK</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
