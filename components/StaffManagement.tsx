
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, User, MoreHorizontal, Info, Sun, Moon, Zap, Coffee,
  ShieldCheck, Briefcase
} from 'lucide-react';
import { Employee, PosConfig, Shift } from '../types';
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

// Configuración de Temas de Alto Contraste para la Operación
const SHIFT_THEMES: Record<string, { 
  bg: string, 
  text: string, 
  border: string, 
  icon: any, 
  label: string, 
  accent: string,
  fullBg: string 
}> = {
  'mañana': { 
    bg: 'bg-amber-50', 
    text: 'text-amber-800', 
    border: 'border-amber-200', 
    icon: <Sun size={14} />,
    label: 'M - MAÑANA',
    accent: 'bg-amber-500',
    fullBg: 'bg-amber-50/50'
  },
  'tarde': { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-800', 
    border: 'border-indigo-200', 
    icon: <Moon size={14} />,
    label: 'T - TARDE',
    accent: 'bg-indigo-500',
    fullBg: 'bg-indigo-50/50'
  },
  'completo': { 
    bg: 'bg-purple-50', 
    text: 'text-purple-800', 
    border: 'border-purple-200', 
    icon: <Zap size={14} />,
    label: 'F - FULL DAY',
    accent: 'bg-purple-500',
    fullBg: 'bg-purple-50/50'
  },
  'noche': { 
    bg: 'bg-slate-900', 
    text: 'text-white', 
    border: 'border-slate-700', 
    icon: <Moon size={14} />,
    label: 'N - NOCHE',
    accent: 'bg-slate-500',
    fullBg: 'bg-slate-900'
  },
  'descanso': { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-900', 
    border: 'border-emerald-300', 
    icon: <Coffee size={14} />,
    label: 'LIBRE / DESC.',
    accent: 'bg-emerald-600',
    fullBg: 'bg-emerald-50'
  }
};

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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-7xl bg-[#f4f7f6] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header de Gestión de Calendario */}
        <div className="bg-white px-10 py-6 border-b flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-odoo-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-odoo-primary/20">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{employee.name}</h3>
              <div className="flex items-center gap-4 mt-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                   <Calendar size={12}/> Cronograma Mensual
                 </p>
                 <div className="h-3 w-px bg-slate-200"></div>
                 <p className="text-[10px] font-black text-odoo-primary uppercase tracking-widest">{employee.job_title || 'Personal'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3">
               {Object.entries(SHIFT_THEMES).map(([key, theme]) => (
                 <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${theme.accent}`}></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{theme.label.split(' ')[0]}</span>
                 </div>
               ))}
            </div>
            <button onClick={onClose} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-slate-300">
              <X size={24}/>
            </button>
          </div>
        </div>

        {/* Navegación Temporal */}
        <div className="px-10 py-4 bg-white border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-odoo-primary"><ChevronLeft size={18}/></button>
            <h4 className="text-[11px] font-black text-slate-700 uppercase min-w-[160px] text-center tracking-widest">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-odoo-primary"><ChevronRight size={18}/></button>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {shifts.length} Turnos Programados este Mes
          </div>
        </div>

        {/* Grid de Calendario de Alta Visibilidad */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-3 h-full min-h-[700px]">
            {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
              <div key={d} className="pb-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-100/40 rounded-[28px] border border-dashed border-slate-200 min-h-[140px]" />
            ))}

            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              const theme = shift ? SHIFT_THEMES[shift.shift_type] : null;

              return (
                <div 
                  key={day} 
                  className={`relative min-h-[140px] rounded-[32px] p-4 border transition-all flex flex-col group overflow-hidden ${
                    isToday ? 'ring-4 ring-odoo-primary/10 border-odoo-primary bg-white shadow-xl' : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${theme ? theme.fullBg : 'bg-white'}`}
                >
                  {/* Número de Día y Estado "Hoy" */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-black ${isToday ? 'text-odoo-primary' : (theme ? theme.text : 'text-slate-300')}`}>
                      {String(day).padStart(2, '0')}
                    </span>
                    {isToday && (
                       <div className="px-2 py-0.5 bg-odoo-primary text-[8px] font-black text-white rounded-full tracking-widest animate-pulse">HOY</div>
                    )}
                  </div>

                  {/* Contenido del Turno o Descanso */}
                  {shift ? (
                    <div className="flex-1 flex flex-col">
                       <div className={`mt-auto p-3 rounded-2xl border ${theme?.bg} ${theme?.border} ${theme?.text} shadow-sm`}>
                          <div className="flex items-center gap-2 mb-2">
                             <div className={`p-1 rounded-lg ${shift.shift_type === 'noche' ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                {theme?.icon}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-tighter truncate">{theme?.label}</span>
                          </div>

                          {shift.shift_type !== 'descanso' ? (
                            <div className="space-y-1.5">
                               <div className="flex items-center gap-1.5 text-[11px] font-black">
                                  <Clock size={12}/> {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                               </div>
                               <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-80 uppercase truncate">
                                  <MapPin size={10}/> {shift.pos_name}
                               </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 py-1">
                               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">DESCANSO</div>
                               <div className="h-1 w-full bg-emerald-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 w-full"></div>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
                       <Briefcase size={40} className="text-slate-400" />
                    </div>
                  )}
                </div>
              );
            })}
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
      
      {/* Header Corporativo Refinado */}
      <div className="bg-white p-10 border border-slate-200 rounded-[48px] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
           <Users size={200}/>
        </div>
        
        <div className="flex items-center gap-8 z-10">
          <div className="p-6 bg-odoo-primary text-white rounded-[32px] shadow-2xl shadow-odoo-primary/20">
            <Users size={40}/>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none tracking-tight">Gestión Operativa</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
               <ShieldCheck size={14} className="text-emerald-500"/> Planificación y Horarios de Cadena
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-2 rounded-[28px] border border-slate-200 z-10">
           <button onClick={() => setView('roster')} className={`px-10 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-xl shadow-slate-200 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Fichas Staff</button>
           <button onClick={() => setView('global')} className={`px-10 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-xl shadow-slate-200 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Consolidado</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const theme = todayShift ? SHIFT_THEMES[todayShift.shift_type] : null;

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[48px] p-10 hover:border-odoo-primary/30 transition-all shadow-sm hover:shadow-2xl hover:-translate-y-1 group relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className="w-28 h-28 bg-slate-50 rounded-[40px] flex items-center justify-center text-4xl font-black text-odoo-primary mb-8 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-500">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-base font-black text-slate-800 uppercase line-clamp-1 mb-1 tracking-tight">{emp.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{emp.job_title || 'COLABORADOR'}</p>
                
                {/* Status Hoy - Diseño Profesional */}
                <div className={`w-full p-6 rounded-[32px] border transition-all ${
                  !todayShift ? 'bg-slate-50 border-slate-100' : 
                  theme?.bg + ' ' + theme?.border + ' ' + theme?.text
                }`}>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 block mb-2">Estado de Hoy</span>
                  {todayShift ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                         {theme?.icon}
                         <span className="text-xs font-black uppercase">{theme?.label}</span>
                      </div>
                      {todayShift.shift_type !== 'descanso' && (
                        <span className="text-[11px] font-black mt-1">{todayShift.start_time.slice(0,5)} - {todayShift.end_time.slice(0,5)}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold uppercase opacity-20 italic">No Programado</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-4 rounded-[22px] text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                     <Calendar size={14}/> Calendario
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 rounded-[22px] text-[10px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.05] transition-all">
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
        <div className="bg-white border border-slate-200 rounded-[56px] overflow-hidden shadow-sm">
           <div className="px-12 py-10 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <Clock size={28} className="text-odoo-primary"/>
                 <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.3em]">Auditoría General de Turnos</h3>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-5 px-10 rounded-3xl text-xs font-black uppercase flex items-center gap-4 shadow-2xl shadow-odoo-primary/30 hover:scale-105 transition-all"><Plus size={24}/> Nueva Programación</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-12 py-8">Colaborador</th>
                      <th className="px-12 py-8">Sede / Punto de Venta</th>
                      <th className="px-12 py-8">Fecha</th>
                      <th className="px-12 py-8 text-center">Tipo de Turno</th>
                      <th className="px-12 py-8 text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const theme = SHIFT_THEMES[shift.shift_type];
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-12 py-6 font-black text-slate-800 uppercase text-xs">{shift.employee_name}</td>
                           <td className="px-12 py-6 font-bold text-slate-500 uppercase text-[11px]">{shift.pos_name}</td>
                           <td className="px-12 py-6 font-bold text-slate-600 uppercase text-[11px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'})}
                           </td>
                           <td className="px-12 py-6 text-center">
                              <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase border ${theme?.bg} ${theme?.text} ${theme?.border}`}>
                                 {theme?.label}
                              </span>
                           </td>
                           <td className="px-12 py-6 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar turno?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20}/></button>}</td>
                        </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VISTA CALENDARIO INDIVIDUAL */}
      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => s.employee_id === viewCalendarEmp.id)} 
          onClose={() => setViewCalendarEmp(null)} 
        />
      )}

      {/* MODAL DE PROGRAMACIÓN */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[550px] bg-white rounded-[56px] shadow-2xl flex flex-col overflow-hidden"
           >
              <div className="px-12 py-10 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-odoo-primary rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-odoo-primary/30"><CalendarDays size={32}/></div>
                    <div>
                      <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tighter leading-none tracking-tight">Nueva Programación</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mt-2 tracking-[0.3em]">Asignación de Roles</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all"><X size={28}/></button>
              </div>
              
              <div className="p-12 space-y-8 bg-white overflow-y-auto custom-scrollbar max-h-[70vh]">
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Colaborador</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-odoo-primary/5 transition-all">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Desde</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Hasta</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Turno Base</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-xs font-black uppercase text-slate-700 outline-none">
                         <option value="mañana">☀ TURNO MAÑANA</option>
                         <option value="tarde">🌆 TURNO TARDE</option>
                         <option value="completo">⚡ JORNADA COMPLETA</option>
                         <option value="noche">🌙 TURNO NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Sede Asignada</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-xs font-black uppercase text-slate-700 outline-none">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Hora Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Hora Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black text-slate-700 outline-none" defaultValue="14:00"/>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                       <Coffee size={16} className="text-emerald-500"/> Definir Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-3">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-5 rounded-[24px] text-[10px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-200 scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                            }`}
                         >
                           {day.label}
                           {restDays.includes(day.value) && <div className="w-1.5 h-1.5 bg-white rounded-full mt-1"></div>}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="px-12 py-10 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-6 rounded-[32px] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-odoo-primary/30 flex items-center justify-center gap-5 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={28} className="animate-spin"/> : <Check size={28}/>}
                    <span>{dbLoading ? 'Generando Horarios...' : 'Publicar Programación'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
