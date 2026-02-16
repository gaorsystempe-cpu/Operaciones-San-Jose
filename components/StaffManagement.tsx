
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, Filter, 
  ChevronLeft, ChevronRight, UserPlus, ShieldCheck,
  CheckCircle2, AlertCircle, Briefcase, Mail, Phone,
  MoreVertical, UserCheck, X, RefreshCw
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

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [activeView, setActiveView] = useState<'roster' | 'schedule'>('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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

  const handleAddShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDbLoading(true);
    const formData = new FormData(e.currentTarget);
    const empId = Number(formData.get('employee_id'));
    const posId = Number(formData.get('pos_id'));
    const emp = employees.find(e => e.id === empId);
    const pos = posConfigs.find(p => p.id === posId);

    try {
      await shiftService.createShift({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: posId,
        pos_name: pos?.name || 'Sin Sede',
        date: formData.get('date'),
        shift_type: formData.get('shift_type'),
        start_time: formData.get('start'),
        end_time: formData.get('end'),
        status: 'confirmed',
        created_by: currentUserEmail
      });
      setShowAddShift(false);
      loadShifts();
    } catch (e) {
      alert("Error al guardar en base de datos: " + (e as any).message);
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
      {/* Header UI - Ultra Clean */}
      <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary/10 rounded-2xl text-odoo-primary">
            <Users size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestión Operativa de Personal</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               {(dbLoading || odooLoading) && <RefreshCw size={10} className="animate-spin text-odoo-primary"/>}
               Sincronización Híbrida: Odoo + Supabase
            </p>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setActiveView('roster')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}
          >
            Nómina Odoo
          </button>
          <button 
            onClick={() => setActiveView('schedule')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}
          >
            {isAdmin ? 'Control de Turnos' : 'Mis Horarios'}
          </button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:shadow-xl transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <Briefcase size={80}/>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-xl border border-slate-100">
                   {emp.name.charAt(0)}
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-800 uppercase leading-none">{emp.name}</h3>
                   <p className="text-[10px] font-bold text-odoo-primary uppercase mt-1 tracking-tight">{emp.job_title || 'Colaborador SJS'}</p>
                </div>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-slate-500">
                    <Mail size={14} className="opacity-40" />
                    <span className="text-[11px] font-medium truncate">{emp.work_email || 'No registrado'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-slate-500">
                    <MapPin size={14} className="opacity-40" />
                    <span className="text-[10px] font-black uppercase text-slate-400">{emp.department_id ? emp.department_id[1] : 'Sede Sin Asignar'}</span>
                 </div>
              </div>
              {isAdmin && (
                <div className="mt-6 pt-6 border-t border-slate-50">
                   <button 
                    onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }}
                    className="w-full bg-slate-50 hover:bg-odoo-primary hover:text-white text-slate-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                     <Plus size={14}/> Programar Turno
                   </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
             <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Cronograma Activo en Supabase</h3>
             {isAdmin && (
               <button onClick={() => setShowAddShift(true)} className="o-btn o-btn-primary py-2.5 px-6 rounded-xl text-[10px] font-black flex items-center gap-2">
                 <Plus size={16}/> Nueva Asignación
               </button>
             )}
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                 <tr>
                   <th className="px-8 py-5">Colaborador</th>
                   <th className="px-8 py-5">Sede POS</th>
                   <th className="px-8 py-5">Día</th>
                   <th className="px-8 py-5">Horario</th>
                   <th className="px-8 py-5">Tipo</th>
                   <th className="px-8 py-5"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {shifts.map(shift => (
                   <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="px-8 py-5">
                       <span className="text-xs font-bold text-slate-700 uppercase">{shift.employee_name}</span>
                     </td>
                     <td className="px-8 py-5">
                       <span className="text-[10px] font-black uppercase text-slate-400">{shift.pos_name}</span>
                     </td>
                     <td className="px-8 py-5">
                       <span className="text-xs font-bold text-slate-600 uppercase">{new Date(shift.date).toLocaleDateString('es-PE', {weekday: 'short', day: '2-digit'})}</span>
                     </td>
                     <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}</span>
                     </td>
                     <td className="px-8 py-5">
                       <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${
                         shift.shift_type === 'mañana' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'tarde' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                       {isAdmin && (
                         <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                            <X size={16}/>
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

      {/* Modal - Mismo Estilo Ultra-Clean */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddShift(false)}></div>
           <form onSubmit={handleAddShift} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-fade">
              <div className="p-8 bg-odoo-primary text-white">
                 <h3 className="text-xl font-black uppercase">Nueva Asignación</h3>
                 <p className="text-[10px] font-bold opacity-60 uppercase">Cloud Sync enabled</p>
              </div>
              <div className="p-8 space-y-5">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Colaborador</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Sede Destino</label>
                    <select name="pos_id" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold">
                       {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" name="date" required className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold" defaultValue={new Date().toISOString().split('T')[0]}/>
                    <select name="shift_type" className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold">
                       <option value="mañana">Mañana</option>
                       <option value="tarde">Tarde</option>
                       <option value="completo">Completo</option>
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="time" name="start" required className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold" defaultValue="08:00"/>
                    <input type="time" name="end" required className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold" defaultValue="14:00"/>
                 </div>
                 <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-odoo-primary/20 flex items-center justify-center gap-2">
                    {dbLoading ? <RefreshCw size={14} className="animate-spin"/> : 'Guardar en Supabase'}
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
