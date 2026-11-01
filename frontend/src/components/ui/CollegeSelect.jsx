import { useApi } from '../../hooks/useApi';

export default function CollegeSelect({ value, onChange, placeholder = 'Any college', className = '' }) {
  const { data } = useApi('/colleges');
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`input ${className}`} aria-label="College">
      <option value="">{placeholder}</option>
      {data?.items.map((college) => (
        <option key={college._id} value={college._id}>
          {college.short ? `${college.short} · ${college.city}` : college.name}
        </option>
      ))}
    </select>
  );
}
