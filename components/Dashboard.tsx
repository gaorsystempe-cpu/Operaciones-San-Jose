
import React from 'react';
import { TrendingUp, Package, Store, Trophy, Activity, ArrowUpRight } from 'lucide-react';
import { OdooStatCard } from './StatCard';

interface DashboardProps {
  posConfigs: any[];
  posSalesData: any;
  lastSync: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ posConfigs, posSalesData, lastSync }) => {
  const totalSales = Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.totalSales || 0), 0));
  const totalTickets = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0);
  const activeCount = Object.values(posSalesData).filter((v: any) => v.isOnline).length;

  // Calcular TOP de Ventas
  const ranking = posConfigs
    .map(c => ({
      name: c.name,
      sales: posSalesData[c.id]?.totalSales || 0,
      tickets: posSalesData[c.id]?.count || 0,
      isOnline: posSalesData[c.id]?.isOnline
    }))
    .sort((a, b) => b.sales - a.sales);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-12">
      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OdooStatCard title="Venta Bruta Total" value={`S/ ${totalSales.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={TrendingUp} active />
        <OdooStatCard title="Total Tickets Emitidos" value={totalTickets} icon={Package} />
        <OdooStatCard title="Puntos en Operación" value={activeCount} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Ranking Top Ventas */}
        <div className="xl:col-span-1 bg-white border border-odoo-border rounded shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b bg-odoo-primary text-white flex justify-between items-center">
             <h3 className="text-sm font-bold uppercase flex items-center gap-2">
               <Trophy size={16}/> Ranking de Ventas
             </h3>
             <span className="text-[10px] font-black opacity-60 uppercase">Top Rendimiento</span>
          </div>
          <div className="flex-1 p-4 space-y-3">
             {ranking.slice(0, 5).map((item, index) => (
               <div key={index} className="flex items-center gap-4 p-3 rounded-odoo border border-gray-50 hover:border-odoo-primary/20 hover:bg-odoo-primary/5 transition-all">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-200 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-700 uppercase truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className={`w-1.5 h-1.5 rounded-full ${item.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                       <span className="text-[10px] text-gray-400 font-bold uppercase">{item.tickets} tickets</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-odoo-primary">S/ {item.sales.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
               </div>
             ))}
             {ranking.length === 0 && (
               <div className="py-10 text-center text-gray-400 text-xs italic">No hay datos de venta registrados</div>
             )}
          </div>
          <div className="p-3 bg-gray-50 border-t text-center">
             <span className="text-[10px] font-bold text-gray-400 uppercase">Resumen del periodo seleccionado</span>
          </div>
        </div>

        {/* Tabla Detallada de Sedes */}
        <div className="xl:col-span-2 bg-white border border-odoo-border rounded shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight flex items-center gap-2">
               <Store size={16} className="text-odoo-primary"/> Monitor Consolidado por Sede
             </h3>
             <span className="text-[10px] font-bold text-gray-400">Última Sync: {lastSync}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[11px] font-black text-gray-400 uppercase border-b border-odoo-border">
                <tr>
                  <th className="px-6 py-4">Punto de Venta</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Participación %</th>
                  <th className="px-6 py-4 text-right">Venta Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ranking.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="p-1.5 bg-gray-100 rounded text-gray-400 group-hover:text-odoo-primary transition-colors">
                        <Store size={14}/>
                      </div>
                      <span className="text-xs font-bold text-gray-700 uppercase">{item.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${item.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">{item.isOnline ? 'ABIERTO' : 'CERRADO'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-xs font-bold text-gray-400">
                         {totalSales > 0 ? ((item.sales / totalSales) * 100).toFixed(1) : 0}%
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-black text-gray-800">S/ {item.sales.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        <ArrowUpRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
