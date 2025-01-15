import React, { useEffect, useState } from 'react';
import '../../styles/DailyNotification.css';

export const DailyNotification: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showvMessage, setShowvMessage] = useState(false);

    useEffect(() => {
        const lastShown = localStorage.getItem('lastNotificationDate');
        const today = new Date().toDateString();
        const vShown = localStorage.getItem('version_notification_shown');

        if (!vShown) {
            setShowvMessage(true);
            localStorage.setItem('version_notification_shown', 'true');
        }

        if (lastShown !== today) {
            setIsVisible(true);
            localStorage.setItem('lastNotificationDate', today);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div className="notification-overlay">
            <div className="notification-card">
                {showvMessage && (
                    <p className="version-message">Welcome to WuWa Builds v1.0.1! Old builds have been cleared for compatibility.</p>
                )}
                <p>Contact <span className="highlight-name">Dommynation</span> on Discord for feedback!</p>
                <button onClick={() => setIsVisible(false)}>Close</button>
            </div>
        </div>
    );
};