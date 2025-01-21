import React, { useCallback, useState } from 'react';
import { Results } from '../components/Import/Results';
import '../styles/Import.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const ImportPreview = ({ src }: { src: string }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    return (
        <>
            <div className="preview-container">
                <img src={src} 
                    className="preview-thumbnail"
                    alt="Preview" 
                    onClick={() => setIsFullscreen(true)}
                />
            </div>
            {isFullscreen && (
                <div className="fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
                    <img src={src} 
                        className="modal-image"
                        alt="Preview"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

const ImportUploader = ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(e.type === 'dragover');
    }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        onFilesSelected(Array.from(e.dataTransfer.files));
    }, [onFilesSelected]);
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const items = e.clipboardData?.items;
            if (!items) return;
            const imageFiles = Array.from(items)
                .filter(item => item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter((file): file is File => file !== null);
            if (imageFiles.length > 0) {
                onFilesSelected(imageFiles);
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [onFilesSelected]);
    return (
        <div className={`dropzone ${isDragging ? 'dragover' : ''}`}
            onClick={() => document.getElementById('fileInput')?.click()}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
        >
            <span>Drag, Upload or Paste</span>
            <input id="fileInput"
                type="file"
                multiple
                hidden
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
            />
        </div>
    );
};

export const ImportPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [results, setResults] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        setFile(newFiles[0] || null);
        setResults(null);
        setIsProcessing(false);
    };

    const handleDelete = () => {
        setFile(null);
        setResults(null);
        setIsProcessing(false);
    };

    const handleProcess = async () => {
        if (!file) return;
        
        setIsProcessing(true);
        try {
            const base64 = await fileToBase64(file);
            
            const response = await fetch(`${API_URL}/api/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: base64,
                    type: 'import'
                })
            });

            if (!response.ok) {
                throw new Error('Processing failed');
            }

            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Processing error:', error);
            setResults({ error: 'Processing failed' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="import-page">
            <div className="import-section">
                {!file ? (
                    <>
                        <div className='instructions'>Upload image from the wuwa discord bot</div>
                        <ImportUploader onFilesSelected={handleFilesSelected} />
                    </>
                ) : (
                    <div className="preview-container">
                        <div className={`image-container ${isProcessing ? 'processing' : ''}`}>
                            <ImportPreview src={URL.createObjectURL(file)} />
                        </div>
                        <div className="button-container">
                            <button className="import-button delete" onClick={handleDelete}>
                                Delete
                            </button>
                            <button className="import-button process" onClick={handleProcess} disabled={isProcessing || results}>
                                {isProcessing ? (
                                    <span className="button-content">
                                        <div className="loading-spinner" />
                                        Processing...
                                    </span>
                                ) : 'Process'}
                            </button>
                        </div>
                        {results && <Results results={results} />}
                    </div>
                )}
            </div>
        </div>
    );
};