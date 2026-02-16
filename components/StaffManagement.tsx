
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  Mail, X, RefreshCw, Coffee,
  CalendarDays, Check, Info
} from 'lucide-react';
import { Employee, PosConfig, Shift } from '../types';
import { shiftService } from '../services/supabaseService';

interface StaffManagementProps {
  isAdmin: boolean;
  employees: Employee[];
  posConfigs: PosConfig[];
  currentUserEmail?: string;
  loading: boolean;
}

const DAYS_OF_WEEK = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
];

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [activeView, setActiveView] = useState<'roster' | 'schedule'>('schedule');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche' | 'descanso'>('mañana');
  const [restDays, setRestDays] = useState<number[]>([0]); // Por defecto domingos

  const loadShifts = async () => {
    setDbLoading(true);
    try {
      let data;
      if (isAdmin) {
        data = await shiftService.getShifts();
      } else if (currentUserEmail) {
        data = await shiftService.getMyShifts(currentUserEmail);
      }
      setShifts(data || []);
    } catch (e) {
      console.error("Error cargando turnos:", e);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [isAdmin, currentUserEmail]);

  const toggleRestDay = (day: number) => {
    setRestDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleAddShiftRange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDbLoading(true);
    const formData = new FormData(e.currentTarget);
    const empId = Number(formData.get('employee_id'));
    const posId = Number(formData.get('pos_id'));
    const startDateStr = formData.get('start_date') as string;
    const endDateStr = formData.get('end_date') as string;
    
    const emp = employees.find(e => e.id === empId);
    const pos = posConfigs.find(p => p.id === posId);

    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const shiftBatch: any[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isRestDay = restDays.includes(d.getDay());
      const currentShiftType = isRestDay ? 'descanso' : shiftType;

      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: isRestDay ? 0 : posId,
        pos_name: isRestDay ? 'LIBRE' : (pos?.name || 'Sin Sede'),
        date: d.toISOString().split('T')[0],
        shift_type: currentShiftType,
        start_time: isRestDay ? '00:00' : formData.get('start'),
        end_time: isRestDay ? '00:00' : formData.get('end'),
        status: 'confirmed',
        created_by: currentUserEmail
      });
    }

    try {
      await shiftService.createShifts(shiftBatch);
      setShowAddShift(false);
      loadShifts();
    } catch (e) {
      alert("Error al guardar rango: " + (e as any).message);
    } finally {
      setDbLoading(false);
    }
  };

  const deleteShift = async (id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    setDbLoading(true);
    try {
      await shiftService.deleteShift(id);
      loadShifts();
    } catch (e) {
      alert("Error al eliminar");
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade pb-20">
      {/* Header Panel */}
      <div className="bg-white/90 backdrop-blur-sm p-4 border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-[40]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-odoo-primary text-white rounded-xl">
            <CalendarDays size={18}/>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none">Gestión Horaria</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de Turnos y Descansos</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveView('schedule')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}>Cronograma</button>
          <button onClick={() => setActiveView('roster')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}>Colaboradores</button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-odoo-primary/30 transition-all group shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-odoo-primary font-black text-lg border border-slate-100 mb-3">
                   {emp.name.charAt(0)}
                </div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase text-center line-clamp-1">{emp.name}</h3>
                <p className="text-[8px] font-bold text-odoo-primary uppercase opacity-60 tracking-tighter">{emp.job_title || 'Colaborador SJS'}</p>
                {isAdmin && (
                  <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="w-full mt-4 bg-slate-900 text-white py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all">
                    Asignar Mensual
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
             <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Cronograma de Operaciones</h3>
             {isAdmin && (
               <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-2.5 px-5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                 <Plus size={14}/> Programar Rango
               </button>
             )}
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                 <tr>
                   <th className="px-6 py-3">Colaborador</th>
                   <th className="px-6 py-3">Punto de Venta</th>
                   <th className="px-6 py-3">Fecha</th>
                   <th className="px-6 py-3">Horario</th>
                   <th className="px-6 py-3">Tipo</th>
                   <th className="px-6 py-3 text-right"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {shifts.map(shift => (
                   <tr key={shift.id} className={`hover:bg-slate-50/80 transition-colors group ${shift.shift_type === 'descanso' ? 'bg-slate-50/30' : ''}`}>
                     <td className="px-6 py-3">
                       <span className="text-[11px] font-bold text-slate-700 uppercase">{shift.employee_name}</span>
                     </td>
                     <td className="px-6 py-3">
                       <span className={`text-[9px] font-black uppercase ${shift.shift_type === 'descanso' ? 'text-slate-300 italic' : 'text-slate-500'}`}>{shift.pos_name}</span>
                     </td>
                     <td className="px-6 py-3">
                       <span className="text-[11px] font-bold text-slate-600 uppercase">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {weekday: 'short', day: '2-digit', month: 'short'})}
                       </span>
                     </td>
                     <td className="px-6 py-3">
                        {shift.shift_type === 'descanso' ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                             <Coffee size={12}/> <span className="text-[9px] font-black uppercase">Libre</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">
                            {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                          </span>
                        )}
                     </td>
                     <td className="px-6 py-3">
                       <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${
                         shift.shift_type === 'mañana' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'tarde' ? 'bg-indigo-100 text-indigo-600' :
                         shift.shift_type === 'noche' ? 'bg-slate-800 text-white' : 
                         shift.shift_type === 'descanso' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-6 py-3 text-right">
                       {isAdmin && (
                         <button onClick={() => deleteShift(shift.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <X size={14}/>
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Programación - Optimizado para visibilidad completa */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-2 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
           <form onSubmit={handleAddShiftRange} className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-fade my-auto border border-white flex flex-col max-h-[95vh]">
              <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div>
                   <h3 className="text-base font-black uppercase text-slate-800 tracking-tight leading-none">Programación Inteligente</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración de Rango y Descansos</p>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="p-2 text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                 {/* Sector 1: Colaborador y Período */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Colaborador</label>
                       <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none">
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Inicio</label>
                          <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700" defaultValue={new Date().toISOString().split('T')[0]}/>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Fin</label>
                          <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700" defaultValue={new Date().toISOString().split('T')[0]}/>
                       </div>
                    </div>
                 </div>

                 {/* Sector 2: Turno de Trabajo */}
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                       <div className="flex-1 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Turno Base de Trabajo</label>
                          <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-slate-700 outline-none">
                             <option value="mañana">☀ Mañana</option>
                             <option value="tarde">🌇 Tarde</option>
                             <option value="completo">⚡ Completo</option>
                             <option value="noche">🌙 Noche</option>
                          </select>
                       </div>
                       <div className="flex-1 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Sede de Trabajo</label>
                          <select name="pos_id" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-slate-700 outline-none">
                             {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Entrada</label>
                          <input type="time" name="start" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700" defaultValue="08:00"/>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Salida</label>
                          <input type="time" name="end" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700" defaultValue="14:00"/>
                       </div>
                    </div>
                 </div>

                 {/* Sector 3: Días de Descanso Inyectados */}
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                         <Coffee size={12}/> Días de Descanso Semanales
                       </label>
                       <span className="text-[8px] font-bold text-slate-400 uppercase">Se marcarán como "LIBRE"</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                           key={day.value}
                           type="button"
                           onClick={() => toggleRestDay(day.value)}
                           className={`flex-1 min-w-[60px] py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                             restDays.includes(day.value) 
                             ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                             : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                           }`}
                         >
                           {day.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex gap-2 items-center">
                    <Info size={14} className="text-blue-500 shrink-0" />
                    <p className="text-[9px] text-blue-700 font-bold uppercase leading-tight tracking-tighter">
                      El sistema generará automáticamente turnos de {shiftType} para los días laborales y turnos de "DESCANSO" para los días seleccionados arriba.
                    </p>
                 </div>
              </div>

              <div className="p-6 border-t bg-slate-50 shrink-0">
                 <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    {dbLoading ? <RefreshCw size={16} className="animate-spin"/> : <><Check size={18}/> Generar Programación Completa</>}
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
