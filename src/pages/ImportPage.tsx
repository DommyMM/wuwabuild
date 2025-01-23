import React, { useState } from 'react';
import { Results } from '../components/Import/Results';
import { Process, ImportRegion } from '../components/Import/Process';
import '../styles/Import.css';

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

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(e.type === 'dragover');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        onFilesSelected(Array.from(e.dataTransfer.files));
    };

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
    const [results, setResults] = useState<Record<ImportRegion, any>>({
        character: null,
        watermark: null,
        forte: null,
        sequences: null,
        weapon: null,
        echo1: null,
        echo2: null,
        echo3: null,
        echo4: null,
        echo5: null
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const processRef = React.useRef<(() => void) | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        setFile(newFiles[0] || null);
        setResults({
            character: null,
            watermark: null,
            forte: null,
            sequences: null,
            weapon: null,
            echo1: null,
            echo2: null,
            echo3: null,
            echo4: null,
            echo5: null
        });
        setIsProcessing(false);
        setError(null);
    };

    const handleDelete = () => {
        setFile(null);
        setResults({
            character: null,
            watermark: null,
            forte: null,
            sequences: null,
            weapon: null,
            echo1: null,
            echo2: null,
            echo3: null,
            echo4: null,
            echo5: null
        });
        setIsProcessing(false);
        setError(null);
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
                            <button 
                                className="import-button process"
                                onClick={() => processRef.current?.()}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <span className="button-content">
                                        <div className="loading-spinner" />
                                        Processing...
                                    </span>
                                ) : 'Process'}
                            </button>
                            <Process 
                                image={file}
                                onProcessStart={() => setIsProcessing(true)}
                                onRegionComplete={(region, data) => {
                                    setResults(prev => ({
                                        ...prev,
                                        [region]: data
                                    }));
                                }}
                                onProcessComplete={() => setIsProcessing(false)}
                                onError={setError}
                                triggerRef={processRef}
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        {results && <Results results={results} />}
                    </div>
                )}
            </div>
        </div>
    );
};