
import React, { useMemo } from 'react';
import { 
  FileSpreadsheet, Store, X, Package, ListChecks, Download, 
  ChevronRight, TrendingUp, Users, CreditCard, BarChart3, 
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line 
} from 'recharts';
import * as XLSX from 'xlsx';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

const COLORS = ['#714B67', '#017e84', '#E4A11B', '#DC3545', '#4c4c4c', '#6c757d'];

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  
  // Procesamiento de datos para BI
  const reportData = useMemo(() => {
    const data = posConfigs.map(c => {
      const stats = posSalesData[c.id] || { totalSales: 0, count: 0 };
      return {
        id: c.id,
        name: c.name,
        total: stats.totalSales || 0,
        tickets: stats.count || 0,
        avgTicket: stats.count > 0 ? (stats.totalSales / stats.count) : 0,
        state: stats.rawState || 'CERRADO'
      };
    }).sort((a, b) => b.total - a.total);

    const totalGlobal = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalTicketsGlobal = data.reduce((acc, curr) => acc + curr.tickets, 0);

    return {
      items: data,
      totalGlobal,
      totalTicketsGlobal,
      avgTicketGlobal: totalTicketsGlobal > 0 ? totalGlobal / totalTicketsGlobal : 0
    };
  }, [posConfigs, posSalesData]);

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sheetData = reportData.items.map(item => ({
      'Punto de Venta': item.name,
      'Estado': item.state,
      'Venta Total (S/)': item.total,
      'Cantidad Tickets': item.tickets,
      'Ticket Promedio (S/)': item.avgTicket.toFixed(2),
      '% Participación': reportData.totalGlobal > 0 ? ((item.total / reportData.totalGlobal) * 100).toFixed(2) + '%' : '0%'
    }));
    
    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, ws, "Reporte_BI_Ventas");
    XLSX.writeFile(workbook, `Reporte_SJS_BI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const currentDetailData = selectedPos ? reportData.items.find(i => i.id === selectedPos.id) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-24 animate-fade">
      {/* Header Informativo */}
      <div className="bg-white p-6 border border-odoo-border rounded shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Centro de Inteligencia de Ventas</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={14} className="text-odoo-primary"/> Análisis de Rendimiento por Periodo Seleccionado
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={exportExcel} className="flex-1 o-btn o-btn-secondary gap-2 py-2.5">
            <Download size={16} /> Exportar Reporte Ejecutivo
          </button>
        </div>
      </div>

      {/* KPIs Ejecutivos de Segundo Nivel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Venta Bruta Consolidada</p>
          <div className="flex items-end justify-between">
            <h4 className="text-xl font-black text-gray-800">S/ {reportData.totalGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
            <div className="text-green-500 flex items-center text-[10px] font-bold"><ArrowUpRight size={12}/> 100%</div>
          </div>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ticket Promedio Global</p>
          <div className="flex items-end justify-between">
            <h4 className="text-xl font-black text-odoo-primary">S/ {reportData.avgTicketGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
            <Info size={14} className="text-gray-300"/>
          </div>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Volumen de Transacciones</p>
          <div className="flex items-end justify-between">
            <h4 className="text-xl font-black text-gray-800">{reportData.totalTicketsGlobal} <span className="text-xs text-gray-400">TICKETS</span></h4>
            <CreditCard size={14} className="text-gray-300"/>
          </div>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Sede Líder</p>
          <div className="flex items-end justify-between">
            <h4 className="text-xl font-black text-amber-600 truncate uppercase">{reportData.items[0]?.name || '-'}</h4>
            <TrendingUp size={14} className="text-amber-500"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Comparativa de Ventas */}
        <div className="bg-white border border-odoo-border rounded shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-odoo-primary"/> Distribución de Ingresos por Sede
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.items} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f4f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`S/ ${value.toLocaleString()}`, 'Venta']}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
                  {reportData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#714B67' : '#ced4da'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Participación (Market Share Interno) */}
        <div className="bg-white border border-odoo-border rounded shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
            <PieIcon size={16} className="text-odoo-primary"/> Participación en el Total
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="name"
                >
                  {reportData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {reportData.items.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{item.name}: {((item.total / reportData.totalGlobal) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Maestra de Auditoría */}
      <div className="bg-white border border-odoo-border rounded shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Reporte Detallado de Operaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[11px] font-black text-gray-400 uppercase border-b border-odoo-border">
              <tr>
                <th className="px-6 py-4">Sede / Punto de Venta</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Tickets</th>
                <th className="px-6 py-4 text-right">Ticket Promedio</th>
                <th className="px-6 py-4 text-right">Total Venta</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:bg-odoo-primary group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-gray-700 uppercase">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.state === 'opened' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.state === 'opened' ? 'Activa' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-500 text-xs">{item.tickets} UNI</td>
                  <td className="px-6 py-4 text-right font-bold text-odoo-primary text-xs">S/ {item.avgTicket.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-right font-black text-gray-800 text-sm">S/ {item.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onSelect(item)} className="p-2 text-gray-300 hover:text-odoo-primary transition-colors">
                      <ChevronRight size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Lateral de Detalle Profundo */}
      {selectedPos && currentDetailData && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="px-6 py-5 border-b flex justify-between items-center bg-odoo-primary text-white">
                <div className="flex items-center gap-3">
                   <Store size={20}/>
                   <div>
                     <h3 className="text-lg font-black uppercase leading-none">{selectedPos.name}</h3>
                     <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Auditoría Individual de Sede</p>
                   </div>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-odoo-bg/30">
                {/* Scorecards de Sede */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-4 rounded-xl border border-odoo-border shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Venta Total</p>
                      <p className="text-2xl font-black text-gray-800">S/ {currentDetailData.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="bg-white p-4 rounded-xl border border-odoo-border shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Ticket Promedio</p>
                      <p className="text-2xl font-black text-odoo-primary">S/ {currentDetailData.avgTicket.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <div className="bg-white rounded-xl border border-odoo-border shadow-sm overflow-hidden">
                   <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <h4 className="text-xs font-black text-gray-600 uppercase">Resumen de Eficiencia</h4>
                      <Users size={14} className="text-gray-400" />
                   </div>
                   <div className="p-6 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Participación en la Cadena</span>
                        <span className="text-sm font-black text-gray-800">
                          {reportData.totalGlobal > 0 ? ((currentDetailData.total / reportData.totalGlobal) * 100).toFixed(2) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-odoo-primary h-full" style={{ width: `${(currentDetailData.total / reportData.totalGlobal) * 100}%` }}></div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100 flex justify-between">
                         <div className="text-center flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Monto Ticket</p>
                            <p className="text-sm font-black text-gray-700">S/ {currentDetailData.avgTicket.toFixed(2)}</p>
                         </div>
                         <div className="w-px bg-gray-100 h-8"></div>
                         <div className="text-center flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Tickets Totales</p>
                            <p className="text-sm font-black text-gray-700">{currentDetailData.tickets}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-4">
                   <div className="p-2 bg-amber-500 text-white rounded-lg self-start"><TrendingUp size={18}/></div>
                   <div>
                      <p className="text-xs font-bold text-amber-800 uppercase">Sugerencia Operativa</p>
                      <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                        {currentDetailData.avgTicket < reportData.avgTicketGlobal 
                          ? `Esta sede tiene un ticket promedio inferior al global (S/ ${reportData.avgTicketGlobal.toFixed(2)}). Se recomienda revisar estrategias de venta sugerida.`
                          : `Sede con alto rendimiento. El ticket promedio supera el estándar global. Mantener estrategias actuales.`
                        }
                      </p>
                   </div>
                </div>
             </div>
             
             <div className="p-6 border-t bg-gray-50">
                <button 
                  onClick={onCloseDetail}
                  className="w-full o-btn o-btn-secondary py-3 font-bold uppercase tracking-widest text-xs"
                >
                  Cerrar Auditoría Individual
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
