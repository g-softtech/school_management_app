const VARIANTS = {
  success: 'bg-green-100 text-green-700',
  danger:  'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info:    'bg-blue-100 text-blue-700',
  gold:    'bg-primary-100 text-primary-700',
  gray:    'bg-secondary-100 text-secondary-600',
  purple:  'bg-purple-100 text-purple-700',
};
export default function Badge({ children, variant = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}