// ERS Overtime Analysis Dashboard - Observable Plot Version
// SATS Singapore - Food Solutions Department - Pre-Set Org Unit

// Configuration
const colors = {
    primary: '#3498db',
    secondary: '#e74c3c',
    accent: '#2ecc71',
    warning: '#f39c12',
    purple: '#9b59b6',
    teal: '#1abc9c',
    dark: '#34495e',
    orange: '#e67e22',
    status: {
        'Not claiming OT': '#95a5a6',
        'OT missed out': '#e74c3c',
        'Staff did not write on OT form': '#f39c12',
        'OT not claimed due to early arrival': '#3498db',
        'OT not claimed due to late departure': '#9b59b6',
        'System error': '#e67e22',
        'Other reason': '#34495e',
        '': '#bdc3c7'
    }
};

// Global variables
let data = [];
let filteredData = [];

// Utility functions
function parseTime(timeStr) {
    if (!timeStr || timeStr.trim() === '') return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
}

function parseDelta(deltaStr) {
    if (!deltaStr || deltaStr.trim() === '') return 0;
    const isNegative = deltaStr.includes('-');
    const cleanStr = deltaStr.replace('-', '');
    const [hours, minutes] = cleanStr.split(':').map(Number);
    const totalHours = hours + minutes / 60;
    return isNegative ? -totalHours : totalHours;
}

function formatDuration(hours) {
    return `${Math.abs(hours).toFixed(1)}h`;
}

function getShiftType(startTime, endTime) {
    if (startTime === '08:00' && endTime === '16:00') return 'Day';
    if (startTime === '16:00' && endTime === '00:00') return 'Evening';
    if (startTime === '00:00' && endTime === '08:00') return 'Night';
    return 'Other';
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getContainerDimensions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container ${containerId} not found`);
        return { width: 250, height: 160 };
    }

    const panel = container.closest('.chart-panel');
    if (!panel) {
        console.warn(`Panel for ${containerId} not found`);
        return { width: 250, height: 160 };
    }

    const rect = panel.getBoundingClientRect();
    
    // Make sure the panel is actually visible
    if (rect.width === 0 || rect.height === 0) {
        console.warn(`Panel ${containerId} has zero dimensions`);
        return { width: 250, height: 160 };
    }
    
    const style = window.getComputedStyle(panel);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    
    return {
        width: Math.max(200, rect.width - paddingX - 20),
        height: Math.max(150, rect.height - paddingY - 40)
    };
}

function clearContainer(container) {
    // More efficient clearing
    container.innerHTML = '';
}

function getResponsiveMargins(width, height, type = 'standard') {
    const marginConfigs = {
        horizontal: {
            left: Math.min(Math.max(40, width * 0.15), 80),
            right: Math.min(20, width * 0.05),
            top: 10,
            bottom: Math.min(25, height * 0.15)
        },
        vertical: {
            left: Math.min(40, width * 0.15),
            right: Math.min(20, width * 0.05),
            top: 10,
            bottom: Math.min(30, height * 0.2)
        },
        trend: {
            left: Math.min(40, width * 0.08),
            right: Math.min(40, width * 0.08),
            top: 15,
            bottom: Math.min(35, height * 0.2)
        }
    };
    
    return marginConfigs[type] || marginConfigs.standard;
}

// Debug function to check chart container visibility
function debugChartContainers() {
    const containers = [
        'status-chart', 'delta-chart', 'trend-chart', 
        'staff-chart', 'shift-chart', 'officer-chart'
    ];
    
    console.log('=== Chart Container Debug ===');
    containers.forEach(id => {
        const container = document.getElementById(id);
        const panel = container?.closest('.chart-panel');
        
        console.log(`${id}:`, {
            container: container ? 'found' : 'missing',
            dimensions: container ? container.getBoundingClientRect() : 'N/A',
            panel: panel ? 'found' : 'missing',
            panelVisible: panel ? window.getComputedStyle(panel).display : 'N/A',
            panelDimensions: panel ? panel.getBoundingClientRect() : 'N/A'
        });
    });
}

// Optimized resize handler
function setupResponsiveCharts() {
    let resizeTimeout;
    let isResizing = false;
    
    window.addEventListener('resize', () => {
        if (isResizing) return;
        
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (filteredData.length > 0) {
                isResizing = true;
                updateDashboard();
                isResizing = false;
            }
        }, 250); // Reduced timeout for better responsiveness
    });
}

// Data loading and processing
async function loadData() {
    try {
        console.log('Attempting to load CSV data...');
        
        // Check if we can access the CSV file
        const response = await fetch('mock_data.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvData = await d3.csv('mock_data.csv');
        console.log('Raw CSV data loaded:', csvData.length, 'rows');
        console.log('First row sample:', csvData[0]);
        
        if (csvData.length === 0) {
            throw new Error('CSV file is empty or could not be parsed');
        }
        
        data = csvData.map(d => {
            // Parse date properly - format is DD-MM-YY
            const dateParts = d['Shift Date'].split('-');
            const parsedDate = new Date(`20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            
            return {
                date: parsedDate,
                staffNo: d['Staff No'],
                staffName: d['Staff Name'],
                shiftStart: d['Shift Start Time'],
                shiftEnd: d['Shift End Time'],
                clockIn: d['Clock In Time'],
                clockOut: d['Clock Out Time'],
                shiftTT: parseTime(d['ShiftTT']),
                clockTT: parseTime(d['ClockTT']),
                delta: parseDelta(d['Delta']),
                reportingOfficer: d['reporting_officer_name'],
                age: +d['Age'] || 0,
                otStatus: d['OT Status'] || '',
                shiftType: getShiftType(d['Shift Start Time'], d['Shift End Time']),
                isPotentialOT: parseDelta(d['Delta']) > 0.5
            };
        });

        filteredData = [...data];
        console.log('Data processed successfully:', data.length, 'records');
        console.log('Sample processed record:', data[0]);
        
        initializeFilters();
        updateDashboard();
        
    } catch (error) {
        console.error('Detailed error loading data:', error);
        
        // Show user-friendly error message
        const errorMsg = `Error loading data: ${error.message}\n\nPossible solutions:\n1. Make sure you're running this from a web server (not file:// protocol)\n2. Check that mock_data.csv is in the same directory\n3. Try using a local development server like Python's http.server or Node.js live-server`;
        
        alert(errorMsg);
        
        // Also display error on the page
        document.getElementById('total-records').textContent = 'Error';
        document.getElementById('avg-delta').textContent = 'Error';
        document.getElementById('potential-ot').textContent = 'Error';
    }
}

