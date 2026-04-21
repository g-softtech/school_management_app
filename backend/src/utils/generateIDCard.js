const PDFDocument = require('pdfkit');
const bwipjs      = require('bwip-js');

var generateIDCard = async function(student, res) {
  var doc = new PDFDocument({ size: [243, 153], margin: 10 }); // CR80 card size in points

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="id-card-' + student.admissionNumber + '.pdf"');
  doc.pipe(res);

  // Background
  doc.rect(0, 0, 243, 153).fill('#1e40af');
  doc.rect(0, 0, 243, 35).fill('#1e3a8a');

  // School name
  doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
    .text('SMARTSCHOOL', 10, 10, { width: 223, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#bfdbfe')
    .text('Student Identity Card', 10, 22, { width: 223, align: 'center' });

  // White content area
  doc.rect(10, 40, 223, 103).fill('white').stroke();

  // Student details
  var name    = student.userId ? student.userId.name    : 'N/A';
  var email   = student.userId ? student.userId.email   : '';
  var className = student.classId ? (student.classId.name + (student.classId.section ? ' ' + student.classId.section : '')) : 'N/A';

  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10)
    .text(name, 80, 48, { width: 150 });
  doc.font('Helvetica').fontSize(7).fillColor('#64748b')
    .text('Class: ' + className, 80, 61)
    .text('Adm. No: ' + student.admissionNumber, 80, 71)
    .text('Gender: ' + (student.gender || 'N/A'), 80, 81)
    .text(email, 80, 91, { width: 150 });

  // Generate barcode
  try {
    var png = await bwipjs.toBuffer({
      bcid:    'code128',
      text:    student.admissionNumber,
      scale:   1,
      height:  8,
      includetext: false,
    });
    doc.image(png, 15, 110, { width: 80, height: 25 });
  } catch (e) {
    doc.fillColor('#64748b').fontSize(6).text(student.admissionNumber, 15, 118);
  }

  // Photo placeholder
  doc.rect(12, 42, 60, 60).fill('#e2e8f0').stroke('#cbd5e1');
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
    .text('PHOTO', 12, 68, { width: 60, align: 'center' });

  // Footer
  doc.rect(0, 143, 243, 10).fill('#1e3a8a');
  doc.fillColor('white').fontSize(6)
    .text('www.smartschool.com', 0, 145, { width: 243, align: 'center' });

  doc.end();
};

module.exports = generateIDCard;