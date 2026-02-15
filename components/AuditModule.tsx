
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, ChevronRight, X, User as UserIcon, Calendar, Info } from 'lucide-react';

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
          <TrendingUp size={18} className="text-odoo-primary"/> Auditoría de Boticas
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
                <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center text-gray-400 group-hover:text-odoo-primary group-hover:bg-odoo-primary/5 transition-all">
                  <Store size={24}/>
                </div>
                {posSalesData[c.id]?.isOnline && (
                  <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-sm uppercase">En Línea</span>
                )}
              </div>
              <h4 className="font-bold text-gray-800 uppercase text-sm mb-1 truncate">{c.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold mb-6">BOTICAS SAN JOSÉ S.A.C.</p>
              
              <div className="bg-gray-50/80 p-4 rounded border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase">Balance en Caja</p>
                  <p className="text-xl font-black text-odoo-primary">S/ {Number(posSalesData[c.id]?.balance || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-odoo-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer Lateral de Detalle */}
      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                   <h3 className="text-lg font-bold text-gray-800 uppercase">{selectedPos.name}</h3>
                   <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-widest mt-1">Hoja de Arqueo Detallada</p>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-gray-200 rounded transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2">Sesiones Registradas</h4>
                   <div className="space-y-2">
                      {posSalesData[selectedPos.id]?.sessions.map((s: any) => (
                        <div key={s.id} className="p-4 bg-gray-50 rounded border flex justify-between items-center group hover:border-odoo-primary/30 transition-all">
                           <div>
                              <p className="text-[11px] font-bold text-gray-800 uppercase">Sesión ID: {s.id}</p>
                              <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold mt-1">
                                 <UserIcon size={10}/> {s.user_id[1]}
                                 <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                 <Calendar size={10}/> {new Date(s.start_at).toLocaleDateString()}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-gray-800">S/ {Number(s.cash_register_balance_end_real || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase ${s.state === 'opened' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-600'}`}>
                                {s.state === 'opened' ? 'Abierta' : 'Cerrada'}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <div className="bg-odoo-primary/5 p-6 rounded border border-odoo-primary/10 space-y-3">
                   <div className="flex items-center gap-3 text-odoo-primary mb-2">
                      <Info size={20}/>
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Información de Seguridad</h4>
                   </div>
                   <p className="text-[11px] text-gray-600 leading-relaxed italic font-medium">
                     "Este resumen ha sido verificado con los saldos de cierre de Odoo. Cualquier discrepancia con el efectivo físico debe ser reportada a supervisión."
                   </p>
                </div>
             </div>

             <div className="p-6 border-t bg-gray-50">
                <button className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2">
                  <FileSpreadsheet size={18}/> Descargar PDF Auditoría
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
