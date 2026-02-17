
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Cabecera compacta */}
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-odoo-primary rounded-xl flex items-center justify-center text-white font-black shadow-lg">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{employee.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Horarios y Descansos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Barra de Navegación y Leyenda */}
        <div className="px-6 py-3 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronLeft size={16}/></button>
            <h4 className="text-[10px] font-black text-slate-700 uppercase min-w-[120px] text-center tracking-widest">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronRight size={16}/></button>
          </div>
          
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-600 border border-emerald-700 shadow-sm"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">TRABAJO</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-400 border border-slate-500 shadow-sm"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">DESCANSO</span>
             </div>
          </div>
        </div>

        {/* Grid de Calendario con Celdas Cuadradas (CAJAS) */}
        <div className="flex-1 p-6 bg-slate-50 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-2 max-w-3xl mx-auto">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-100/50 rounded-xl border border-slate-200/30" />
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
                  className={`relative aspect-square rounded-xl p-2 border-2 transition-all flex flex-col items-center justify-center text-center overflow-hidden shadow-sm ${
                    isToday ? 'ring-4 ring-odoo-primary/30 border-odoo-primary bg-white z-10 scale-[1.05]' : 
                    isWork ? 'bg-emerald-600 border-emerald-700 text-white' :
                    isRest ? 'bg-slate-400 border-slate-500 text-white' :
                    'bg-white border-slate-200 text-slate-300 border-dashed'
                  }`}
                >
                  {/* Número de día arriba a la izquierda */}
                  <div className="absolute top-1 left-2">
                    <span className={`text-[10px] font-black ${isToday ? 'text-odoo-primary' : (isWork || isRest ? 'text-white/60' : 'text-slate-300')}`}>
                      {day}
                    </span>
                  </div>

                  {isToday && (
                    <div className="absolute top-1 right-1">
                       <span className="text-[7px] font-black bg-odoo-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Hoy</span>
                    </div>
                  )}

                  {shift ? (
                    <div className="flex flex-col items-center w-full px-1">
                      {/* ETIQUETA PRINCIPAL */}
                      <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-sm">
                        {isRest ? 'DESCANSO' : 'TRABAJO'}
                      </span>
                      
                      {isWork && (
                        <div className="mt-1 flex flex-col items-center">
                           <div className="flex items-center gap-1 text-[11px] font-black leading-none">
                             <Clock size={10} strokeWidth={3}/> {shift.start_time.slice(0,5)}
                           </div>
                           <p className="text-[7px] font-bold uppercase opacity-80 mt-1 truncate max-w-[80px]">
                             {shift.pos_name}
                           </p>
                        </div>
                      )}

                      {isRest && (
                        <div className="mt-1 opacity-50">
                          <Coffee size={18} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-10">
                       <Briefcase size={16} />
                       <span className="text-[7px] font-black mt-1 uppercase">S/P</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-odoo-primary" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Cajas <span className="text-emerald-600">Verdes</span> = Trabajo | Cajas <span className="text-slate-500">Grises</span> = Descanso
            </p>
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
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade pb-32">
      
      {/* Header Corporativo Dashboard */}
      <div className="bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-odoo-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-odoo-primary/10 transition-all duration-700"></div>
        
        <div className="flex items-center gap-6 z-10">
          <div className="p-4 bg-odoo-primary text-white rounded-2xl shadow-xl shadow-odoo-primary/20">
            <Users size={28}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestión de Staff</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
               <ShieldCheck size={14} className="text-emerald-500"/> Cronogramas San José
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 z-10">
           <button onClick={() => setView('roster')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Fichas Staff</button>
           <button onClick={() => setView('global')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Consolidado</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const isWorking = todayShift && todayShift.shift_type !== 'descanso';
            const isResting = todayShift && todayShift.shift_type === 'descanso';

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/40 transition-all shadow-sm group relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-black text-odoo-primary mb-4 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-300">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-xs font-black text-slate-800 uppercase line-clamp-1 mb-1 tracking-tight">{emp.name}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">{emp.job_title || 'COLABORADOR'}</p>
                
                {/* Status Hoy */}
                <div className={`w-full p-4 rounded-2xl border transition-all ${
                  isWorking ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg' : 
                  isResting ? 'bg-slate-400 border-slate-500 text-white shadow-lg' :
                  'bg-slate-50 border-slate-100 opacity-40'
                }`}>
                  <span className={`text-[8px] font-black uppercase tracking-widest block mb-1 ${isWorking || isResting ? 'text-white/70' : 'text-slate-500'}`}>Estado Hoy</span>
                  {todayShift ? (
                    <div className="flex items-center justify-center gap-2">
                       {isWorking ? <Sun size={14} className="animate-spin-slow"/> : <Coffee size={14}/>}
                       <span className="text-[11px] font-black uppercase tracking-tighter">
                         {isWorking ? todayShift.shift_type : 'DESCANSO'}
                       </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase opacity-30 italic">Sin Programar</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-3 rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <Calendar size={14}/> Ver Mes
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.02] transition-all">
                      Asignar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'global' && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
           <div className="px-10 py-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <Clock size={24} className="text-odoo-primary"/>
                 <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest leading-none">Consolidado General</h3>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 px-8 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 shadow-lg shadow-odoo-primary/20 hover:scale-[1.02] transition-all"><Plus size={18}/> Nuevo Rol</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-6">Staff</th>
                      <th className="px-10 py-6">Punto de Venta</th>
                      <th className="px-10 py-6">Fecha</th>
                      <th className="px-10 py-6 text-center">Estado</th>
                      <th className="px-10 py-6 text-right"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const isRest = shift.shift_type === 'descanso';
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-10 py-5 font-black text-slate-800 uppercase text-[11px]">{shift.employee_name}</td>
                           <td className="px-10 py-5 font-bold text-slate-500 uppercase text-[10px]">{shift.pos_name}</td>
                           <td className="px-10 py-5 font-bold text-slate-600 uppercase text-[10px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short', year: 'numeric'})}
                           </td>
                           <td className="px-10 py-5 text-center">
                              <span className={`text-[9px] font-black px-4 py-2 rounded-full uppercase border shadow-sm ${isRest ? 'bg-slate-400 text-white border-slate-500' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                 {shift.shift_type.toUpperCase()}
                              </span>
                           </td>
                           <td className="px-10 py-5 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar turno?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-2 text-slate-200 hover:text-red-500 transition-all"><X size={18}/></button>}</td>
                        </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VISTA CALENDARIO OPERATIVO */}
      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => s.employee_id === viewCalendarEmp.id)} 
          onClose={() => setViewCalendarEmp(null)} 
        />
      )}

      {/* MODAL DE CARGA DE TURNOS */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[480px] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
           >
              <div className="px-10 py-8 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-odoo-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-odoo-primary/20"><CalendarDays size={24}/></div>
                    <div>
                      <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight leading-none">Programar Rol</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Carga Masiva</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all"><X size={24}/></button>
              </div>
              
              <div className="p-10 space-y-6 bg-white overflow-y-auto custom-scrollbar max-h-[65vh]">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/30">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         <option value="mañana">☀ MAÑANA</option>
                         <option value="tarde">🌆 TARDE</option>
                         <option value="completo">⚡ FULL DAY</option>
                         <option value="noche">🌙 NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="21:00"/>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                       <Coffee size={18} className="text-emerald-500"/> Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-4 rounded-xl text-[9px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                            }`}
                         >
                           {day.label}
                           {restDays.includes(day.value) && <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="px-10 py-8 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-5 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-odoo-primary/20 flex items-center justify-center gap-4 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={24} className="animate-spin"/> : <Check size={24}/>}
                    <span>{dbLoading ? 'Guardando...' : 'Publicar Horarios'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
