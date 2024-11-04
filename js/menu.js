function createStatsMenuSection() {
    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';

    const statsHeader = document.createElement('div');
    statsHeader.className = 'stats-header';
    statsHeader.textContent = 'Stats';
    statsSection.appendChild(statsHeader);

    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    statsSection.appendChild(statsContainer);

    return statsSection;
}