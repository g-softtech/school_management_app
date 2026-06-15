const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

walkDir('c:/projects/school_app/frontend/src', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Convert fixed multi-column grids to stack vertically on mobile
    content = content.replace(/className="([^"]*)grid-cols-2([^"]*)"/g, (match, p1, p2) => {
      if (p1.includes('sm:') || p1.includes('md:') || p1.includes('lg:')) return match;
      if (p1.includes('grid-cols-')) return match;
      return `className="${p1}grid-cols-1 sm:grid-cols-2${p2}"`;
    });
    
    content = content.replace(/className="([^"]*)grid-cols-3([^"]*)"/g, (match, p1, p2) => {
      if (p1.includes('sm:') || p1.includes('md:') || p1.includes('lg:')) return match;
      if (p1.includes('grid-cols-')) return match;
      return `className="${p1}grid-cols-1 sm:grid-cols-3${p2}"`;
    });
    
    content = content.replace(/className="([^"]*)grid-cols-4([^"]*)"/g, (match, p1, p2) => {
      if (p1.includes('sm:') || p1.includes('md:') || p1.includes('lg:')) return match;
      if (p1.includes('grid-cols-')) return match;
      return `className="${p1}grid-cols-1 sm:grid-cols-2 lg:grid-cols-4${p2}"`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed grids in', filePath);
      modifiedFiles++;
    }
  }
});

console.log('Total files modified:', modifiedFiles);
