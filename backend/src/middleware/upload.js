const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');
const ApiError = require('../utils/ApiError');

// Allowed file types
const ALLOWED_TYPES = {
  documents: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'],
  images:    ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

const ALL_ALLOWED = [...ALLOWED_TYPES.documents, ...ALLOWED_TYPES.images];

// Storage factory — different destination per upload type
function makeStorage(destination) {
  return multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, path.join(__dirname, '../uploads/' + destination));
    },
    filename: function(req, file, cb) {
      // Unique filename: timestamp + random hex + original extension
      var ext    = path.extname(file.originalname).toLowerCase();
      var unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
      cb(null, unique + ext);
    },
  });
}

// File type filter
function fileFilter(req, file, cb) {
  var ext = path.extname(file.originalname).toLowerCase();
  if (ALL_ALLOWED.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'File type not allowed. Accepted: PDF, DOC, DOCX, PPT, XLS, JPG, PNG'), false);
  }
}

// Upload instances for each category
var lessonUpload     = multer({ storage: makeStorage('lessons'),     fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
var assignmentUpload = multer({ storage: makeStorage('assignments'), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
var submissionUpload = multer({ storage: makeStorage('submissions'), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
var photoUpload      = multer({ storage: makeStorage('photos'),      fileFilter, limits: { fileSize: 5  * 1024 * 1024 } }); // 5MB

// Wrapper that catches multer errors and passes to Express error handler
function handleUpload(uploadMiddleware) {
  return function(req, res, next) {
    uploadMiddleware(req, res, function(err) {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'File too large. Maximum size allowed is 10MB'));
        return next(new ApiError(400, 'File upload error: ' + err.message));
      }
      next(err);
    });
  };
}

module.exports = {
  uploadLesson:     handleUpload(lessonUpload.single('file')),
  uploadAssignment: handleUpload(assignmentUpload.single('file')),
  uploadSubmission: handleUpload(submissionUpload.single('file')),
  uploadPhoto:      handleUpload(photoUpload.single('photo')),
};