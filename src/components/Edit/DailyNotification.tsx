'use client';

import React, { useEffect, useState } from 'react';
import '@/styles/DailyNotification.css';

export const DailyNotification: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const lastShown = localStorage.getItem('lastNotificationDate');
        const today = new Date().toDateString();

        if (lastShown !== today) {
            setIsVisible(true);
            localStorage.setItem('lastNotificationDate', today);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div className="notification-overlay">
            <div className="notification-card">
                <p>Contact <span className="highlight-name">grassles</span> on Discord for feedback!</p>
                <button onClick={() => setIsVisible(false)}>Close</button>
            </div>
        </div>
    );
};