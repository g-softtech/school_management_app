export default function StatCard({ title, value, icon: Icon, color = 'primary', trend, sub }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue:    'bg-blue-50 text-blue-600',
    green:   'bg-green-50 text-green-600',
    purple:  'bg-purple-50 text-purple-600',
    red:     'bg-red-50 text-red-600',
    orange:  'bg-orange-50 text-orange-600',
  };
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="min-w-0">
        <p className="text-secondary-500 text-xs font-medium truncate">{title}</p>
        <p className="text-secondary-800 text-2xl font-bold leading-tight">{value ?? '—'}</p>
        {sub  && <p className="text-secondary-400 text-xs mt-0.5">{sub}</p>}
        {trend && <p className={`text-xs mt-0.5 font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</p>}
      </div>
    </div>
  );
}