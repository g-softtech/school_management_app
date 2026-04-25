import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiCpu, FiCopy, FiSave } from 'react-icons/fi';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/helpers';
import { TERMS } from '../../utils/constants';

export default function TeacherAIGenerator() {
  const [form, setForm]         = useState({ subject: '', class: '', topic: '', term: 'first' });
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [subjects, setSubjects] = useState([]);

  // Load subjects on mount
  useState(() => {
    api.get('/subjects', { params: { limit: 50 } }).then((r) => setSubjects(r.data.data)).catch(() => {});
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.class || !form.topic) { toast.error('Please fill all fields'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/ai/lesson-generator', form);
      setResult(res.data.data);
      toast.success('Lesson note generated!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const handleSaveAsNote = async () => {
    if (!result) return;
    setSaving(true);
    toast.info('Go to Lesson Notes to create a note with this content.');
    setSaving(false);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'));
  };

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FiCpu className="text-primary-500" /> AI Lesson Generator</h1>
        <p className="page-subtitle">Generate structured lesson notes automatically using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="card">
          <h3 className="section-title">Generate Lesson Note</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div><label className="input-label">Subject *</label>
              <input className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Mathematics" list="subject-list" required />
              <datalist id="subject-list">
                {subjects.map((s) => <option key={s._id} value={s.name} />)}
              </datalist>
            </div>
            <div><label className="input-label">Class *</label>
              <input className="input-field" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}
                placeholder="e.g. JSS 1" required />
            </div>
            <div><label className="input-label">Topic *</label>
              <input className="input-field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Introduction to Algebra" required />
            </div>
            <div><label className="input-label">Term</label>
              <select className="input-field" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t} term</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Generating with AI...
                </span>
              ) : <><FiCpu size={16} /> Generate Lesson Note</>}
            </button>
          </form>

          {!result && !loading && (
            <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <p className="text-xs text-primary-700 font-medium mb-1">💡 How it works</p>
              <p className="text-xs text-primary-600 leading-relaxed">
                Enter your subject, class and topic. The AI will generate a complete lesson note following the Nigerian curriculum standard including objectives, content, activities and evaluation.
              </p>
              <p className="text-xs text-primary-500 mt-2">Requires GROQ_API_KEY or OPENAI_API_KEY to be set in backend .env</p>
            </div>
          )}
        </div>

        {/* Generated result */}
        <div className="card overflow-y-auto max-h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Generated Lesson Note</h3>
            {result && (
              <div className="flex gap-2">
                <button onClick={handleCopy} className="btn-secondary py-1.5 text-xs"><FiCopy size={13} />Copy</button>
                <button onClick={handleSaveAsNote} disabled={saving} className="btn-primary py-1.5 text-xs"><FiSave size={13} />Use Note</button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-secondary-400 text-sm">AI is generating your lesson note...</p>
            </div>
          )}

          {!loading && !result && (
            <div className="flex items-center justify-center py-16 text-secondary-300 text-sm">
              Generated lesson note will appear here
            </div>
          )}

          {result && (
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-primary-50 rounded-xl">
                <p className="font-bold text-primary-800 text-base">{result.topic}</p>
                {result.duration && <p className="text-xs text-primary-600 mt-1">Duration: {result.duration}</p>}
              </div>

              {result.objectives?.length > 0 && (
                <Section title="Learning Objectives">
                  <ul className="space-y-1">
                    {result.objectives.map((o, i) => <li key={i} className="flex gap-2 text-secondary-700"><span className="text-primary-500 font-bold">•</span>{o}</li>)}
                  </ul>
                </Section>
              )}

              {result.materials?.length > 0 && (
                <Section title="Materials Needed">
                  <div className="flex flex-wrap gap-2">
                    {result.materials.map((m, i) => <span key={i} className="bg-secondary-100 text-secondary-600 text-xs px-2.5 py-1 rounded-full">{m}</span>)}
                  </div>
                </Section>
              )}

              {result.introduction && (
                <Section title="Introduction">
                  <p className="text-secondary-700 leading-relaxed">{result.introduction}</p>
                </Section>
              )}

              {result.mainContent?.length > 0 && (
                <Section title="Main Content">
                  {result.mainContent.map((c, i) => (
                    <div key={i} className="mb-3 p-3 bg-secondary-50 rounded-xl">
                      <p className="font-semibold text-secondary-800 mb-1">{c.subtopic}</p>
                      <p className="text-secondary-600 text-xs leading-relaxed">{c.explanation}</p>
                      {c.examples?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-secondary-500">Examples:</p>
                          {c.examples.map((ex, j) => <p key={j} className="text-xs text-secondary-600 mt-0.5">• {ex}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {result.classActivity && (
                <Section title="Class Activity">
                  <p className="text-secondary-700 leading-relaxed">{result.classActivity}</p>
                </Section>
              )}

              {result.assignment && (
                <Section title="Assignment">
                  <p className="text-secondary-700 leading-relaxed p-3 bg-yellow-50 rounded-xl border border-yellow-100">{result.assignment}</p>
                </Section>
              )}

              {result.evaluation?.length > 0 && (
                <Section title="Evaluation Questions">
                  <ol className="space-y-1 list-decimal list-inside">
                    {result.evaluation.map((q, i) => <li key={i} className="text-secondary-700">{q}</li>)}
                  </ol>
                </Section>
              )}

              {result.conclusion && (
                <Section title="Conclusion">
                  <p className="text-secondary-700 leading-relaxed">{result.conclusion}</p>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}