// Filter functionality
function initializeFilters() {
    // Set date range
    const dates = data.map(d => d.date).sort();
    const minDate = d3.min(dates);
    const maxDate = d3.max(dates);
    
    document.getElementById('start-date').value = minDate.toISOString().split('T')[0];
    document.getElementById('end-date').value = maxDate.toISOString().split('T')[0];

    // Populate filter dropdowns
    const officers = [...new Set(data.map(d => d.reportingOfficer))].sort();
    const officerSelect = document.getElementById('officer-filter');
    officers.forEach(officer => {
        const option = document.createElement('option');
        option.value = officer;
        option.textContent = truncateText(officer, 20);
        officerSelect.appendChild(option);
    });

    const statuses = [...new Set(data.map(d => d.otStatus).filter(s => s))].sort();
    const statusSelect = document.getElementById('status-filter');
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = truncateText(status, 25);
        statusSelect.appendChild(option);
    });

    const staff = [...new Set(data.map(d => d.staffName))].sort();
    const staffSelect = document.getElementById('staff-filter');
    staff.forEach(person => {
        const option = document.createElement('option');
        option.value = person;
        option.textContent = truncateText(person, 20);
        staffSelect.appendChild(option);
    });

    // Add event listeners
    document.getElementById('start-date').addEventListener('change', applyFilters);
    document.getElementById('end-date').addEventListener('change', applyFilters);
    document.getElementById('officer-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('staff-filter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);
    const officerFilter = document.getElementById('officer-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const staffFilter = document.getElementById('staff-filter').value;

    filteredData = data.filter(d => {
        return (d.date >= startDate && d.date <= endDate) &&
               (officerFilter === 'all' || d.reportingOfficer === officerFilter) &&
               (statusFilter === 'all' || d.otStatus === statusFilter) &&
               (staffFilter === 'all' || d.staffName === staffFilter);
    });

    updateDashboard();
}

