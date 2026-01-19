import React, { useRef } from 'react';
import './FileUpload.css';

function FileUpload({ onFileUpload }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    console.log('File input changed:', e.target.files);
    const file = e.target.files[0];
    if (file) {
      console.log('Uploading file:', file.name, file.size);
      onFileUpload(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls,.pdf,.json"
        style={{ display: 'none' }}
      />
      <button
        onClick={() => {
          console.log('Upload button clicked, triggering file input');
          fileInputRef.current.click();
        }}
        className="upload-button"
        type="button"
      >
        📎 Upload File
      </button>
      <span className="file-hint">CSV, Excel, JSON, or PDF</span>
    </div>
  );
}

export default FileUpload;
