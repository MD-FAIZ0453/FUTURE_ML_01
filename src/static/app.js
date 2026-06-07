// Global state
let currentDataset = {
    filename: "Sample-Superstore.csv",
    columns: [],
    rows: 0,
    missing: {},
    sample: [],
    dateCol: "Order Date",
    targetCol: "Sales"
};

let forecastParams = {
    periods: 6,
    freq: "ME",
    yearlySeasonality: true,
    weeklySeasonality: false,
    dailySeasonality: false
};

let activeForecastResult = null;
let activeSegment = "category"; // "category" or "region"

// Chart instances
let forecastChartInstance = null;
let segmentChartInstance = null;
let seasonalityChartInstance = null;

// UI Elements
const els = {
    tabs: document.querySelectorAll('.nav-item'),
    panels: document.querySelectorAll('.tab-panel'),
    activeDatasetName: document.getElementById('active-dataset-name'),
    btnRunForecastHeader: document.getElementById('btn-run-forecast-header'),
    btnRunForecastConfig: document.getElementById('btn-run-forecast-config'),
    loadingOverlay: document.getElementById('loading-overlay'),
    
    // KPI
    kpiTotalSales: document.getElementById('kpi-total-sales'),
    kpiAvgSales: document.getElementById('kpi-avg-sales'),
    kpiNextForecast: document.getElementById('kpi-next-forecast'),
    kpiTrendPct: document.getElementById('kpi-trend-pct'),
    kpiMae: document.getElementById('kpi-mae'),
    kpiRmse: document.getElementById('kpi-rmse'),
    
    // Segment Buttons
    btnToggleCategory: document.getElementById('btn-toggle-category'),
    btnToggleRegion: document.getElementById('btn-toggle-region'),
    
    // Data Prep
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('csv-file-input'),
    btnLoadDefault: document.getElementById('btn-load-default'),
    columnMappingSection: document.getElementById('column-mapping-section'),
    selectDateCol: document.getElementById('select-date-col'),
    selectTargetCol: document.getElementById('select-target-col'),
    btnSaveMapping: document.getElementById('btn-save-mapping'),
    
    metaPlaceholder: document.getElementById('data-meta-placeholder'),
    metaInfo: document.getElementById('data-meta-info'),
    metaFilename: document.getElementById('meta-filename'),
    metaRows: document.getElementById('meta-rows'),
    metaCols: document.getElementById('meta-cols'),
    metaMissing: document.getElementById('meta-missing'),
    dataPreviewTable: document.getElementById('data-preview-table'),
    
    // Config Panel
    rangePeriods: document.getElementById('forecast-periods'),
    lblPeriods: document.getElementById('lbl-periods'),
    selectFreq: document.getElementById('forecast-freq'),
    chkYearly: document.getElementById('seasonality-yearly'),
    chkWeekly: document.getElementById('seasonality-weekly'),
    chkDaily: document.getElementById('seasonality-daily'),
    
    // Insights
    insightsList: document.getElementById('business-insights-list'),
    
    // Simulator
    simTargetRevenue: document.getElementById('sim-target-revenue'),
    btnRunSimulation: document.getElementById('btn-run-simulation'),
    simResults: document.getElementById('sim-results')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initUploadZone();
    initSliders();
    initSimulation();
    
    // Load default dataset meta on startup
    loadDefaultDataset();
});

// Navigation / Tabs
function initNavigation() {
    els.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedTab = tab.getAttribute('data-tab');
            
            // Update Active Nav
            els.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update Active Panel
            els.panels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(`panel-${selectedTab}`).classList.add('active');
            
            // Update Header Title
            const titleMap = {
                'dashboard': { t: 'Executive Dashboard', s: 'Historical analysis and machine learning forecasting' },
                'dataset': { t: 'Dataset Preview & Preparation', s: 'Upload, inspect, and configure fields for analysis' },
                'config': { t: 'Model Configuration', s: 'Adjust hyperparameters and fitting algorithms' },
                'insights': { t: 'Strategic Decisions', s: 'Actionable recommendations and growth scenarios' }
            };
            
            document.getElementById('page-title').textContent = titleMap[selectedTab].t;
            document.getElementById('page-subtitle').textContent = titleMap[selectedTab].s;
        });
    });
    
    els.btnRunForecastHeader.addEventListener('click', runForecastingPipeline);
    els.btnRunForecastConfig.addEventListener('click', runForecastingPipeline);
}

