
import React from 'react';
import { FileSpreadsheet, Store, X, Package, ListChecks, Download, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  const exportGlobalBIReport = () => {
    const workbook = XLSX.utils.book_new();
    const globalSummary = posConfigs.map(c => {
      const d = posSalesData[c.id];
      return {
        'Botica': c.name || 'S/N',
        'Estado': d?.rawState || 'S/A',
        'Venta Bruta (S/)': d?.totalSales || 0,
        'Tickets': d?.count || 0,
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Reporte_Auditoria");
    XLSX.writeFile(workbook, `Ventas_SJ_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const currentData = selectedPos ? posSalesData[selectedPos.id] : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20 animate-fade">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-odoo-border rounded shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-700 uppercase">Ventas por Punto</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-widest">Monitoreo de Ingresos Brutos</p>
        </div>
        <button onClick={exportGlobalBIReport} className="o-btn o-btn-primary gap-2"><Download size={16} /> Exportar Excel</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posConfigs.map(c => {
          const data = posSalesData[c.id];
          return (
            <div key={c.id} onClick={() => onSelect(c)} className={`bg-white border ${selectedPos?.id === c.id ? 'border-odoo-primary ring-2 ring-odoo-primary/10' : 'border-odoo-border'} rounded shadow-sm hover:shadow-lg transition-all cursor-pointer group`}>
              <div className="p-5 flex items-center justify-between border-b border-gray-50">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${data?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                   <h4 className="font-bold text-gray-700 uppercase text-xs tracking-tight">{c.name}</h4>
                 </div>
                 <ChevronRight size={14} className="text-gray-300 group-hover:text-odoo-primary" />
              </div>
              <div className="p-5 flex justify-between items-center bg-gray-50/10">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Venta Acumulada</p>
                    <p className="text-xl font-bold text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Tickets</p>
                    <p className="text-sm font-bold text-gray-500">{data?.count || 0}</p>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
             <div className="px-6 py-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-odoo-primary text-white rounded-lg"><Store size={20}/></div>
                   <h3 className="text-lg font-bold text-gray-700 uppercase leading-none">{selectedPos.name}</h3>
                </div>
                <button onClick={onCloseDetail} className="p-2 text-gray-400"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-6 bg-odoo-primary/5 rounded-lg border border-odoo-primary/10">
                   <p className="text-xs font-bold text-odoo-primary uppercase mb-1">Total de Venta Bruta</p>
                   <p className="text-3xl font-black text-gray-800">S/ {(currentData?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white border border-odoo-border rounded overflow-hidden">
                   <div className="px-5 py-3 border-b bg-gray-50/50"><h4 className="text-xs font-bold text-gray-600 uppercase">Detalle Operativo</h4></div>
                   <div className="p-5 space-y-4">
                      <div className="flex justify-between border-b pb-3">
                         <span className="text-xs text-gray-500 font-bold uppercase">Estado de Sesión</span>
                         <span className="text-xs font-black text-odoo-primary uppercase">{currentData?.rawState || 'CERRADO'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-3">
                         <span className="text-xs text-gray-500 font-bold uppercase">Cantidad de Pedidos</span>
                         <span className="text-xs font-black text-gray-800 uppercase">{currentData?.count || 0}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
