
import React from 'react';
import { Activity, Calendar, Wallet, Store, ShieldCheck } from 'lucide-react';
import { OdooStatCard } from './StatCard';

interface DashboardProps {
  posConfigs: any[];
  posSalesData: any;
  lastSync: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ posConfigs, posSalesData, lastSync }) => {
  const totalBalance = Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.balance || 0), 0));
  const totalSessions = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-4">
        <OdooStatCard title="Balance Total Cajas" value={`S/ ${totalBalance.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={Wallet} active />
        <OdooStatCard title="Boticas Conectadas" value={posConfigs.length} icon={Store} />
        <OdooStatCard title="Total Sesiones Hoy" value={totalSessions} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Activity size={16} className="text-odoo-primary"/> Estado de Cajas en Tiempo Real
            </h3>
            <span className="text-[10px] font-bold text-gray-400">Última Sincronización: {lastSync}</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {posConfigs.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${posSalesData[c.id]?.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase group-hover:text-odoo-primary transition-colors">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{posSalesData[c.id]?.sessions?.length || 0} sesiones hoy</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-800">S/ {(posSalesData[c.id]?.balance || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  <p className={`text-[9px] font-bold ${posSalesData[c.id]?.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                    {posSalesData[c.id]?.isOnline ? 'SESIÓN ABIERTA' : 'CERRADO'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-odoo-primary/5 rounded-full flex items-center justify-center text-odoo-primary">
            <ShieldCheck size={32} />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-tight">Certificación SJS</h3>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            Toda la información financiera mostrada proviene directamente de los servidores de Odoo v18. Se recomienda conciliar los saldos de caja al final de cada turno.
          </p>
          <div className="pt-4 flex gap-4">
            <div className="text-center">
               <p className="text-[10px] font-bold text-gray-400">DB</p>
               <p className="text-xs font-black text-odoo-primary">mitienda_base_ac</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
               <p className="text-[10px] font-bold text-gray-400">ESTADO</p>
               <p className="text-xs font-black text-green-600">CONECTADO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