// Config Sliders & Parameter changes
function initSliders() {
    els.rangePeriods.addEventListener('input', (e) => {
        els.lblPeriods.textContent = e.target.value;
        forecastParams.periods = parseInt(e.target.value);
    });
    
    els.selectFreq.addEventListener('change', (e) => {
        forecastParams.freq = e.target.value;
    });
    
    els.chkYearly.addEventListener('change', (e) => {
        forecastParams.yearlySeasonality = e.target.checked;
    });
    
    els.chkWeekly.addEventListener('change', (e) => {
        forecastParams.weeklySeasonality = e.target.checked;
    });
    
    els.chkDaily.addEventListener('change', (e) => {
        forecastParams.dailySeasonality = e.target.checked;
    });
}

// Upload zone handling
function initUploadZone() {
    els.uploadZone.addEventListener('click', () => els.fileInput.click());
    
    els.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    els.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.uploadZone.classList.add('dragover');
    });
    
    els.uploadZone.addEventListener('dragleave', () => {
        els.uploadZone.classList.remove('dragover');
    });
    
    els.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    els.btnLoadDefault.addEventListener('click', loadDefaultDataset);
    
    els.btnSaveMapping.addEventListener('click', () => {
        currentDataset.dateCol = els.selectDateCol.value;
        currentDataset.targetCol = els.selectTargetCol.value;
        alert(`Confirmed Fields:\nDate column = ${currentDataset.dateCol}\nTarget column = ${currentDataset.targetCol}`);
        // Run forecasting immediately for user ease
        runForecastingPipeline();
    });
}

// Currency Formatter Utility
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val);
}

// Fetch APIs
async function loadDefaultDataset() {
    showLoading(true, "Inspecting default Superstore CSV...");
    try {
        const response = await fetch('/api/preview-default');
        if (!response.ok) throw new Error("Failed to fetch default dataset preview");
        const data = await response.json();
        updateDatasetState(data);
        showLoading(false);
    } catch (err) {
        showLoading(false);
        alert(`Error: ${err.message}`);
    }
}

