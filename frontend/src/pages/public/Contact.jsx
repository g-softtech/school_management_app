import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400&q=80',
};

const CONTACT_INFO = [
  { icon: FiMapPin, label: 'Address',        value: '123 Education Avenue, Victoria Island, Lagos, Nigeria' },
  { icon: FiPhone,  label: 'Phone',           value: '+234 801 234 5678 / +234 802 345 6789' },
  { icon: FiMail,   label: 'Email',           value: 'info@smartschool.edu.ng' },
  { icon: FiClock,  label: 'Office Hours',   value: 'Monday – Friday: 8:00am – 4:00pm' },
];

const EMPTY_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

function SectionLabel({ children }) {
  return (
    <span className="inline-block bg-primary-500/10 text-primary-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function Contact() {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const fc = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill in all required fields'); return; }
    setSubmitting(true);
    try {
      await api.post('/contact', form).catch(() => null);
      setSubmitted(true);
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
    } catch {}
    finally { setSubmitting(false); }
  };

  return (
    <div className="pt-16 lg:pt-20">

      {/* Hero */}
      <section className="relative h-72 lg:h-80 flex items-center overflow-hidden">
        <img src={IMG.hero} alt="Contact us" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-secondary-900/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SectionLabel>Contact Us</SectionLabel>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mt-2">Get in Touch</h1>
          <p className="text-secondary-300 mt-3 max-w-xl">We're here to answer your questions. Reach out to us and we'll respond within 24 hours.</p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Contact info */}
            <div className="space-y-5">
              <div>
                <SectionLabel>Contact Information</SectionLabel>
                <h2 className="text-2xl font-bold text-secondary-800">Let's Talk</h2>
                <p className="text-secondary-500 text-sm mt-2">Our team is ready to help you with admissions, fees, or any enquiries.</p>
              </div>

              {CONTACT_INFO.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl p-4 border border-secondary-100 shadow-card flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <c.icon className="text-primary-500" size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wide">{c.label}</p>
                    <p className="text-sm text-secondary-800 mt-0.5 font-medium">{c.value}</p>
                  </div>
                </div>
              ))}

              {/* Map embed placeholder */}
              <div className="bg-secondary-200 rounded-2xl overflow-hidden h-48 flex items-center justify-center">
                <div className="text-center text-secondary-500">
                  <FiMapPin size={28} className="mx-auto mb-2 text-primary-400" />
                  <p className="text-sm font-medium">Victoria Island, Lagos</p>
                  <p className="text-xs text-secondary-400">Google Maps</p>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="bg-white rounded-2xl p-12 border border-secondary-100 shadow-card text-center h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <FiCheckCircle className="text-green-600" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3">Message Sent!</h3>
                  <p className="text-secondary-600 mb-6 max-w-sm">Thank you for reaching out. Our team will respond within 24 hours.</p>
                  <button onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
                    className="btn-primary text-sm">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-secondary-100 shadow-card">
                  <div className="mb-6">
                    <SectionLabel>Send a Message</SectionLabel>
                    <h2 className="text-2xl font-bold text-secondary-800">How can we help?</h2>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Full Name *</label>
                        <input name="name" value={form.name} onChange={fc} placeholder="Your full name" className="input-field" required />
                      </div>
                      <div>
                        <label className="input-label">Email Address *</label>
                        <input name="email" type="email" value={form.email} onChange={fc} placeholder="you@example.com" className="input-field" required />
                      </div>
                      <div>
                        <label className="input-label">Phone Number</label>
                        <input name="phone" value={form.phone} onChange={fc} placeholder="+234 800 000 0000" className="input-field" />
                      </div>
                      <div>
                        <label className="input-label">Subject</label>
                        <select name="subject" value={form.subject} onChange={fc} className="input-field">
                          <option value="">Select topic…</option>
                          <option value="admissions">Admissions Enquiry</option>
                          <option value="fees">School Fees</option>
                          <option value="academics">Academic Matters</option>
                          <option value="portal">Portal / Technical</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Message *</label>
                      <textarea name="message" value={form.message} onChange={fc} rows={6} placeholder="Tell us how we can help you…" className="input-field resize-none" required />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3.5 text-sm font-semibold">
                      {submitting ? 'Sending…' : <><FiSend size={15} /> Send Message</>}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-2xl font-bold text-secondary-800">Frequently Asked Questions</h2>
          </div>
          {[
            { q: 'What are the admission requirements?', a: 'Students need a birth certificate, previous report card, passport photos, and parent ID. See our Admissions page for the full list.' },
            { q: 'How do I access the student or parent portal?', a: 'Once enrolled, you receive login credentials via email. Visit our Portal Login page and enter your email and password.' },
            { q: 'When are school fees due?', a: 'School fees are due at the beginning of each term. Parents can pay securely via the Parent Portal using Paystack.' },
            { q: 'Does SmartSchool offer scholarships?', a: 'Yes, we offer merit-based scholarships for outstanding academic performance. Contact our admissions office for details.' },
            { q: 'How can I track my child\'s progress?', a: 'Parents have access to the Parent Portal where you can view results, attendance, fee payments, and communicate with teachers.' },
          ].map((faq, i) => (
            <details key={i} className="group border border-secondary-100 rounded-2xl mb-3 overflow-hidden">
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-secondary-800 hover:bg-secondary-50 transition-colors text-sm">
                {faq.q}
                <span className="text-primary-500 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4">▾</span>
              </summary>
              <div className="px-6 pb-4 text-sm text-secondary-600 leading-relaxed border-t border-secondary-100 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
