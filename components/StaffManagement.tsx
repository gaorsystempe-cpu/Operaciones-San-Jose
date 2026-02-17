
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, Sun, Moon, Zap, Coffee,
  ShieldCheck, Briefcase, Info
} from 'lucide-react';
import { Employee, Shift } from '../types';
import { shiftService } from '../services/supabaseService';

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

const EmployeeCalendar = ({ 
  employee, 
  shifts, 
  onClose 
}: { 
  employee: Employee; 
  shifts: Shift[]; 
  onClose: () => void 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days, year, month };
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' });

  const getShiftForDay = (day: number) => {
    const dateStr = `${daysInMonth.year}-${String(daysInMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.find(s => s.date === dateStr);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end animate-fade">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Cabecera Corporativa */}
        <div className="bg-white px-8 py-5 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-odoo-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-odoo-primary/20">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none">{employee.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <Calendar size={12}/> Mapa Operativo Mensual
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:rotate-90">
            <X size={24}/>
          </button>
        </div>

        {/* Control de Navegación y Leyenda Dinámica */}
        <div className="px-8 py-4 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-6 shrink-0">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronLeft size={20}/></button>
            <h4 className="text-xs font-black text-slate-700 uppercase min-w-[150px] text-center tracking-[0.2em]">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronRight size={20}/></button>
          </div>
          
          <div className="flex gap-6">
             <div className="flex items-center gap-3 group">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 border-2 border-emerald-700 shadow-lg shadow-emerald-200"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">TRABAJO</span>
             </div>
             <div className="flex items-center gap-3 group">
                <div className="w-6 h-6 rounded-lg bg-slate-400 border-2 border-slate-500 shadow-lg shadow-slate-200"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">DESCANSO</span>
             </div>
          </div>
        </div>

        {/* Grid de Calendario "Hard-Color" */}
        <div className="flex-1 p-4 bg-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 gap-1.5 h-full">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-2">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 rounded-2xl border border-slate-200/50" />
            ))}

            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              
              const isWork = shift && shift.shift_type !== 'descanso';
              const isRest = shift && shift.shift_type === 'descanso';

              return (
                <div 
                  key={day} 
                  className={`relative rounded-2xl p-3 border-2 transition-all flex flex-col items-center justify-center text-center overflow-hidden h-full min-h-[80px] ${
                    isToday ? 'ring-4 ring-odoo-primary/30 border-odoo-primary bg-white z-20 shadow-2xl scale-[1.05]' : 
                    isWork ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' :
                    isRest ? 'bg-slate-400 border-slate-500 text-white shadow-md' :
                    'bg-white border-slate-200 text-slate-300 border-dashed'
                  }`}
                >
                  {/* Número de Día flotante */}
                  <div className="absolute top-2 left-3">
                    <span className={`text-[11px] font-black ${isToday ? 'text-odoo-primary' : (isWork || isRest ? 'text-white/60' : 'text-slate-300')}`}>
                      {day}
                    </span>
                  </div>

                  {isToday && (
                    <div className="absolute top-2 right-2">
                       <span className="text-[8px] font-black bg-odoo-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">HOY</span>
                    </div>
                  )}

                  {shift ? (
                    <div className="w-full flex flex-col items-center gap-1">
                      {/* ETIQUETA DE ESTADO - GRANDE Y CLARA */}
                      <span className="text-[11px] font-black uppercase tracking-[0.1em] drop-shadow-sm">
                        {isRest ? 'DESCANSO' : 'TRABAJO'}
                      </span>
                      
                      {isWork && (
                        <div className="flex flex-col items-center mt-1 pt-1 border-t border-white/20 w-full">
                           <div className="flex items-center gap-1 text-[12px] font-black">
                             <Clock size={12} strokeWidth={3}/> {shift.start_time.slice(0,5)}
                           </div>
                           <p className="text-[8px] font-bold uppercase opacity-80 mt-1 bg-black/10 px-2 py-0.5 rounded-full truncate max-w-full">
                             {shift.pos_name}
                           </p>
                        </div>
                      )}

                      {isRest && (
                        <div className="mt-2 p-1.5 bg-white/10 rounded-full border border-white/20 shadow-inner">
                          <Coffee size={24} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-20">
                       <Briefcase size={20} />
                       <span className="text-[8px] font-black mt-1">PENDIENTE</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer con Refuerzo Visual */}
        <div className="px-8 py-5 border-t bg-white flex justify-between items-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <Info size={16} className="text-odoo-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Verde = <span className="text-emerald-600">Trabajo</span> | Gris = <span className="text-slate-500">Descanso Autorizado</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema de Personal v2.6</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StaffManagementProps {
  isAdmin: boolean;
  employees: Employee[];
  posConfigs: any[];
  currentUserEmail?: string;
  loading: boolean;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [view, setView] = useState<'roster' | 'global'>('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewCalendarEmp, setViewCalendarEmp] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche'>('mañana');
  const [restDays, setRestDays] = useState<number[]>([0]);

  const loadShifts = async () => {
    setDbLoading(true);
    try {
      const data = isAdmin ? await shiftService.getShifts() : (currentUserEmail ? await shiftService.getMyShifts(currentUserEmail) : []);
      setShifts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, [isAdmin, currentUserEmail]);

  const getEmployeeStatus = (empId: number) => {
    const today = new Date().toISOString().split('T')[0];
    return shifts.find(s => s.employee_id === empId && s.date === today);
  };

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
      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: isRestDay ? 0 : posId,
        pos_name: isRestDay ? 'DESCANSO' : (pos?.name || 'Botica SJ'),
        date: d.toISOString().split('T')[0],
        shift_type: isRestDay ? 'descanso' : shiftType,
        start_time: isRestDay ? '00:00:00' : `${formData.get('start')}:00`,
        end_time: isRestDay ? '00:00:00' : `${formData.get('end')}:00`,
        status: 'confirmed',
        created_by: currentUserEmail
      });
    }

    try {
      await shiftService.createShifts(shiftBatch);
      setShowAddShift(false);
      loadShifts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-32">
      
      {/* Header Corporativo Dashboard */}
      <div className="bg-white p-10 border border-slate-200 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-odoo-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-odoo-primary/10 transition-all duration-700"></div>
        
        <div className="flex items-center gap-8 z-10">
          <div className="p-5 bg-odoo-primary text-white rounded-[24px] shadow-2xl shadow-odoo-primary/20 hover:scale-110 transition-transform duration-500">
            <Users size={32}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">Gestión de Staff</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2.5 flex items-center gap-2">
               <ShieldCheck size={16} className="text-emerald-500"/> Cronogramas de Boticas San José
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-2 rounded-[24px] border border-slate-200 z-10 shadow-inner">
           <button onClick={() => setView('roster')} className={`px-8 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-lg border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Fichas de Colaboradores</button>
           <button onClick={() => setView('global')} className={`px-8 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-lg border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Auditoría de Turnos</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const isWorking = todayShift && todayShift.shift_type !== 'descanso';
            const isResting = todayShift && todayShift.shift_type === 'descanso';

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[40px] p-8 hover:border-odoo-primary/40 transition-all shadow-sm hover:shadow-2xl group relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-3xl font-black text-odoo-primary mb-6 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-500 transform group-hover:-translate-y-2">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-sm font-black text-slate-800 uppercase line-clamp-1 mb-1.5 tracking-tight group-hover:text-odoo-primary transition-colors">{emp.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{emp.job_title || 'PERSONAL OPERATIVO'}</p>
                
                {/* Status Hoy Binario */}
                <div className={`w-full p-5 rounded-[28px] border-2 transition-all duration-500 ${
                  isWorking ? 'bg-emerald-600 border-emerald-700 text-white shadow-xl shadow-emerald-200' : 
                  isResting ? 'bg-slate-400 border-slate-500 text-white shadow-xl shadow-slate-200' :
                  'bg-slate-50 border-slate-100 opacity-40'
                }`}>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] block mb-2 ${isWorking || isResting ? 'text-white/70' : 'text-slate-500'}`}>Situación Hoy</span>
                  {todayShift ? (
                    <div className="flex items-center justify-center gap-3">
                       {isWorking ? <Sun size={18} className="animate-spin-slow"/> : <Coffee size={18} className="animate-bounce"/>}
                       <span className="text-[13px] font-black uppercase tracking-tighter">
                         {isWorking ? todayShift.shift_type : 'DESCANSO'}
                       </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold uppercase opacity-30 italic">No asignado</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-8">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-4 rounded-[20px] text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                     <Calendar size={16}/> Mi Mes
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 rounded-[20px] text-[10px] font-black uppercase shadow-lg shadow-odoo-primary/20 hover:scale-[1.05] transition-all hover:bg-[#5e3e55]">
                      Programar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'global' && (
        <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl animate-fade">
           <div className="px-12 py-8 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                 <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <Clock size={28} className="text-odoo-primary"/>
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight leading-none">Consolidado General</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Auditoría de Turnos Publicados</p>
                 </div>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 px-10 rounded-[24px] text-[11px] font-black uppercase flex items-center gap-4 shadow-xl shadow-odoo-primary/30 hover:scale-[1.05] transition-all"><Plus size={20}/> Nueva Carga Masiva</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-12 py-8">Colaborador</th>
                      <th className="px-12 py-8">Punto de Venta</th>
                      <th className="px-12 py-8">Fecha</th>
                      <th className="px-12 py-8 text-center">Estado del Turno</th>
                      <th className="px-12 py-8 text-right"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const isRest = shift.shift_type === 'descanso';
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-12 py-6 font-black text-slate-800 uppercase text-[12px] tracking-tight">{shift.employee_name}</td>
                           <td className="px-12 py-6 font-bold text-slate-500 uppercase text-[11px]">{shift.pos_name}</td>
                           <td className="px-12 py-6 font-bold text-slate-600 uppercase text-[11px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short', year: 'numeric'})}
                           </td>
                           <td className="px-12 py-6 text-center">
                              <span className={`text-[10px] font-black px-6 py-2.5 rounded-full uppercase border-2 shadow-sm transition-all ${isRest ? 'bg-slate-400 text-white border-slate-500' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                 {shift.shift_type.toUpperCase()}
                              </span>
                           </td>
                           <td className="px-12 py-6 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Seguro que desea eliminar este turno?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={20}/></button>}</td>
                        </tr>
                       );
                    })}
                    {shifts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-32 text-center">
                           <div className="flex flex-col items-center opacity-20">
                              <Calendar size={64} />
                              <p className="mt-4 text-sm font-black uppercase tracking-widest">Sin registros encontrados</p>
                           </div>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VISTA CALENDARIO OPERATIVO (Hard-Color) */}
      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => s.employee_id === viewCalendarEmp.id)} 
          onClose={() => setViewCalendarEmp(null)} 
        />
      )}

      {/* MODAL DE CARGA DE TURNOS (Compacto) */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[520px] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
           >
              <div className="px-12 py-10 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-odoo-primary rounded-[22px] flex items-center justify-center text-white shadow-2xl shadow-odoo-primary/30"><CalendarDays size={28}/></div>
                    <div>
                      <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tight leading-none">Carga de Roles</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Programación de Turnos Staff</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all hover:rotate-90 hover:bg-red-50"><X size={28}/></button>
              </div>
              
              <div className="p-12 space-y-8 bg-white overflow-y-auto custom-scrollbar max-h-[65vh]">
                 <div className="space-y-2.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador Destinatario</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30 transition-all appearance-none cursor-pointer">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango Desde</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30 transition-all" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango Hasta</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30 transition-all" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Config. Turno</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-[11px] font-black uppercase text-slate-700 outline-none cursor-pointer focus:border-odoo-primary/30">
                         <option value="mañana">☀ MAÑANA</option>
                         <option value="tarde">🌆 TARDE</option>
                         <option value="completo">⚡ FULL DAY</option>
                         <option value="noche">🌙 NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Botica / Sede</label>
                      <select name="pos_id" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-[11px] font-black uppercase text-slate-700 outline-none cursor-pointer focus:border-odoo-primary/30">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30 transition-all" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30 transition-all" defaultValue="21:00"/>
                    </div>
                 </div>

                 <div className="pt-10 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
                       <Coffee size={20} className="text-emerald-500"/> Definir Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-3">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-5 rounded-[22px] text-[10px] font-black uppercase transition-all border-2 flex flex-col items-center justify-center gap-1.5 shadow-sm ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-200 scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-200'
                            }`}
                         >
                           {day.label}
                           {restDays.includes(day.value) && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-glow"></div>}
                         </button>
                       ))}
                    </div>
                    <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase text-center tracking-widest italic">* Los días seleccionados se marcarán como DESCANSO automáticamente.</p>
                 </div>
              </div>

              <div className="px-12 py-10 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-odoo-primary/40 flex items-center justify-center gap-4 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={28} className="animate-spin"/> : <Check size={28}/>}
                    <span>{dbLoading ? 'Procesando Carga...' : 'Publicar Horarios'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
