import { FiSearch } from 'react-icons/fi';
export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-9 py-2 text-sm w-full sm:w-64" />
    </div>
  );
}