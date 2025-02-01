import React, { useState, useRef } from 'react';
import { handleTouchStart, handleTouchMove, handleTouchEnd, getStepStyles } from './ScanTutorial';
import '../../styles/ImportTutorial.css';

const IMPORT_SCREENSHOTS = [
    { 
        title: 'Take Screenshot', 
        src: '/images/import-full.webp',
        description: (
            <>
                Use the {' '}
                <a href="https://wutheringwaves.kurogames.com/en/main/news/detail/1959" target="_blank" rel="noopener noreferrer">
                    official wuwa-bot
                </a>
            </>
        )
    },
    { 
        title: 'Upload & Process', 
        src: '/images/import-scan.webp',
        description: 'Upload your image and click process Wait while the image is processed'
    },
    { 
        title: 'Review Results', 
        src: '/images/import-preview.webp',
        description: 'Open and review the scanned data Press Import to save or edit'
    }
];

export const ImportTutorial: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const touchStartRef = useRef<number>(0);

    return (
        <div className="import-tutorial">
            <section className="import-guide">
                <h3>Import Guide</h3>
                <div className="import-steps"
                    onTouchStart={handleTouchStart(touchStartRef)}
                    onTouchMove={handleTouchMove(touchStartRef, currentStep, 2)}
                    onTouchEnd={handleTouchEnd(touchStartRef, currentStep, 2, setCurrentStep)}
                    style={{ 
                        touchAction: 'pan-y pinch-zoom',
                        position: window.innerWidth <= 1200 ? 'relative' : 'static',
                        height: window.innerWidth <= 1200 ? '400px' : 'auto',
                        overflow: window.innerWidth <= 1200 ? 'hidden' : 'visible'
                    }}
                >
                    {IMPORT_SCREENSHOTS.map((step, index) => (
                        <div key={index} 
                            className="import-step" 
                            style={getStepStyles(index, currentStep)}
                        >
                            <div className="import-number">{index + 1}</div>
                            <h4>{step.title}</h4>
                            <img src={step.src} alt={step.title} />
                            <p>{step.description}</p>
                        </div>
                    ))}
                </div>
                {window.innerWidth <= 1200 && (
                    <div className="swipe-dots">
                        {IMPORT_SCREENSHOTS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`swipe-dot ${i === currentStep ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                )}
                <div className="tutorial-footer">
                    <div className="bot-guide">
                        <p>Bot Tutorial:</p>
                        <ul>
                            <li>Go to the <a href="https://wutheringwaves-discord.kurogames-global.com/?lang=en">Kuro website</a> and link both Discord and Kuro</li>
                            <img src="/images/bind-kuro.webp" alt="Kuro website" className="bot-image"/>
                            <li>Visit the Discord <a href="https://discord.com/channels/963760374543450182/1323199091072569479"> channel</a> and use /create on the bot</li>
                        </ul>
                    </div>
                    <div className="import-notes">
                        <p>Important Notes:</p>
                        <ul>
                            <li>Use the exact image the bot generates</li>
                            <li>The scanning isn't always 100% accurate</li>
                            <li>You can adjust any incorrectly scanned data</li>
                            <li>Save to LB will save builds to global pool</li>
                            <li>Currently supports English language builds only</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
};