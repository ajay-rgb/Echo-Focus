document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ type: 'getHistory' }, (response) => {
        if (response && response.ok) {
            const history = response.history;
            displayReport(history);
        }
    });
});

function displayReport(history) {
    const container = document.getElementById('report-container');
    if (!history || history.length === 0) {
        container.innerHTML = '<p>No session data recorded yet.</p>';
        return;
    }

    const dailyData = {};
    const weeklyData = {};
    const monthlyData = {};

    history.forEach(session => {
        const startDate = new Date(session.startTime);
        const duration = (session.endTime - session.startTime) / (1000 * 60); // in minutes

        // Daily
        const day = startDate.toDateString();
        dailyData[day] = (dailyData[day] || 0) + duration;

        // Weekly
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() - startDate.getDay());
        const week = weekStart.toDateString();
        weeklyData[week] = (weeklyData[week] || 0) + duration;

        // Monthly
        const month = `${startDate.getFullYear()}-${startDate.getMonth() + 1}`;
        monthlyData[month] = (monthlyData[month] || 0) + duration;
    });

    let html = `
        <div class="report-card">
            <h2>Daily Focus</h2>
            ${Object.entries(dailyData).map(([day, total]) => `<p>${day}: <strong>${total.toFixed(2)} minutes</strong></p>`).join('')}
        </div>
        <div class="report-card">
            <h2>Weekly Focus</h2>
            ${Object.entries(weeklyData).map(([week, total]) => `<p>Week of ${week}: <strong>${total.toFixed(2)} minutes</strong></p>`).join('')}
        </div>
        <div class="report-card">
            <h2>Monthly Focus</h2>
            ${Object.entries(monthlyData).map(([month, total]) => `<p>${month}: <strong>${total.toFixed(2)} minutes</strong></p>`).join('')}
        </div>
    `;

    container.innerHTML = html;
}