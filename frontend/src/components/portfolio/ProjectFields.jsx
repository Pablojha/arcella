import { PROJECT_CATEGORIES, SOFTWARE } from '../../lib/constants';
import Field from '../ui/Field';
import TagInput from '../ui/TagInput';

/** Title, category, year, site, tools and description; shared by the new-project page and the editor. */
export default function ProjectFields({ form, set }) {
  const text = (key) => (event) => set(key)(event.target.value);
  return (
    <>
      <Field label="Project title">
        <input value={form.title} onChange={text('title')} required maxLength={100} className="input" placeholder="Riverfront public library" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={form.category} onChange={text('category')} className="input">
            {PROJECT_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input type="number" value={form.year} onChange={text('year')} min={1950} max={2100} className="input" />
        </Field>
      </div>
      <Field label="Site">
        <input value={form.site} onChange={text('site')} maxLength={100} className="input" placeholder="Pune, Maharashtra" />
      </Field>
      <Field as="div" label="Tools used">
        <TagInput value={form.tools} onChange={set('tools')} suggestions={SOFTWARE} max={15} placeholder="Revit, Rhino, hand drafting…" />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={text('description')} rows={5} maxLength={3000} className="input resize-none" placeholder="Brief, concept, key moves, what you learned" />
      </Field>
    </>
  );
}
