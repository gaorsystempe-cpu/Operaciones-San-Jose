
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, User, MoreHorizontal, Info
} from 'lucide-react';
import { Employee, PosConfig, Shift } from '../types';
import { shiftService } from '../services/supabaseService';

// Define the days of the week for the shift planning UI
const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

interface StaffManagementProps {
  isAdmin: boolean;
  employees: Employee[];
  posConfigs: PosConfig[];
  currentUserEmail?: string;
  loading: boolean;
}

// Subcomponente de Calendario Profesional
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
    
    // Ajustar para que lunes sea 0 (opcional, aquí usamos estándar domingo=0)
    return { firstDay, days, year, month };
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' });

  const getShiftForDay = (day: number) => {
    const dateStr = `${daysInMonth.year}-${String(daysInMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.find(s => s.date === dateStr);
  };

  const nextMonth = () => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1));

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end animate-fade">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header del Calendario */}
        <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-odoo-primary/10 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-xl">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase leading-none tracking-tight">{employee.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Calendario de Actividades Mensual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"><X size={24}/></button>
        </div>

        {/* Navegación de Mes */}
        <div className="px-8 py-4 bg-white flex justify-between items-center border-b">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100"><ChevronLeft size={20}/></button>
            <h4 className="text-sm font-black text-slate-700 uppercase min-w-[160px] text-center">{monthName}</h4>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100"><ChevronRight size={20}/></button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full">
              <div className="w-2 h-2 rounded-full bg-odoo-primary"></div>
              <span className="text-[8px] font-black uppercase text-slate-500">Laboral</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full">
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              <span className="text-[8px] font-black uppercase text-slate-500">Libre</span>
            </div>
          </div>
        </div>

        {/* Grid de Calendario */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="bg-slate-50 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
            
            {/* Espacios vacíos al inicio */}
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/50 h-32" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();

              return (
                <div key={day} className={`bg-white h-32 p-3 border-r border-b border-slate-100 transition-colors group relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                  <span className={`text-[11px] font-black ${isToday ? 'bg-odoo-primary text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  
                  {shift && (
                    <div className={`mt-2 p-2 rounded-xl border text-[9px] leading-tight animate-fade ${
                      shift.shift_type === 'descanso' 
                      ? 'bg-slate-50 border-slate-200 text-slate-400 italic' 
                      : 'bg-white border-odoo-primary/20 text-slate-700 shadow-sm'
                    }`}>
                      <p className="font-black uppercase truncate">{shift.shift_type}</p>
                      {shift.shift_type !== 'descanso' && (
                        <>
                          <p className="mt-1 font-bold text-odoo-primary">{shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}</p>
                          <p className="mt-1 opacity-60 flex items-center gap-1"><MapPin size={8}/> {shift.pos_name}</p>
                        </>
                      )}
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

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [view, setView] = useState<'roster' | 'global'>('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewCalendarEmp, setViewCalendarEmp] = useState<Employee | null>(null);

  // Form states
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

  // Cálculo de estado actual para el Roster
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
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-24">
      
      {/* Header Premium */}
      <div className="bg-white p-8 border border-slate-200 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-odoo-primary text-white rounded-3xl shadow-xl shadow-odoo-primary/20">
            <Users size={32}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Gestión de Talento</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {employees.length} Colaboradores
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Boticas San José</span>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-50 p-2 rounded-[24px] border border-slate-200">
           <button onClick={() => setView('roster')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Fichas de Personal</button>
           <button onClick={() => setView('global')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Monitor Global</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[40px] p-8 hover:border-odoo-primary/40 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => setViewCalendarEmp(emp)} className="p-2 bg-slate-100 text-slate-400 hover:text-odoo-primary rounded-xl transition-colors"><Calendar size={20}/></button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-3xl font-black text-odoo-primary mb-6 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-500">
                    {emp.name.charAt(0)}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase line-clamp-1 mb-1">{emp.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{emp.job_title || 'Colaborador'}</p>
                  
                  {/* Status del día */}
                  <div className={`w-full p-4 rounded-3xl border transition-colors ${
                    !todayShift ? 'bg-slate-50 border-slate-100' : 
                    todayShift.shift_type === 'descanso' ? 'bg-slate-900 border-slate-900 text-white' : 
                    'bg-odoo-primary/5 border-odoo-primary/10'
                  }`}>
                    <p className="text-[9px] font-black uppercase opacity-40 mb-1">Actividad de Hoy</p>
                    {todayShift ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase">{todayShift.shift_type}</span>
                        {todayShift.shift_type !== 'descanso' && (
                          <span className="text-[10px] font-bold text-odoo-primary mt-1">{todayShift.start_time.slice(0,5)} - {todayShift.end_time.slice(0,5)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-300 italic">No programado</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <button onClick={() => setViewCalendarEmp(emp)} className="bg-slate-50 text-slate-600 py-3 rounded-2xl text-[9px] font-black uppercase border border-slate-100 hover:bg-white transition-all">Ver Horarios</button>
                    {isAdmin && (
                      <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 rounded-2xl text-[9px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.02] transition-all">Programar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'global' && (
        <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-sm">
           <div className="px-10 py-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <Clock size={24} className="text-odoo-primary"/>
                 <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Monitor Global de Actividad</h3>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 px-8 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 shadow-xl shadow-odoo-primary/20"><Plus size={20}/> Nueva Ficha Masiva</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[11px]">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-6">Colaborador</th>
                      <th className="px-10 py-6">Sede Asignada</th>
                      <th className="px-10 py-6">Fecha</th>
                      <th className="px-10 py-6">Horario</th>
                      <th className="px-10 py-6">Turno</th>
                      <th className="px-10 py-6"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {shifts.map(shift => (
                      <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors group">
                         <td className="px-10 py-5 font-black text-slate-800 uppercase">{shift.employee_name}</td>
                         <td className="px-10 py-5 font-bold text-slate-500 uppercase">{shift.pos_name}</td>
                         <td className="px-10 py-5 font-bold text-slate-600 uppercase">
                            {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short', year: 'numeric'})}
                         </td>
                         <td className="px-10 py-5 font-medium">{shift.shift_type === 'descanso' ? '---' : `${shift.start_time.slice(0,5)} - ${shift.end_time.slice(0,5)}`}</td>
                         <td className="px-10 py-5">
                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${
                              shift.shift_type === 'mañana' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              shift.shift_type === 'tarde' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                              shift.shift_type === 'completo' ? 'bg-odoo-primary text-white' : 
                              shift.shift_type === 'descanso' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                               {shift.shift_type}
                            </span>
                         </td>
                         <td className="px-10 py-5 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={18}/></button>}</td>
                      </tr>
                    ))}
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[500px] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-white/20"
           >
              <div className="px-10 py-8 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-odoo-primary rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-odoo-primary/20"><CalendarDays size={28}/></div>
                    <div>
                      <h3 className="text-xl font-black uppercase text-slate-800 tracking-tighter leading-none">Nueva Ficha</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-[0.2em]">Programación de Turnos</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-colors"><X size={24}/></button>
              </div>
              
              <div className="p-10 space-y-6 bg-white overflow-y-auto custom-scrollbar max-h-[65vh]">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Colaborador</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-odoo-primary/5 transition-all">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Inicio</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Fin</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Turno Base</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-slate-700 outline-none">
                         <option value="mañana">☀ MAÑANA</option>
                         <option value="tarde">🌆 TARDE</option>
                         <option value="completo">⚡ COMPLETO</option>
                         <option value="noche">🌙 NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sede/Punto</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-slate-700 outline-none">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-bold text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-bold text-slate-700 outline-none" defaultValue="14:00"/>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                       Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-4 rounded-[20px] text-[10px] font-black uppercase transition-all border flex items-center justify-center ${
                              restDays.includes(day.value) 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                            }`}
                         >
                           {day.label}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="px-10 py-8 bg-slate-50/80 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-odoo-primary/20 flex items-center justify-center gap-4 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={24} className="animate-spin"/> : <Check size={24}/>}
                    <span>{dbLoading ? 'Registrando...' : 'Confirmar Programación'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
