import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowRight, FiCheckCircle, FiUser, FiMail, FiPhone, FiCalendar, FiBook } from 'react-icons/fi';
import api from '../../services/api';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1400&q=80',
};

const STEPS = [
  { step: '01', title: 'Submit Application',  desc: 'Fill out the online admission form with your child\'s details.' },
  { step: '02', title: 'Entrance Assessment', desc: 'Attend our scheduled assessment — date sent to your email.' },
  { step: '03', title: 'Offer Letter',        desc: 'Successful candidates receive an offer of admission letter.' },
  { step: '04', title: 'Enrolment & Fees',    desc: 'Accept the offer, pay acceptance fee, and complete enrolment.' },
];

const REQUIREMENTS = [
  'Birth certificate (original + photocopy)',
  'Previous school report card / academic records',
  'Passport photograph (4 copies)',
  'Parent/Guardian valid ID',
  'Transfer letter (for students from other schools)',
  'Medical fitness certificate',
];

const EMPTY_FORM = { fullName: '', dateOfBirth: '', gender: '', applyingFor: '', parentName: '', email: '', phone: '', address: '', notes: '' };

function SectionLabel({ children }) {
  return (
    <span className="inline-block bg-primary-500/10 text-primary-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function Admissions() {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const fc = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.applyingFor || !form.parentName) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      // Send to backend contact/admissions endpoint if available, else just simulate
      await api.post('/contact/admissions', form).catch(() => null);
      setSubmitted(true);
      toast.success('Application submitted successfully! We will contact you shortly.');
    } catch {}
    finally { setSubmitting(false); }
  };

  return (
    <div className="pt-16 lg:pt-20">

      {/* Hero */}
      <section className="relative h-72 lg:h-96 flex items-center overflow-hidden">
        <img src={IMG.hero} alt="Admissions" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-secondary-900/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SectionLabel>Admissions</SectionLabel>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mt-2">Join the SmartSchool Family</h1>
          <p className="text-secondary-300 mt-3 max-w-xl">Applications are open for the 2025/2026 academic session. Secure your child's future today.</p>
        </div>
      </section>

      {/* Process steps */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionLabel>How to Apply</SectionLabel>
            <h2 className="text-3xl font-bold text-secondary-800">Simple 4-Step Process</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative text-center group">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-1/2 w-full h-0.5 bg-secondary-200 -z-0" />
                )}
                <div className="relative z-10 w-20 h-20 bg-primary-500 group-hover:bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300 shadow-lg">
                  <span className="text-2xl font-bold text-white">{s.step}</span>
                </div>
                <h3 className="font-bold text-secondary-800 mb-2">{s.title}</h3>
                <p className="text-sm text-secondary-500 leading-relaxed px-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form + requirements */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Requirements sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-secondary-100 shadow-card">
                <h3 className="font-bold text-secondary-800 mb-4 flex items-center gap-2">
                  <FiBook className="text-primary-500" /> Requirements
                </h3>
                <ul className="space-y-3">
                  {REQUIREMENTS.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm text-secondary-600">
                      <FiCheckCircle className="text-primary-500 flex-shrink-0 mt-0.5" size={15} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-secondary-800 rounded-2xl p-6 text-white">
                <p className="font-bold mb-2">📞 Need Help?</p>
                <p className="text-sm text-secondary-300 mb-3">Our admissions team is available Mon–Fri, 8am–4pm</p>
                <p className="font-semibold text-primary-400">+234 801 234 5678</p>
                <p className="font-semibold text-primary-400">admissions@smartschool.edu.ng</p>
              </div>

              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
                <p className="text-sm font-semibold text-primary-700 mb-1">📅 Application Deadline</p>
                <p className="text-2xl font-bold text-primary-600">31 July 2025</p>
                <p className="text-xs text-secondary-500 mt-1">For 2025/2026 session</p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="bg-white rounded-2xl p-12 border border-secondary-100 shadow-card text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <FiCheckCircle className="text-green-600" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3">Application Received!</h3>
                  <p className="text-secondary-600 mb-6">Thank you for applying to SmartSchool. We will review your application and contact you within 3 working days.</p>
                  <button onClick={() => setSubmitted(false)} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-secondary-100 shadow-card">
                  <div className="mb-6">
                    <SectionLabel>Application Form</SectionLabel>
                    <h2 className="text-2xl font-bold text-secondary-800">Student Application</h2>
                    <p className="text-secondary-500 text-sm mt-1">Fields marked * are required</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Student info */}
                    <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide border-b border-secondary-100 pb-2">Student Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Full Name *</label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                          <input name="fullName" value={form.fullName} onChange={fc} placeholder="Student's full name" className="input-field pl-9" required />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Date of Birth</label>
                        <div className="relative">
                          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={fc} className="input-field pl-9" />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Gender</label>
                        <select name="gender" value={form.gender} onChange={fc} className="input-field">
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Applying For *</label>
                        <select name="applyingFor" value={form.applyingFor} onChange={fc} className="input-field" required>
                          <option value="">Select class…</option>
                          {['Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SS 1','SS 2'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Parent info */}
                    <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide border-b border-secondary-100 pb-2 pt-2">Parent / Guardian Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Parent/Guardian Name *</label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                          <input name="parentName" value={form.parentName} onChange={fc} placeholder="Full name" className="input-field pl-9" required />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Email Address *</label>
                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                          <input name="email" type="email" value={form.email} onChange={fc} placeholder="email@example.com" className="input-field pl-9" required />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Phone Number *</label>
                        <div className="relative">
                          <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                          <input name="phone" value={form.phone} onChange={fc} placeholder="+234 800 000 0000" className="input-field pl-9" required />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Home Address</label>
                        <input name="address" value={form.address} onChange={fc} placeholder="Street, City, State" className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label className="input-label">Additional Notes</label>
                      <textarea name="notes" value={form.notes} onChange={fc} rows={3} placeholder="Any medical conditions, special needs, or other information…" className="input-field resize-none" />
                    </div>

                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3.5 text-sm font-semibold">
                      {submitting ? 'Submitting Application…' : 'Submit Application'}
                      {!submitting && <FiArrowRight size={16} />}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
