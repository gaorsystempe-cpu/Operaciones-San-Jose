
import React from 'react';
import { TrendingUp, Package, Store, ChevronRight, Activity } from 'lucide-react';
import { OdooStatCard } from './StatCard';

interface DashboardProps {
  posConfigs: any[];
  posSalesData: any;
  lastSync: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ posConfigs, posSalesData, lastSync }) => {
  const totalSales = Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.totalSales || 0), 0));
  const totalSessions = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0);
  const activeCount = Object.values(posSalesData).filter((v: any) => v.isOnline).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OdooStatCard title="Ventas Totales" value={`S/ ${totalSales.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={TrendingUp} active />
        <OdooStatCard title="Operaciones Hoy" value={totalSessions} icon={Package} />
        <OdooStatCard title="Puntos Activos" value={activeCount} icon={Activity} />
      </div>

      <div className="bg-white border border-odoo-border rounded shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
           <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight flex items-center gap-2">
             <Store size={16} className="text-odoo-primary"/> Resumen Operativo de Sedes
           </h3>
           <span className="text-[10px] font-bold text-gray-400">Sync: {lastSync}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[11px] font-black text-gray-400 uppercase border-b border-odoo-border">
              <tr>
                <th className="px-6 py-3">Punto de Venta</th>
                <th className="px-6 py-3">Estado actual</th>
                <th className="px-6 py-3 text-right">Venta Acumulada</th>
                <th className="px-6 py-3 text-right">Cant. Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posConfigs.map(c => {
                const data = posSalesData[c.id];
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm font-bold text-gray-700 uppercase">{c.name}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${data?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                         <span className="text-[11px] font-bold text-gray-500 uppercase">{data?.rawState || 'CERRADO'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-xs font-bold text-gray-500">{data?.count || 0} UNI</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