// Dashboard update
function updateDashboard() {
    updateSummaryStats();
    updateStatusChart();
    updateDeltaChart();
    updateTrendChart();
    updateStaffChart();
    updateShiftChart();
    updateOfficerChart();
    updateInsights();
    
    // Debug after charts are created
    setTimeout(() => {
        console.log('=== Debug after chart updates ===');
        debugChartContainers();
    }, 500);
}

function updateSummaryStats() {
    const totalRecords = filteredData.length;
    const avgDelta = d3.mean(filteredData, d => d.delta) || 0;
    const potentialOT = filteredData.filter(d => d.isPotentialOT).length;

    document.getElementById('total-records').textContent = totalRecords;
    document.getElementById('avg-delta').textContent = formatDuration(avgDelta);
    document.getElementById('potential-ot').textContent = potentialOT;
}

function updateStatusChart() {
    const container = document.getElementById('status-chart');
    const { width, height } = getContainerDimensions('status-chart');
    const margins = getResponsiveMargins(width, height, 'horizontal');
    
    clearContainer(container);

    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.otStatus || 'No Status');
    const statusData = Array.from(statusCounts, ([status, count]) => ({
        status: truncateText(status, Math.floor(width / 20)), // Dynamic truncation
        fullStatus: status,
        count,
        percentage: (count / filteredData.length * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count).slice(0, Math.min(6, Math.floor(height / 25))); // Dynamic item count

    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 200 ? "Count" : null },
            y: { label: null },
            marks: [
                Plot.barX(statusData, {
                    x: "count",
                    y: "status",
                    fill: d => colors.status[d.fullStatus] || colors.primary,
                    tip: true
                })
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Status chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }

    // Update legend
    const legend = document.getElementById('status-legend');
    legend.innerHTML = '';
    statusData.slice(0, 4).forEach(d => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background-color: ${colors.status[d.fullStatus] || colors.primary}"></div>
            <span>${d.status}: ${d.count}</span>
        `;
        legend.appendChild(item);
    });
}

function updateDeltaChart() {
    const container = document.getElementById('delta-chart');
    const { width, height } = getContainerDimensions('delta-chart');
    const margins = getResponsiveMargins(width, height, 'vertical');
    
    clearContainer(container);

    const deltaValues = filteredData.map(d => d.delta).filter(d => !isNaN(d));
    
    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 200 ? "Delta (hours)" : null },
            y: { label: height > 150 ? "Count" : null },
            marks: [
                Plot.rectY(deltaValues, Plot.binX({y: "count"}, {
                    x: d => d,
                    fill: colors.primary,
                    fillOpacity: 0.7
                }))
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Delta chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }
}

function updateTrendChart() {
    const container = document.getElementById('trend-chart');
    const { width, height } = getContainerDimensions('trend-chart');
    const margins = getResponsiveMargins(width, height, 'trend');
    
    clearContainer(container);

    const dailyData = d3.rollups(filteredData, 
        v => ({
            totalHours: d3.sum(v, d => Math.max(0, d.delta)),
            cases: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length
        }), 
        d => d.date.toDateString()
    ).map(([date, stats]) => ({
        date: new Date(date),
        ...stats
    })).sort((a, b) => a.date - b.date);

    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 300 ? "Date" : null, type: "time" },
            y: { label: height > 150 ? "Hours/Cases" : null },
            marks: [
                Plot.line(dailyData, { 
                    x: "date", 
                    y: "totalHours", 
                    stroke: colors.primary, 
                    strokeWidth: width > 400 ? 2 : 1.5
                }),
                Plot.line(dailyData, { 
                    x: "date", 
                    y: "potentialOT", 
                    stroke: colors.secondary, 
                    strokeWidth: width > 400 ? 2 : 1.5
                }),
                Plot.dot(dailyData, { 
                    x: "date", 
                    y: "totalHours", 
                    fill: colors.primary, 
                    r: width > 400 ? 3 : 2
                }),
                Plot.dot(dailyData, { 
                    x: "date", 
                    y: "potentialOT", 
                    fill: colors.secondary, 
                    r: width > 400 ? 3 : 2
                })
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Trend chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }
}

function updateStaffChart() {
    const container = document.getElementById('staff-chart');
    const { width, height } = getContainerDimensions('staff-chart');
    const margins = getResponsiveMargins(width, height, 'horizontal');
    
    clearContainer(container);

    const maxItems = Math.min(6, Math.floor(height / 25));
    const staffData = d3.rollups(filteredData,
        v => ({
            avgDelta: d3.mean(v, d => d.delta),
            count: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.staffName
    ).map(([name, stats]) => ({
        name: truncateText(name, Math.floor(width / 18)),
        fullName: name,
        ...stats
    })).sort((a, b) => b.avgDelta - a.avgDelta).slice(0, maxItems);

    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 200 ? "Avg Delta (hours)" : null },
            y: { label: null },
            marks: [
                Plot.barX(staffData, {
                    x: "avgDelta",
                    y: "name",
                    fill: colors.accent,
                    tip: true
                })
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Staff chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }
}

function updateShiftChart() {
    const container = document.getElementById('shift-chart');
    const { width, height } = getContainerDimensions('shift-chart');
    const margins = getResponsiveMargins(width, height, 'vertical');
    
    clearContainer(container);

    const shiftData = d3.rollups(filteredData,
        v => ({
            count: v.length,
            avgDelta: d3.mean(v, d => d.delta),
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.shiftType
    ).map(([type, stats]) => ({ type, ...stats }));

    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 200 ? "Shift Type" : null },
            y: { label: height > 150 ? "Count" : null },
            marks: [
                Plot.barY(shiftData, {
                    x: "type",
                    y: "count",
                    fill: (d, i) => [colors.primary, colors.secondary, colors.accent, colors.warning][i % 4],
                    tip: true
                })
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Shift chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }
}

function updateOfficerChart() {
    const container = document.getElementById('officer-chart');
    const { width, height } = getContainerDimensions('officer-chart');
    const margins = getResponsiveMargins(width, height, 'horizontal');
    
    clearContainer(container);

    const maxItems = Math.min(8, Math.floor(height / 20));
    const officerData = d3.rollups(filteredData,
        v => ({
            total: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length,
            avgDelta: d3.mean(v, d => d.delta)
        }),
        d => d.reportingOfficer
    ).map(([officer, stats]) => ({
        officer: truncateText(officer, Math.floor(width / 25)),
        fullOfficer: officer,
        ...stats
    })).sort((a, b) => b.total - a.total).slice(0, maxItems);

    try {
        const plot = Plot.plot({
            width,
            height,
            marginLeft: margins.left,
            marginRight: margins.right,
            marginTop: margins.top,
            marginBottom: margins.bottom,
            x: { label: width > 300 ? "Cases" : null },
            y: { label: null },
            marks: [
                Plot.barX(officerData, {
                    x: "total",
                    y: "officer",
                    fill: colors.primary,
                    fillOpacity: 0.3,
                    tip: true
                }),
                Plot.barX(officerData, {
                    x: "potentialOT",
                    y: "officer",
                    fill: colors.secondary,
                    tip: true
                })
            ]
        });

        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.appendChild(plot);
        container.appendChild(plotContainer);
        
    } catch (error) {
        console.error('Officer chart error:', error);
        container.innerHTML = '<div style="text-align:center;color:red;font-size:10px;padding:10px;">Chart Error</div>';
    }
}

function updateInsights() {
    const maxDelta = d3.max(filteredData, d => d.delta) || 0;
    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.otStatus || 'No Status');
    const commonStatus = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const totalHours = d3.sum(filteredData.filter(d => d.isPotentialOT), d => d.delta);
    const staffAvg = d3.mean(filteredData, d => d.delta) || 0;

    document.getElementById('max-delta').textContent = formatDuration(maxDelta);
    document.getElementById('common-status').textContent = truncateText(commonStatus, 12);
    document.getElementById('total-hours').textContent = formatDuration(totalHours);
    document.getElementById('staff-avg').textContent = formatDuration(staffAvg);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking dependencies...');
    console.log('D3 available:', typeof d3 !== 'undefined');
    console.log('Plot available:', typeof Plot !== 'undefined');
    
    if (typeof Plot === 'undefined') {
        console.error('Observable Plot not loaded!');
        alert('Observable Plot library failed to load. Please check your internet connection and try refreshing.');
        return;
    }
    
    console.log('Plot methods available:', Object.getOwnPropertyNames(Plot));
    
    // Debug chart containers after a delay
    setTimeout(debugChartContainers, 1000);
    
    // Setup responsive chart updates
    setupResponsiveCharts();
    
    // Load data and initialize dashboard
    loadData();
}); 