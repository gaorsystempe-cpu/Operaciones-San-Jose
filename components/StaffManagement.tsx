
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  Mail, X, RefreshCw, Coffee,
  CalendarDays, Check, Info, AlertCircle, Zap
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
  { label: 'Lunes', value: 1, short: 'Lun' },
  { label: 'Martes', value: 2, short: 'Mar' },
  { label: 'Miércoles', value: 3, short: 'Mié' },
  { label: 'Jueves', value: 4, short: 'Jue' },
  { label: 'Viernes', value: 5, short: 'Vie' },
  { label: 'Sábado', value: 6, short: 'Sáb' },
  { label: 'Domingo', value: 0, short: 'Dom' },
];

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [activeView, setActiveView] = useState<'roster' | 'schedule'>('schedule');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'MAÑANA' | 'TARDE' | 'COMPLETO' | 'NOCHE' | 'DESCANSO'>('MAÑANA');
  const [restDays, setRestDays] = useState<number[]>([0]);

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
      const currentShiftType = isRestDay ? 'DESCANSO' : shiftType;

      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: isRestDay ? 0 : posId,
        pos_name: isRestDay ? 'LIBRE (DESCANSO)' : (pos?.name || 'Sin Sede'),
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
      alert("Error al guardar: " + (e as any).message);
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
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade pb-24">
      {/* Header General */}
      <div className="bg-white/95 backdrop-blur-md p-6 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-[40]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-2xl shadow-lg shadow-odoo-primary/20">
            <CalendarDays size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Control de Horarios</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               {dbLoading && <RefreshCw size={12} className="animate-spin text-odoo-primary"/>}
               Programación Mensual San José
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button onClick={() => setActiveView('schedule')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Cronograma</button>
          <button onClick={() => setActiveView('roster')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Personal</button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/30 transition-all group shadow-sm relative overflow-hidden">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-2xl border border-slate-100 mb-4 group-hover:scale-110 transition-transform">{emp.name.charAt(0)}</div>
                <h3 className="text-xs font-black text-slate-800 uppercase text-center line-clamp-1">{emp.name}</h3>
                <p className="text-[9px] font-bold text-odoo-primary uppercase mt-1.5 opacity-60 tracking-tighter">{emp.job_title || 'Colaborador SJS'}</p>
                {isAdmin && <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all flex items-center justify-center gap-2"><Plus size={16}/> Programar</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm animate-fade">
          <div className="px-8 py-5 border-b bg-slate-50/50 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Clock size={20} className="text-odoo-primary"/>
                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Actividad Programada</h3>
             </div>
             {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-odoo-primary/20 hover:scale-[1.02] transition-all"><Plus size={18}/> Nueva Programación</button>}
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10 backdrop-blur-md">
                 <tr>
                   <th className="px-8 py-5">Colaborador</th>
                   <th className="px-8 py-5">Sede</th>
                   <th className="px-8 py-5">Fecha</th>
                   <th className="px-8 py-5">Horario</th>
                   <th className="px-8 py-5">Turno</th>
                   <th className="px-8 py-5 text-right"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {shifts.map(shift => (
                   <tr key={shift.id} className={`hover:bg-slate-50 transition-colors group ${shift.shift_type === 'DESCANSO' ? 'bg-slate-50/40 opacity-60' : ''}`}>
                     <td className="px-8 py-4"><span className="text-xs font-bold text-slate-700 uppercase">{shift.employee_name}</span></td>
                     <td className="px-8 py-4"><span className="text-[10px] font-black uppercase text-slate-500">{shift.pos_name}</span></td>
                     <td className="px-8 py-4"><span className="text-xs font-bold text-slate-600 uppercase">{new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short'})}</span></td>
                     <td className="px-8 py-4">
                        {shift.shift_type === 'DESCANSO' ? <span className="text-[10px] font-black text-slate-400">LIBRE</span> : <span className="text-[10px] font-bold text-slate-600">{shift.start_time.slice(0,5)} — {shift.end_time.slice(0,5)}</span>}
                     </td>
                     <td className="px-8 py-4">
                       <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm ${
                         shift.shift_type === 'MAÑANA' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'TARDE' ? 'bg-indigo-100 text-indigo-600' :
                         shift.shift_type === 'NOCHE' ? 'bg-slate-800 text-white' : 
                         shift.shift_type === 'DESCANSO' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-8 py-4 text-right">{isAdmin && <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16}/></button>}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* FICHA DE REGISTRO - ULTRA COMPACTA Y FIJA */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 bg-slate-900/90 backdrop-blur-sm overflow-hidden">
           <form onSubmit={handleAddShiftRange} className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[95vh] animate-fade border border-white">
              
              <div className="px-8 py-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-odoo-primary rounded-xl flex items-center justify-center text-white"><Plus size={20}/></div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight leading-none">Nueva Programación</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Lote Mensual San José</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 border border-slate-100 transition-all"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 bg-white">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                    {/* Sección 1 */}
                    <div className="space-y-4">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1 flex items-center gap-2"><Users size={12}/> Identificación y Período</h4>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Colaborador Odoo</label>
                          <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none">
                             {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Fecha Inicio</label>
                             <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Fecha Fin</label>
                             <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                       </div>
                    </div>

                    {/* Sección 2 */}
                    <div className="space-y-4">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1 flex items-center gap-2"><Clock size={12}/> Especificación de Jornada</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tipo de Turno Base</label>
                            <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-slate-700 outline-none">
                               <option value="MAÑANA">☀ Turno Mañana</option>
                               <option value="TARDE">🌆 Turno Tarde</option>
                               <option value="COMPLETO">⚡ Turno Completo</option>
                               <option value="NOCHE">🌙 Turno Noche</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Sede de Trabajo / Botica</label>
                            <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none">
                               {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Hora Entrada</label>
                             <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none" defaultValue="08:00"/>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Hora Salida</label>
                             <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none" defaultValue="14:00"/>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3"><Coffee size={12} className="text-odoo-primary"/> Días de Descanso Semanal Programados</label>
                    <div className="grid grid-cols-7 gap-2">
                       {DAYS_OF_WEEK.map(day => (
                         <button key={day.value} type="button" onClick={() => toggleRestDay(day.value)} className={`relative py-3 rounded-xl text-[9px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${restDays.includes(day.value) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white'}`}>
                           {restDays.includes(day.value) && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white"><Check size={8} strokeWidth={4}/></div>}
                           <span className="opacity-60 text-[7px]">{day.short}</span>
                           <span className="hidden sm:inline">{day.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* FOOTER FIJO PARA CONFIRMAR */}
              <div className="px-8 py-5 bg-slate-50 border-t shrink-0 sticky bottom-0">
                 <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50">
                    {dbLoading ? <RefreshCw size={18} className="animate-spin"/> : <Check size={18}/>}
                    <span>{dbLoading ? 'Procesando Lote...' : 'Confirmar Registro de Horarios'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