async function handleFileUpload(file) {
    showLoading(true, `Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to upload dataset");
        }
        const data = await response.json();
        updateDatasetState(data);
        showLoading(false);
        
        // Switch to Data tab automatically to show user mapping options
        document.querySelector('[data-tab="dataset"]').click();
    } catch (err) {
        showLoading(false);
        alert(`Error: ${err.message}`);
    }
}

function updateDatasetState(data) {
    currentDataset.filename = data.filename;
    currentDataset.columns = data.columns;
    currentDataset.rows = data.rows;
    currentDataset.missing = data.missing_values;
    currentDataset.sample = data.sample_data;
    
    // Auto-select mappings if columns exist
    currentDataset.dateCol = data.columns.includes("Order Date") ? "Order Date" : data.columns[0];
    // Find numeric column, default to Sales if present
    currentDataset.targetCol = data.columns.includes("Sales") ? "Sales" : data.columns.find(col => col.toLowerCase().includes("sales") || col.toLowerCase().includes("demand") || col.toLowerCase().includes("qty") || col.toLowerCase().includes("quantity")) || data.columns[1];
    
    els.activeDatasetName.textContent = currentDataset.filename;
    
    // Update mapping selectors
    els.selectDateCol.innerHTML = '';
    els.selectTargetCol.innerHTML = '';
    
    data.columns.forEach(col => {
        const optDate = document.createElement('option');
        optDate.value = col;
        optDate.textContent = col;
        if (col === currentDataset.dateCol) optDate.selected = true;
        els.selectDateCol.appendChild(optDate);
        
        const optTarget = document.createElement('option');
        optTarget.value = col;
        optTarget.textContent = col;
        if (col === currentDataset.targetCol) optTarget.selected = true;
        els.selectTargetCol.appendChild(optTarget);
    });
    
    els.columnMappingSection.style.display = 'block';
    
    // Update Meta panel
    els.metaPlaceholder.style.display = 'none';
    els.metaInfo.style.display = 'flex';
    els.metaFilename.textContent = currentDataset.filename;
    els.metaRows.textContent = currentDataset.rows.toLocaleString();
    els.metaCols.textContent = currentDataset.columns.length;
    
    let sumMissing = Object.values(currentDataset.missing).reduce((a, b) => a + b, 0);
    els.metaMissing.textContent = sumMissing.toLocaleString();
    
    // Paint Raw Data preview table
    renderPreviewTable(data.columns, data.sample_data);
}

function renderPreviewTable(cols, rows) {
    const table = els.dataPreviewTable;
    table.innerHTML = '';
    
    // Head
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
}

// Run Machine Learning Model Pipeline
async function runForecastingPipeline() {
    showLoading(true, "Fitting Prophet Model & Generating Demand Predictions...");
    
    const requestData = {
        filename: currentDataset.filename,
        date_col: currentDataset.dateCol,
        target_col: currentDataset.targetCol,
        periods: forecastParams.periods,
        freq: forecastParams.freq,
        yearly_seasonality: forecastParams.yearlySeasonality,
        weekly_seasonality: forecastParams.weeklySeasonality,
        daily_seasonality: forecastParams.dailySeasonality
    };
    
    try {
        const response = await fetch('/api/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Model training failed");
        }
        
        const result = await response.json();
        activeForecastResult = result;
        
        // Update Dashboard Elements
        updateDashboardKPIs(result);
        renderCharts(result);
        renderBusinessInsights(result);
        
        // Reset simulation status if open
        resetSimulation();
        
        showLoading(false);
        
        // Jump to Dashboard panel to showcase findings
        document.querySelector('[data-tab="dashboard"]').click();
    } catch (err) {
        showLoading(false);
        alert(`Machine Learning Fitting Error:\n${err.message}`);
    }
}

function updateDashboardKPIs(res) {
    els.kpiTotalSales.textContent = formatCurrency(res.summary.total_historical);
    els.kpiAvgSales.textContent = formatCurrency(res.summary.avg_historical);
    els.kpiNextForecast.textContent = formatCurrency(res.summary.peak_value); // Max future month
    
    // Projected Growth/Decline Indicator
    const trend = res.summary.pct_change;
    const direction = trend >= 0 ? "Growth" : "Decline";
    els.kpiTrendPct.innerHTML = `<span class="${trend >= 0 ? 'meta-up' : 'meta-down'}"><i class="fa-solid ${trend >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> ${Math.abs(trend).toFixed(1)}%</span> vs. history`;
    
    // Next Month label
    els.kpiNextForecast.previousElementSibling.textContent = `Projected Peak (${res.summary.peak_month})`;
    
    // Errors
    els.kpiMae.textContent = formatCurrency(res.mae);
    els.kpiRmse.textContent = `RMSE: ${formatCurrency(res.rmse)}`;
}

// Chart.js painting functions
function renderCharts(res) {
    destroyCharts();
    
    // 1. Forecast Chart
    const forecastCtx = document.getElementById('forecastChart').getContext('2d');
    
    let allDates = [];
    let actualValues = [];
    let fitValues = [];
    let predictedValues = [];
    let lowerValues = [];
    let upperValues = [];
    
    res.history_chart.forEach(item => {
        allDates.push(item.date);
        actualValues.push(item.actual);
        fitValues.push(item.predicted);
        predictedValues.push(null);
        lowerValues.push(null);
        upperValues.push(null);
    });
    
    // Connect history fit with future forecast line for visuals
    if (res.history_chart.length > 0 && res.forecast_chart.length > 0) {
        let lastHist = res.history_chart[res.history_chart.length - 1];
        let firstFore = res.forecast_chart[0];
        
        allDates.push(firstFore.date);
        actualValues.push(null);
        fitValues.push(null);
        predictedValues.push(firstFore.predicted);
        lowerValues.push(firstFore.lower);
        upperValues.push(firstFore.upper);
    }
    
    res.forecast_chart.forEach((item, idx) => {
        // Skip first one as we added it for connection
        if (idx === 0) return;
        allDates.push(item.date);
        actualValues.push(null);
        fitValues.push(null);
        predictedValues.push(item.predicted);
        lowerValues.push(item.lower);
        upperValues.push(item.upper);
    });

    forecastChartInstance = new Chart(forecastCtx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: 'Actual Sales',
                    data: actualValues,
                    borderColor: '#0ea5e9',
                    backgroundColor: '#0ea5e9',
                    pointRadius: 3,
                    borderWidth: 2,
                    spanGaps: false
                },
                {
                    label: 'Model Fit',
                    data: fitValues,
                    borderColor: 'rgba(99, 102, 241, 0.45)',
                    borderWidth: 1.8,
                    pointRadius: 0,
                    borderDash: [4, 4],
                    spanGaps: false
                },
                {
                    label: 'Projected Forecast',
                    data: predictedValues,
                    borderColor: '#a78bfa',
                    backgroundColor: '#a78bfa',
                    pointRadius: 3.5,
                    borderWidth: 2.5,
                    spanGaps: false
                },
                {
                    label: 'Upper Bound',
                    data: upperValues,
                    borderColor: 'rgba(167, 139, 250, 0.15)',
                    pointRadius: 0,
                    borderWidth: 1,
                    spanGaps: false
                },
                {
                    label: 'Lower Bound',
                    data: lowerValues,
                    borderColor: 'rgba(167, 139, 250, 0.15)',
                    pointRadius: 0,
                    borderWidth: 1,
                    fill: '-1', // Fills area between this and upper bound
                    backgroundColor: 'rgba(167, 139, 250, 0.06)',
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(val) { return '$' + val.toLocaleString(); }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // 2. Segmentation Breakdown Chart
    const segmentCtx = document.getElementById('segmentChart').getContext('2d');
    
    // Listen to breakdown toggle switches
    els.btnToggleCategory.onclick = () => {
        els.btnToggleCategory.classList.add('active');
        els.btnToggleRegion.classList.remove('active');
        activeSegment = "category";
        updateSegmentChart(res.category_breakdown);
    };
    els.btnToggleRegion.onclick = () => {
        els.btnToggleRegion.classList.add('active');
        els.btnToggleCategory.classList.remove('active');
        activeSegment = "region";
        updateSegmentChart(res.region_breakdown);
    };
    
    // Draw initial Segment Breakdown (default is category)
    const activeBreakdownData = activeSegment === "category" ? res.category_breakdown : res.region_breakdown;
    
    segmentChartInstance = new Chart(segmentCtx, {
        type: 'bar',
        data: getSegmentChartData(activeBreakdownData),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(val) { return '$' + val.toLocaleString(); }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' Sales: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });

    // 3. Seasonality Chart
    if (res.seasonality_chart && res.seasonality_chart.length > 0) {
        const seasonalityCtx = document.getElementById('seasonalityChart').getContext('2d');
        const months = res.seasonality_chart.map(item => item.month);
        const seasonalityVals = res.seasonality_chart.map(item => item.seasonality);
        
        seasonalityChartInstance = new Chart(seasonalityCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Seasonality Index',
                    data: seasonalityVals,
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167, 139, 250, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(val) { return '$' + val.toLocaleString(); }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' Seasonality Effect: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Draw empty seasonality placeholder if daily data didn't create monthly seasonality
        const seasonalityCtx = document.getElementById('seasonalityChart').getContext('2d');
        seasonalityCtx.font = "12px sans-serif";
        seasonalityCtx.fillStyle = "#94a3b8";
        seasonalityCtx.fillText("No seasonality parameters configured for this timeline.", 20, 100);
    }
}

function updateSegmentChart(dataMap) {
    if (!segmentChartInstance) return;
    segmentChartInstance.data = getSegmentChartData(dataMap);
    segmentChartInstance.update();
}

function getSegmentChartData(dataMap) {
    const keys = Object.keys(dataMap || {});
    const vals = Object.values(dataMap || {});
    
    // Curated theme colors
    const colors = [
        'rgba(99, 102, 241, 0.7)',
        'rgba(14, 165, 233, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(244, 63, 94, 0.7)'
    ];
    
    const borderColors = [
        '#6366f1',
        '#0ea5e9',
        '#10b981',
        '#8b5cf6',
        '#f43f5e'
    ];
    
    return {
        labels: keys,
        datasets: [{
            data: vals,
            backgroundColor: colors.slice(0, keys.length),
            borderColor: borderColors.slice(0, keys.length),
            borderWidth: 1.5,
            borderRadius: 4
        }]
    };
}

function destroyCharts() {
    if (forecastChartInstance) {
        forecastChartInstance.destroy();
        forecastChartInstance = null;
    }
    if (segmentChartInstance) {
        segmentChartInstance.destroy();
        segmentChartInstance = null;
    }
    if (seasonalityChartInstance) {
        seasonalityChartInstance.destroy();
        seasonalityChartInstance = null;
    }
}

// Business Insights Renderer
function renderBusinessInsights(res) {
    const container = els.insightsList;
    container.innerHTML = '';
    
    const bulletIcons = {
        'trend': 'fa-solid fa-arrow-trend-up',
        'peak': 'fa-solid fa-circle-exclamation',
        'inventory': 'fa-solid fa-boxes-stacked',
        'cash': 'fa-solid fa-wallet',
        'category': 'fa-solid fa-tags',
        'region': 'fa-solid fa-map-location-dot'
    };
    
    const bulletThemes = ['trend', 'peak', 'inventory', 'cash', 'category', 'region'];
    
    res.insights.forEach((insightStr, idx) => {
        const type = bulletThemes[idx] || 'trend';
        const icon = bulletIcons[type] || 'fa-solid fa-lightbulb';
        
        const div = document.createElement('div');
        div.className = 'insight-item';
        div.innerHTML = `
            <div class="insight-bullet ${type}">
                <i class="${icon}"></i>
            </div>
            <div class="insight-text">
                ${insightStr}
            </div>
        `;
        container.appendChild(div);
    });
}

// Target Planner / Simulation Engine
function initSimulation() {
    els.btnRunSimulation.addEventListener('click', runRevenueSimulation);
}

function runRevenueSimulation() {
    if (!activeForecastResult) {
        alert("Please run a forecast first to generate baseline simulation variables.");
        return;
    }
    
    const target = parseFloat(els.simTargetRevenue.value);
    if (isNaN(target) || target <= 0) {
        alert("Please enter a valid monthly target revenue.");
        return;
    }
    
    const baselineAvg = activeForecastResult.summary.projected_avg;
    const gap = target - baselineAvg;
    const gapPct = (gap / baselineAvg) * 100;
    
    // Paint outputs
    document.querySelector('.sim-placeholder-text').style.display = 'none';
    const box = document.querySelector('.sim-content-box');
    box.style.display = 'block';
    
    document.getElementById('sim-baseline-val').textContent = formatCurrency(baselineAvg);
    document.getElementById('sim-target-val').textContent = formatCurrency(target);
    
    const gapEl = document.getElementById('sim-gap-val');
    if (gap <= 0) {
        gapEl.textContent = "$0.00 (Goal Achieved!)";
        gapEl.style.color = 'var(--accent-emerald)';
        document.getElementById('sim-tip').textContent = "Your baseline projection is already above your target revenue! Maintain regular inventory schedules and monitor for sudden supplier disruptions.";
    } else {
        gapEl.textContent = `${formatCurrency(gap)} (+${gapPct.toFixed(1)}%)`;
        gapEl.style.color = 'var(--accent-rose)';
        
        // Dynamic advice based on size of growth gap
        let advice = "";
        if (gapPct <= 15) {
            advice = "Achievable gap. Strategy: Increase advertising spend in leading regions (e.g. West) by 10%, bundle lower-performing items with high-demand categories, and optimize stock levels to ensure zero stockouts.";
        } else if (gapPct <= 40) {
            advice = "Significant gap. Strategy: Introduce targeted discount codes on peak sales weekdays. Launch seasonal marketing campaigns to capture demand in underperforming regions. Run cross-sales training for representatives.";
        } else {
            advice = "Aggressive gap. Strategy: Expand inventory catalogs for top categories. Implement dynamic algorithmic pricing to increase order values. Open additional local distribution hubs to expand market reach.";
        }
        document.getElementById('sim-tip').textContent = advice;
    }
}

function resetSimulation() {
    document.querySelector('.sim-placeholder-text').style.display = 'flex';
    document.querySelector('.sim-content-box').style.display = 'none';
}

// Utility Loader Overlay
function showLoading(active, msg = "Loading...") {
    if (active) {
        els.loadingOverlay.querySelector('.spinner-text').textContent = msg;
        els.loadingOverlay.classList.add('active');
    } else {
        els.loadingOverlay.classList.remove('active');
    }
}
