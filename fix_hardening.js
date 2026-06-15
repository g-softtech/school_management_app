const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if(fs.statSync(p).isDirectory()) walk(p);
    else if(p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf-8');
      let orig = c;

      // Add min-w-0 to flex-1 items to prevent text overflow
      c = c.replace(/className="([^"]*)flex-1([^"]*)"/g, (m, p1, p2) => {
        if(p1.includes('min-w-0') || p2.includes('min-w-0')) return m;
        return `className="${p1}flex-1 min-w-0${p2}"`;
      });

      // Fix charts ResponsiveContainer height to be dynamic
      c = c.replace(/<ResponsiveContainer\s+width="100%"\s+height=\{[0-9]+\}\s*>/g, '<ResponsiveContainer width="100%" height={280} minWidth={300}>');

      // Eliminate rigid fixed widths > 300px on classes
      c = c.replace(/w-\[([3-9]\d{2,}|[1-9]\d{3,})px\]/g, 'w-full max-w-full');
      c = c.replace(/min-w-\[([3-9]\d{2,}|[1-9]\d{3,})px\]/g, 'min-w-0');

      if(c !== orig) { 
        fs.writeFileSync(p, c); 
        console.log('Fixed', p); 
      }
    }
  });
}
walk('c:/projects/school_app/frontend/src');
