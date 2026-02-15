
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, ChevronRight, X, User as UserIcon, Calendar, Info, CreditCard, Wallet } from 'lucide-react';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in">
      <div className="bg-white border border-gray-200 rounded shadow-sm p-4 flex justify-between items-center">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <TrendingUp size={18} className="text-odoo-primary"/> Auditoría de Boticas (Real-Time)
        </h3>
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 transition-colors border">
          <FileSpreadsheet size={14} /> Exportar Reporte Global
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posConfigs.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect(c)} 
            className="bg-white border border-gray-200 rounded shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded flex items-center justify-center transition-all ${posSalesData[c.id]?.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 group-hover:text-odoo-primary'}`}>
                  <Store size={24}/>
                </div>
                {posSalesData[c.id]?.isOnline && (
                  <div className="flex flex-col items-end">
                    <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-sm uppercase mb-1">Abierta</span>
                    <span className="text-[8px] font-bold text-green-600 animate-pulse">SINCRONIZADO</span>
                  </div>
                )}
              </div>
              <h4 className="font-bold text-gray-800 uppercase text-sm mb-1 truncate">{c.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold mb-6">BOTICAS SAN JOSÉ S.A.C.</p>
              
              <div className="bg-gray-50/80 p-4 rounded border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase">Venta Acumulada</p>
                  <p className="text-xl font-black text-odoo-primary">S/ {Number(posSalesData[c.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-odoo-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                   <h3 className="text-lg font-bold text-gray-800 uppercase">{selectedPos.name}</h3>
                   <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-widest mt-1">Arqueo Detallado por Métodos</p>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-gray-200 rounded transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2">Desglose de Ingresos</h4>
                   <div className="grid grid-cols-2 gap-4">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="p-4 bg-white border rounded shadow-sm">
                           <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{method}</p>
                           <p className="text-sm font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                           <div className="mt-2 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-odoo-primary h-full" 
                                style={{ width: `${Math.min(100, (amount / (posSalesData[selectedPos.id]?.totalSales || 1)) * 100)}%` }}
                              ></div>
                           </div>
                        </div>
                      ))}
                      {Object.keys(posSalesData[selectedPos.id]?.payments || {}).length === 0 && (
                        <div className="col-span-2 py-8 text-center bg-gray-50 border border-dashed rounded text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           Sin ventas registradas hoy
                        </div>
                      )}
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2">Historial de Sesiones</h4>
                   <div className="space-y-2">
                      {posSalesData[selectedPos.id]?.sessions.map((s: any) => (
                        <div key={s.id} className="p-4 bg-gray-50 rounded border flex justify-between items-center">
                           <div>
                              <p className="text-[11px] font-bold text-gray-800 uppercase">Sesión #{s.id}</p>
                              <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold mt-1">
                                 <UserIcon size={10}/> {s.user_id[1]}
                                 <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                 <Calendar size={10}/> {new Date(s.start_at).toLocaleDateString()}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-odoo-primary">S/ {Number(s.total_payments_amount || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase ${s.state === 'opened' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {s.state === 'opened' ? 'Activa' : 'Cerrada'}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <div className="bg-odoo-primary/5 p-6 rounded border border-odoo-primary/10 space-y-3">
                   <div className="flex items-center gap-3 text-odoo-primary mb-2">
                      <Info size={20}/>
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Auditoría Operativa</h4>
                   </div>
                   <p className="text-[11px] text-gray-600 leading-relaxed italic font-medium">
                     "Los montos mostrados reflejan la facturación real-time de Odoo. Los saldos en efectivo incluyen el fondo de caja inicial si se configuró en la apertura."
                   </p>
                </div>
             </div>

             <div className="p-6 border-t bg-gray-50">
                <button className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2">
                  <FileSpreadsheet size={18}/> Descargar Informe de Caja
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
