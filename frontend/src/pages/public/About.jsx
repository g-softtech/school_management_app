import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiAward, FiUsers, FiTarget, FiHeart } from 'react-icons/fi';

const IMG = {
  hero:    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1400&q=80',
  staff:   'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80',
  library: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
};

const VALUES = [
  { icon: FiAward,  title: 'Academic Excellence', desc: 'We set high standards and support every student in reaching their full academic potential.' },
  { icon: FiHeart,  title: 'Character & Integrity', desc: 'We cultivate honesty, respect, and responsibility in every aspect of school life.' },
  { icon: FiUsers,  title: 'Community & Inclusion', desc: 'We celebrate diversity and build a supportive community where everyone belongs.' },
  { icon: FiTarget, title: 'Innovation & Growth', desc: 'We embrace technology and new ideas to continuously improve our educational delivery.' },
];

const TEAM = [
  { name: 'Dr. Abiodun Adeleke',    role: 'Principal',              initials: 'AA' },
  { name: 'Mrs. Ngozi Chukwuemeka', role: 'Vice Principal (Acad.)', initials: 'NC' },
  { name: 'Mr. Tunde Fashola',      role: 'Head of Sciences',       initials: 'TF' },
  { name: 'Mrs. Amaka Eze',         role: 'Head of Humanities',     initials: 'AE' },
  { name: 'Mr. Kelechi Obiora',     role: 'ICT Coordinator',        initials: 'KO' },
  { name: 'Mrs. Fatima Bello',      role: 'Counsellor',             initials: 'FB' },
];

function SectionLabel({ children }) {
  return (
    <span className="inline-block bg-primary-500/10 text-primary-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function About() {
  return (
    <div className="pt-16 lg:pt-20">

      {/* Hero */}
      <section className="relative h-72 lg:h-96 flex items-center overflow-hidden">
        <img src={IMG.hero} alt="School" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-secondary-900/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SectionLabel>About Us</SectionLabel>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mt-2">Our Story & Mission</h1>
          <p className="text-secondary-300 mt-3 max-w-xl">Building the next generation of African leaders through excellence in education.</p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <SectionLabel>Who We Are</SectionLabel>
              <h2 className="text-3xl font-bold text-secondary-800 mb-5">15 Years of Shaping Futures</h2>
              <p className="text-secondary-600 leading-relaxed mb-4">
                SmartSchool was founded in 2009 with a singular vision: to provide African students with the quality of education that opens doors to global opportunities. Over 15 years, we have grown from a small pioneer school into one of the most respected educational institutions in the region.
              </p>
              <p className="text-secondary-600 leading-relaxed mb-6">
                Our approach blends rigorous academics with character formation, digital literacy, and extracurricular development — producing graduates who are confident, competent, and compassionate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
                  <p className="text-2xl font-bold text-primary-600 mb-1">🎯 Mission</p>
                  <p className="text-sm text-secondary-600">To provide quality, holistic education that empowers African youth.</p>
                </div>
                <div className="bg-secondary-50 rounded-2xl p-4 border border-secondary-200">
                  <p className="text-2xl font-bold text-secondary-700 mb-1">🔭 Vision</p>
                  <p className="text-sm text-secondary-600">To be Africa's leading centre of educational innovation and excellence.</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img src={IMG.library} alt="Library" className="w-full rounded-3xl object-cover shadow-card-lg" style={{ height: '400px' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionLabel>Our Values</SectionLabel>
            <h2 className="text-3xl font-bold text-secondary-800">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-secondary-100 hover:border-primary-200 hover:shadow-card-md transition-all duration-300 text-center group">
                <div className="w-14 h-14 bg-primary-50 group-hover:bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                  <v.icon size={24} className="text-primary-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-secondary-800 mb-2">{v.title}</h3>
                <p className="text-sm text-secondary-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionLabel>Our Leadership</SectionLabel>
            <h2 className="text-3xl font-bold text-secondary-800">Meet the Team</h2>
            <p className="text-secondary-500 mt-3 max-w-lg mx-auto">Our experienced leadership team is dedicated to academic excellence and student wellbeing.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {TEAM.map((m) => (
              <div key={m.name} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary-700 to-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:from-primary-500 group-hover:to-primary-600 transition-all duration-300 shadow-card">
                  <span className="text-white font-bold text-lg">{m.initials}</span>
                </div>
                <p className="font-semibold text-secondary-800 text-sm leading-tight">{m.name}</p>
                <p className="text-xs text-secondary-400 mt-0.5">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditation */}
      <section className="py-16 bg-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-secondary-400 text-sm uppercase tracking-widest mb-6 font-semibold">Accreditations & Affiliations</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['WAEC Accredited','NECO Certified','NUC Affiliated','State Ministry Approved','ISO 9001 Compliant'].map((a) => (
              <div key={a} className="flex items-center gap-2 bg-secondary-700 text-secondary-300 px-5 py-2.5 rounded-xl text-sm font-medium">
                <FiCheckCircle className="text-primary-400" size={14} /> {a}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white text-center px-4">
        <h2 className="text-3xl font-bold text-secondary-800 mb-4">Ready to be Part of Our Story?</h2>
        <p className="text-secondary-500 mb-8 max-w-lg mx-auto">Join thousands of students who have found their academic home at SmartSchool.</p>
        <Link to="/admissions" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-4 rounded-xl transition-all text-sm">
          Apply Now <FiArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
