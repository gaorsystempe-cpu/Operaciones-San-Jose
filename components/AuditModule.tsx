
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, ChevronRight, X, User as UserIcon, Calendar, Info, Package, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  
  const exportToExcel = (posId: number) => {
    const data = posSalesData[posId];
    if (!data) return;

    // Hoja 1: Resumen de Sesiones
    const sessionSheet = XLSX.utils.json_to_sheet(data.sessions.map((s: any) => ({
      'Sesión ID': s.id,
      'Cajero': s.user_id[1],
      'Fecha Apertura': s.start_at,
      'Estado': s.state === 'opened' ? 'ABIERTA' : 'CERRADA',
      'Total Pagos': s.total_payments_amount
    })));

    // Hoja 2: Métodos de Pago
    const paymentSheet = XLSX.utils.json_to_sheet(Object.entries(data.payments).map(([method, amount]) => ({
      'Método de Pago': method,
      'Monto Total': amount
    })));

    // Hoja 3: Productos Vendidos
    const productSheet = XLSX.utils.json_to_sheet(data.products.map((p: any) => ({
      'Producto': p.name,
      'Cantidad': p.qty,
      'Total (Inc. IGV)': p.total
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sessionSheet, "Sesiones");
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Métodos de Pago");
    XLSX.utils.book_append_sheet(workbook, productSheet, "Productos Vendidos");

    XLSX.writeFile(workbook, `Reporte_Auditoria_${posConfigs.find(c => c.id === posId)?.name.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div className="bg-white border border-gray-200 rounded shadow-sm p-4 flex justify-between items-center">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
          <TrendingUp size={18} className="text-odoo-primary"/> Panel de Auditoría Operativa
        </h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Datos filtrados por fecha seleccionada</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posConfigs.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect(c)} 
            className="bg-white border border-gray-200 rounded shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded flex items-center justify-center transition-all ${posSalesData[c.id]?.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 group-hover:text-odoo-primary'}`}>
                  <Store size={24}/>
                </div>
                {posSalesData[c.id]?.isOnline && (
                  <div className="flex flex-col items-end">
                    <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-sm uppercase mb-1">Activa</span>
                    <span className="text-[8px] font-bold text-green-600 animate-pulse">EN VIVO</span>
                  </div>
                )}
              </div>
              <h4 className="font-bold text-gray-800 uppercase text-sm mb-1 truncate">{c.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold mb-6">BOTICAS SAN JOSÉ S.A.C.</p>
              
              <div className="bg-gray-50/80 p-4 rounded border border-gray-100 flex justify-between items-center group-hover:bg-odoo-primary/5 transition-colors">
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
             <div className="p-6 border-b flex justify-between items-center bg-gray-50 shadow-sm">
                <div>
                   <h3 className="text-lg font-bold text-gray-800 uppercase">{selectedPos.name}</h3>
                   <p className="text-[10px] font-bold text-odoo-primary uppercase tracking-widest mt-1">Sincronización de Sesiones del Día</p>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Métodos de Pago */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2 flex items-center gap-2">
                     <ListChecks size={14} className="text-odoo-primary"/> Resumen por Métodos
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="p-4 bg-white border rounded-sm shadow-sm hover:border-odoo-primary/30 transition-all">
                           <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{method}</p>
                           <p className="text-sm font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                           <div className="mt-2 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-odoo-primary h-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (amount / (posSalesData[selectedPos.id]?.totalSales || 1)) * 100)}%` }}
                              ></div>
                           </div>
                        </div>
                      ))}
                      {Object.keys(posSalesData[selectedPos.id]?.payments || {}).length === 0 && (
                        <div className="col-span-2 py-8 text-center bg-gray-50 border border-dashed rounded text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           Sin ventas registradas en la fecha
                        </div>
                      )}
                   </div>
                </section>

                {/* Sesiones del Día */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2 flex items-center gap-2">
                     <UserIcon size={14} className="text-odoo-primary"/> Sesiones de la Jornada
                   </h4>
                   <div className="space-y-2">
                      {posSalesData[selectedPos.id]?.sessions.map((s: any) => (
                        <div key={s.id} className="p-4 bg-gray-50/50 rounded border border-gray-100 flex justify-between items-center hover:bg-white transition-all shadow-sm">
                           <div>
                              <p className="text-[11px] font-bold text-gray-800 uppercase">Sesión #{s.id}</p>
                              <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold mt-1">
                                 <UserIcon size={10}/> {s.user_id[1]}
                                 <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                 <Calendar size={10}/> {new Date(s.start_at).toLocaleTimeString('es-PE')}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-odoo-primary">S/ {Number(s.total_payments_amount || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase ${s.state === 'opened' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {s.state === 'opened' ? 'Abierta' : 'Cerrada'}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                {/* Productos Vendidos */}
                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Package size={14} className="text-odoo-primary"/> Productos Vendidos
                      </h4>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Top Ventas</span>
                   </div>
                   <div className="bg-white border rounded shadow-sm divide-y divide-gray-50">
                      {(posSalesData[selectedPos.id]?.products || []).slice(0, 15).map((p: any, idx: number) => (
                        <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                           <div className="max-w-[70%]">
                              <p className="text-[10px] font-bold text-gray-700 uppercase truncate">{p.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold">CANT: {p.qty} UND</p>
                           </div>
                           <p className="text-[11px] font-black text-odoo-primary">S/ {p.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                        </div>
                      ))}
                      {(posSalesData[selectedPos.id]?.products || []).length === 0 && (
                        <div className="p-8 text-center text-[10px] font-bold text-gray-300 uppercase italic">
                           No hay productos registrados hoy
                        </div>
                      )}
                   </div>
                </section>

                <div className="bg-odoo-primary/5 p-6 rounded border border-odoo-primary/10 space-y-3">
                   <div className="flex items-center gap-3 text-odoo-primary mb-1">
                      <Info size={18}/>
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Información de Auditoría</h4>
                   </div>
                   <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                     "Los datos presentados son extraídos directamente de la base de datos Odoo. Si una sesión aparece como 'Cerrada' significa que el cajero ya realizó el arqueo final en el terminal POS."
                   </p>
                </div>
             </div>

             <div className="p-6 border-t bg-gray-50 shadow-inner">
                <button 
                  onClick={() => exportToExcel(selectedPos.id)}
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <FileSpreadsheet size={18} className="group-hover:scale-110 transition-transform"/> Descargar Detalle (Excel)
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
