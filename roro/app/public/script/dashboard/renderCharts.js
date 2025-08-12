import { centerTextPlugin, setChartDefaults } from "./chartUtils.js";
// *************************************************************** Pie chart */
function renderPieChart(winRate) {
    Chart.register(centerTextPlugin);
    const ctx = document.getElementById('pie-chart');
    if (!ctx)
        return;
    new Chart(ctx, {
        type: "doughnut",
        data: {
            datasets: [{
                    data: [winRate, 100 - winRate],
                    backgroundColor: ["#8DC5FF", "#1C388E"],
                    borderWidth: 0
                }]
        },
        options: {
            centerText: `${winRate}%`,
        }
    });
}
// *************************************************************** Bar chart */
function renderBarChart(gamesPerDay) {
    const ctx = document.getElementById('bar-chart');
    if (!ctx)
        return;
    const dates = Object.keys(gamesPerDay).sort();
    const labels = dates.map(date => date.slice(5));
    const data = dates.map(date => gamesPerDay[date]);
    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                    data,
                    backgroundColor: "#8DC5FF",
                    borderWidth: 1
                }]
        },
        options: {
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: true
                    },
                },
                y: {
                    grid: {
                        display: false,
                        drawBorder: true
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                    }
                }
            },
        }
    });
}
// ************************************************************** Line chart */
function renderLineChart(winRateOverTime) {
    const ctx = document.getElementById('line-chart');
    if (!ctx)
        return;
    const labels = winRateOverTime.map(item => item.date.slice(5));
    const data = winRateOverTime.map(item => item.winRate);
    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                    data: data,
                    borderColor: "#8DC5FF",
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 0,
                    suggestedMax: 120,
                    ticks: {
                        stepSize: 20,
                        callback: (value) => (value <= 100) ? `${value}%` : ''
                    },
                    grid: {
                        display: false,
                        drawBorder: true
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: true
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                    }
                }
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: (context) => `${context.parsed.y}% win rate`
                    }
                }
            }
        }
    });
}
// ************************************************************ All charts */
export default function renderCharts(stats) {
    setChartDefaults();
    renderPieChart(stats.winRate);
    renderBarChart(stats.gamesPerDay);
    renderLineChart(stats.winRateOverTime);
}
