
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  X, RefreshCw, Coffee,
  CalendarDays, Check, Zap
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
  
  // IMPORTANTE: Valores en minúsculas para cumplir con la restricción de la DB
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche' | 'descanso'>('mañana');
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
      const currentShiftType = isRestDay ? 'descanso' : shiftType;

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
      {/* Header Panel */}
      <div className="bg-white p-6 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-[40]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-2xl shadow-lg shadow-odoo-primary/20">
            <CalendarDays size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Control de Horarios</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               {dbLoading && <RefreshCw size={12} className="animate-spin text-odoo-primary"/>}
               Programación de Personal SJ
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
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/30 transition-all shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-2xl mb-4">{emp.name.charAt(0)}</div>
                <h3 className="text-xs font-black text-slate-800 uppercase text-center line-clamp-1">{emp.name}</h3>
                {isAdmin && <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all flex items-center justify-center gap-2"><Plus size={16}/> Programar</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm animate-fade">
          <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Clock size={20} className="text-odoo-primary"/>
                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Actividad de Turnos</h3>
             </div>
             {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-odoo-primary/20 hover:scale-[1.02] transition-all"><Plus size={18}/> Nueva Programación</button>}
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
             <table className="w-full text-left text-[11px]">
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
                   <tr key={shift.id} className={`hover:bg-slate-50 transition-colors ${shift.shift_type === 'descanso' ? 'bg-slate-50/40 opacity-60' : ''}`}>
                     <td className="px-8 py-4 font-bold text-slate-700 uppercase">{shift.employee_name}</td>
                     <td className="px-8 py-4 font-black uppercase text-slate-500">{shift.pos_name}</td>
                     <td className="px-8 py-4 font-bold text-slate-600 uppercase">{new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short'})}</td>
                     <td className="px-8 py-4">{shift.shift_type === 'descanso' ? 'LIBRE' : `${shift.start_time.slice(0,5)} - ${shift.end_time.slice(0,5)}`}</td>
                     <td className="px-8 py-4">
                       <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase ${
                         shift.shift_type === 'mañana' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'tarde' ? 'bg-indigo-100 text-indigo-600' :
                         shift.shift_type === 'completo' ? 'bg-odoo-primary text-white' : 
                         shift.shift_type === 'noche' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-8 py-4 text-right">{isAdmin && <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={16}/></button>}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* FICHA DE REGISTRO - REDISEÑADA PARA SER ULTRA COMPACTA Y SIEMPRE VISIBLE */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-slate-900/95 backdrop-blur-md overflow-hidden animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl flex flex-col max-h-[92vh] border border-white/20"
           >
              {/* Header - Muy compacto */}
              <div className="px-6 py-3 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-odoo-primary rounded-lg flex items-center justify-center text-white"><Plus size={16}/></div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Nueva Programación</h3>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-red-500 border border-slate-100"><X size={16}/></button>
              </div>
              
              {/* Cuerpo - Scrollable si es necesario */}
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-white">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    {/* Bloque Identidad */}
                    <div className="space-y-3">
                       <h4 className="text-[8px] font-black text-slate-400 uppercase border-b pb-0.5 flex items-center gap-1.5"><Users size={10}/> Datos Principales</h4>
                       <div className="space-y-1">
                          <label className="text-[7px] font-black text-slate-500 uppercase ml-1">Colaborador</label>
                          <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-700 outline-none">
                             {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-slate-500 uppercase ml-1">F. Inicio</label>
                             <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-slate-500 uppercase ml-1">F. Fin</label>
                             <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                       </div>
                    </div>

                    {/* Bloque Jornada */}
                    <div className="space-y-3">
                       <h4 className="text-[8px] font-black text-slate-400 uppercase border-b pb-0.5 flex items-center gap-1.5"><Clock size={10}/> Horario Base</h4>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-500 uppercase ml-1">Turno</label>
                            <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black uppercase text-slate-700 outline-none">
                               <option value="mañana">☀ MAÑANA</option>
                               <option value="tarde">🌆 TARDE</option>
                               <option value="completo">⚡ COMPLETO</option>
                               <option value="noche">🌙 NOCHE</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-slate-500 uppercase ml-1">Sede</label>
                            <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-700 outline-none">
                               {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-slate-500 uppercase ml-1">Entrada</label>
                             <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none" defaultValue="08:00"/>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-slate-500 uppercase ml-1">Salida</label>
                             <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none" defaultValue="14:00"/>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Días de Descanso */}
                 <div className="pt-3 border-t border-slate-100">
                    <label className="text-[8px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                       <Coffee size={10} className="text-odoo-primary"/> Días de Descanso Semanal
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-2 rounded-lg text-[9px] font-black uppercase transition-all border flex flex-col items-center justify-center ${
                              restDays.includes(day.value) 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white'
                            }`}
                         >
                           {restDays.includes(day.value) && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white">
                                <Check size={8} strokeWidth={4}/>
                              </div>
                           )}
                           <span>{day.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Footer Fijo con el Botón */}
              <div className="px-6 py-4 bg-slate-50 border-t shrink-0">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg flex items-center justify-center gap-3 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>}
                    <span>{dbLoading ? 'Procesando...' : 'Confirmar Programación'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
