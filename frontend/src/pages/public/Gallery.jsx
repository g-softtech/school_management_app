import { useState } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1400&q=80',
};

// 20 gallery items using free Unsplash education/Africa themed photos
const GALLERY_ITEMS = [
  { id:1,  category:'classrooms', title:'Interactive Learning Session',    url:'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80' },
  { id:2,  category:'events',     title:'Annual Prize Giving Day',         url:'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80' },
  { id:3,  category:'classrooms', title:'Science Laboratory Practicals',   url:'https://images.unsplash.com/photo-1532094349884-543559822958?w=800&q=80' },
  { id:4,  category:'sports',     title:'Inter-House Sports Competition',  url:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80' },
  { id:5,  category:'classrooms', title:'Library & Reading Centre',        url:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80' },
  { id:6,  category:'events',     title:'Graduation Ceremony 2024',        url:'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80' },
  { id:7,  category:'classrooms', title:'ICT & Computer Science Lab',      url:'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80' },
  { id:8,  category:'sports',     title:'Football Finals',                 url:'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&q=80' },
  { id:9,  category:'events',     title:'Cultural Day Celebration',        url:'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80' },
  { id:10, category:'classrooms', title:'Group Study Session',             url:'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80' },
  { id:11, category:'events',     title:'WAEC Exam Results Celebration',   url:'https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?w=800&q=80' },
  { id:12, category:'sports',     title:'Athletics Day',                   url:'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80' },
  { id:13, category:'classrooms', title:'Art & Creative Expression',       url:'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80' },
  { id:14, category:'events',     title:'Science Fair Exhibition',         url:'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80' },
  { id:15, category:'classrooms', title:'Morning Assembly',                url:'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80' },
  { id:16, category:'sports',     title:'Basketball Championship',         url:'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80' },
];

const CATEGORIES = ['all', 'classrooms', 'events', 'sports'];

function SectionLabel({ children }) {
  return (
    <span className="inline-block bg-primary-500/10 text-primary-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function Gallery() {
  const [active, setActive]   = useState('all');
  const [lightbox, setLightbox] = useState(null); // index in filtered

  const filtered = active === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((g) => g.category === active);

  const prev = () => setLightbox((i) => (i - 1 + filtered.length) % filtered.length);
  const next = () => setLightbox((i) => (i + 1) % filtered.length);

  return (
    <div className="pt-16 lg:pt-20">

      {/* Hero */}
      <section className="relative h-72 lg:h-96 flex items-center overflow-hidden">
        <img src={IMG.hero} alt="Gallery" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-secondary-900/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SectionLabel>Gallery</SectionLabel>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mt-2">Life at SmartSchool</h1>
          <p className="text-secondary-300 mt-3 max-w-xl">A glimpse into our vibrant school community — in the classroom, on the field, and at our events.</p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="py-12 bg-white sticky top-16 lg:top-20 z-10 border-b border-secondary-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${
                active === cat
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {cat === 'all' ? 'All Photos' : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-14 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className="break-inside-avoid rounded-2xl overflow-hidden cursor-pointer group relative shadow-card hover:shadow-card-lg transition-all duration-300"
                onClick={() => setLightbox(idx)}
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-secondary-900/0 group-hover:bg-secondary-900/50 transition-all duration-300 flex items-end">
                  <p className="text-white text-sm font-medium p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-secondary-400 py-20">No photos in this category yet.</p>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
            <FiX size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
            <FiChevronLeft size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
            <FiChevronRight size={20} />
          </button>

          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={filtered[lightbox].url}
              alt={filtered[lightbox].title}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <div className="text-center mt-4">
              <p className="text-white font-semibold">{filtered[lightbox].title}</p>
              <p className="text-secondary-400 text-xs mt-1">{lightbox + 1} of {filtered.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
