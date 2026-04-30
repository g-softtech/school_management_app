import { Link } from 'react-router-dom';
import { FiArrowRight, FiBook, FiMonitor, FiMusic, FiActivity, FiClock, FiAward } from 'react-icons/fi';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1400&q=80',
  lab:  'https://images.unsplash.com/photo-1532094349884-543559822958?w=800&q=80',
};

const LEVELS = [
  {
    level: 'Nursery & Primary',
    grades: 'Ages 3 – 11',
    color: 'from-green-400 to-green-600',
    desc: 'A nurturing foundation that builds literacy, numeracy, and social skills through play and structured learning.',
    subjects: ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts'],
  },
  {
    level: 'Junior Secondary',
    grades: 'JSS 1 – JSS 3',
    color: 'from-blue-400 to-blue-600',
    desc: 'Broadening knowledge across STEM, humanities, and arts as students prepare for the BECE examination.',
    subjects: ['Mathematics','English','Basic Technology','Business Studies','Agricultural Science','CRK/IRK','French'],
  },
  {
    level: 'Senior Secondary',
    grades: 'SS 1 – SS 3',
    color: 'from-primary-400 to-primary-600',
    desc: 'Specialised study tracks preparing students for WAEC, NECO, and JAMB — the gateway to university.',
    subjects: ['Further Mathematics','Physics','Chemistry','Biology','Economics','Literature','Government','Geography'],
  },
];

const EXTRAS = [
  { icon: FiMonitor,  title: 'ICT & Coding',     desc: 'Computer labs with modern hardware and software training from JSS 1.' },
  { icon: FiMusic,    title: 'Arts & Culture',    desc: 'Music, drama, fine art and cultural performances enrich school life.' },
  { icon: FiActivity, title: 'Sports & Health',   desc: 'Football, athletics, basketball and physical education for all.' },
  { icon: FiBook,     title: 'Library & Research',desc: 'A well-stocked library plus digital resources for deeper learning.' },
];

function SectionLabel({ children }) {
  return (
    <span className="inline-block bg-primary-500/10 text-primary-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function Academics() {
  return (
    <div className="pt-16 lg:pt-20">

      {/* Hero */}
      <section className="relative h-72 lg:h-96 flex items-center overflow-hidden">
        <img src={IMG.hero} alt="Books" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-secondary-900/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SectionLabel>Academics</SectionLabel>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mt-2">Our Academic Programmes</h1>
          <p className="text-secondary-300 mt-3 max-w-xl">Rigorous, relevant, and future-focused education for every stage of a child's development.</p>
        </div>
      </section>

      {/* School Levels */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionLabel>School Structure</SectionLabel>
            <h2 className="text-3xl font-bold text-secondary-800">Three Levels of Excellence</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {LEVELS.map((l) => (
              <div key={l.level} className="rounded-3xl border border-secondary-100 overflow-hidden hover:shadow-card-lg transition-all duration-300">
                <div className={`bg-gradient-to-br ${l.color} p-6 text-white`}>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">{l.grades}</p>
                  <h3 className="text-xl font-bold">{l.level}</h3>
                </div>
                <div className="p-6 bg-white">
                  <p className="text-sm text-secondary-600 leading-relaxed mb-4">{l.desc}</p>
                  <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">Core Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {l.subjects.map((s) => (
                      <span key={s} className="text-xs bg-secondary-100 text-secondary-700 px-3 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timetable snapshot */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <SectionLabel>Daily Schedule</SectionLabel>
              <h2 className="text-3xl font-bold text-secondary-800 mb-5">A Structured Day for Maximum Learning</h2>
              <div className="space-y-3">
                {[
                  { time: '7:30 AM',  label: 'Morning Assembly & Devotion' },
                  { time: '8:00 AM',  label: 'First Lesson Period' },
                  { time: '10:00 AM', label: 'Short Break' },
                  { time: '10:20 AM', label: 'Lesson Continues' },
                  { time: '12:30 PM', label: 'Lunch Break' },
                  { time: '1:10 PM',  label: 'Afternoon Sessions' },
                  { time: '3:00 PM',  label: 'Extra-Curricular Activities' },
                  { time: '4:00 PM',  label: 'Dismissal' },
                ].map((item) => (
                  <div key={item.time} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-secondary-100">
                    <div className="flex items-center gap-2 text-primary-500 w-24 flex-shrink-0">
                      <FiClock size={14} />
                      <span className="text-xs font-bold">{item.time}</span>
                    </div>
                    <p className="text-sm text-secondary-700">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img src={IMG.lab} alt="Science lab" className="w-full rounded-3xl object-cover shadow-card-lg" style={{ height: '480px' }} />
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-card-lg p-4 hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <FiAward className="text-primary-500" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-500">2024 WAEC</p>
                    <p className="font-bold text-secondary-800">98% Pass Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Extracurriculars */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionLabel>Beyond the Classroom</SectionLabel>
            <h2 className="text-3xl font-bold text-secondary-800">Extracurricular Activities</h2>
            <p className="text-secondary-500 mt-3 max-w-xl mx-auto">We believe in developing the whole child — academically, physically, and creatively.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXTRAS.map((e) => (
              <div key={e.title} className="text-center p-6 rounded-2xl border border-secondary-100 hover:border-primary-200 hover:shadow-card-md transition-all duration-300 group">
                <div className="w-14 h-14 bg-primary-50 group-hover:bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                  <e.icon size={22} className="text-primary-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-secondary-800 mb-2">{e.title}</h3>
                <p className="text-sm text-secondary-500 leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-500 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Excel Academically?</h2>
        <p className="text-white/80 mb-8 max-w-lg mx-auto">Secure your child's place in a school where academics and character go hand in hand.</p>
        <Link to="/admissions" className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-secondary-50 font-bold px-8 py-4 rounded-xl transition-all text-sm shadow-xl">
          Apply for Admission <FiArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
