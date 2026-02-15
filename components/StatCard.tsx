
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
}

export const OdooStatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, onClick, active }) => (
  <div 
    onClick={onClick}
    className={`flex-1 min-w-[200px] bg-white border ${active ? 'border-odoo-primary ring-1 ring-odoo-primary/20' : 'border-gray-200'} p-4 rounded shadow-sm hover:shadow-md transition-all cursor-pointer group`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded bg-gray-50 ${active ? 'text-odoo-primary' : 'text-gray-500 group-hover:text-odoo-primary'}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{title}</p>
        <h3 className="text-xl font-black text-odoo-primary">{value}</h3>
      </div>
    </div>
  </div>
);
