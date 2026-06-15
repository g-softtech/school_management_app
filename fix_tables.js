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

    // We only want to wrap tables that are not already wrapped in .table-wrapper or overflow-x-auto.
    // In JSX, replacing <table> with <div className="overflow-x-auto w-full max-w-full"><table>
    // and </table> with </table></div>
    // This regex is a bit risky but we can try matching `<table` and `</table>`.
    // Wait, replacing all `<table` with `<div className="overflow-x-auto max-w-full"><table`
    // and `</table>` with `</table></div>`
    
    // First, let's see if the file contains `<table`
    if (content.includes('<table')) {
      // Avoid double wrapping if already wrapped
      // We can use a simple replace. But React requires single root or Fragments. 
      // Wrapping a <table> in a <div> inside JSX is usually safe unless it's directly returning it and needs a fragment.
      
      // Let's do a trick: we add the classes directly to the table tag? No, block table is bad.
      
      // Since it's easier to modify the class name:
      // replace `<table className="...` with `<div className="overflow-x-auto w-full"><table className="min-w-[600px] ...`
      
      // Split by `<table`
      const parts = content.split(/<table/);
      if (parts.length > 1) {
        let newContent = parts[0];
        for (let i = 1; i < parts.length; i++) {
          // Check if previous part ends with `<div className="table-wrapper">` or similar
          // If not, we wrap.
          let prevPart = parts[i - 1].trim();
          let wrap = true;
          if (prevPart.endsWith('table-wrapper">') || prevPart.endsWith('overflow-x-auto">')) {
            wrap = false;
          }
          
          if (wrap) {
            newContent += '<div className="overflow-x-auto w-full max-w-full"><table';
          } else {
            newContent += '<table';
          }
          
          // Now find the corresponding </table> and append </div>
          // We can do this by splitting parts[i] by </table>
          let subParts = parts[i].split(/<\/table>/);
          if (subParts.length > 1 && wrap) {
            newContent += subParts[0] + '</table></div>' + subParts.slice(1).join('</table>');
          } else {
            newContent += parts[i];
          }
        }
        content = newContent;
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed tables in', filePath);
      modifiedFiles++;
    }
  }
});

console.log('Total files modified:', modifiedFiles);
