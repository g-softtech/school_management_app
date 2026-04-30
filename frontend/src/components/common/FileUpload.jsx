import { useState, useRef, useCallback } from 'react';
import { FiUpload, FiX, FiFile, FiImage, FiFileText } from 'react-icons/fi';

const ACCEPT_LABELS = {
  'image/*':        'Images (PNG, JPG, GIF)',
  'application/pdf':'PDF files',
  '.csv':           'CSV files',
  '*':              'Any file',
};

function getFileIcon(file) {
  if (!file) return FiFile;
  if (file.type?.startsWith('image/'))      return FiImage;
  if (file.type === 'application/pdf')      return FiFileText;
  if (file.name?.endsWith('.csv'))          return FiFileText;
  return FiFile;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
  value,            // File | null
  onChange,         // (file: File | null) => void
  accept = '*',     // e.g. 'image/*', 'application/pdf,.doc', '.csv'
  maxSizeMB = 10,
  label = 'Attach File',
  placeholder = 'Click to browse or drag & drop',
  existingFileName = null,  // show existing file name from DB
  disabled = false,
  className = '',
}) {
  const inputRef    = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const validate = useCallback((file) => {
    if (!file) return '';
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) return `File too large. Max size is ${maxSizeMB}MB.`;
    return '';
  }, [maxSizeMB]);

  const handleFile = (file) => {
    if (!file) return;
    const err = validate(file);
    setError(err);
    if (!err) onChange(file);
  };

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); if (!disabled) setDrag(true); };
  const handleDragLeave = () => setDrag(false);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayFile = value;
  const FileIcon = getFileIcon(displayFile);

  return (
    <div className={className}>
      {label && <label className="input-label mb-1.5 block">{label}</label>}

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400'}
          ${drag ? 'border-primary-400 bg-primary-50' : 'border-secondary-200 bg-secondary-50'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />

        {displayFile ? (
          /* Selected file preview */
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileIcon size={18} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-800 truncate">{displayFile.name}</p>
              <p className="text-xs text-secondary-400 mt-0.5">{formatBytes(displayFile.size)}</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                title="Remove file"
              >
                <FiX size={15} className="text-red-400" />
              </button>
            )}
          </div>
        ) : existingFileName ? (
          /* Existing file from DB */
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiFile size={18} className="text-secondary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-700 truncate">{existingFileName}</p>
              <p className="text-xs text-secondary-400 mt-0.5">Existing file · click to replace</p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${drag ? 'bg-primary-100' : 'bg-secondary-100'}`}>
              <FiUpload size={18} className={drag ? 'text-primary-500' : 'text-secondary-400'} />
            </div>
            <div className="text-center">
              <p className="text-sm text-secondary-600 font-medium">{placeholder}</p>
              <p className="text-xs text-secondary-400 mt-0.5">
                {accept !== '*' ? (ACCEPT_LABELS[accept] || accept) : 'Any file'} · Max {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
