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
    container.innerHTML = '';

    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.otStatus || 'No Status');
    const statusData = Array.from(statusCounts, ([status, count]) => ({
        status: truncateText(status, 12),
        fullStatus: status,
        count,
        percentage: (count / filteredData.length * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count).slice(0, 6); // Show top 6 statuses

    console.log('Status chart data:', statusData);

    try {
        const plot = Plot.plot({
            width: 250,
            height: 160,
            marginLeft: 90,
            marginRight: 20,
            marginTop: 10,
            marginBottom: 20,
            x: { label: "Count" },
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

        container.appendChild(plot);
    } catch (error) {
        console.error('Status chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
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
    container.innerHTML = '';

    const deltaValues = filteredData.map(d => d.delta).filter(d => !isNaN(d));
    
    console.log('Delta chart data:', deltaValues.length, 'values');
    
    try {
        const plot = Plot.plot({
            width: 250,
            height: 160,
            marginLeft: 40,
            marginRight: 20,
            marginTop: 10,
            marginBottom: 30,
            x: { label: "Delta (hours)" },
            y: { label: "Count" },
            marks: [
                Plot.rectY(deltaValues, Plot.binX({y: "count"}, {
                    x: d => d,
                    fill: colors.primary,
                    fillOpacity: 0.7
                }))
            ]
        });

        container.appendChild(plot);
    } catch (error) {
        console.error('Delta chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
    }
}

function updateTrendChart() {
    const container = document.getElementById('trend-chart');
    container.innerHTML = '';

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

    console.log('Trend chart data:', dailyData);

    try {
        const plot = Plot.plot({
            width: 520,
            height: 160,
            marginLeft: 40,
            marginRight: 40,
            marginTop: 20,
            marginBottom: 30,
            x: { label: "Date", type: "time" },
            y: { label: "Hours/Cases" },
            marks: [
                Plot.line(dailyData, { 
                    x: "date", 
                    y: "totalHours", 
                    stroke: colors.primary, 
                    strokeWidth: 2
                }),
                Plot.line(dailyData, { 
                    x: "date", 
                    y: "potentialOT", 
                    stroke: colors.secondary, 
                    strokeWidth: 2
                }),
                Plot.dot(dailyData, { 
                    x: "date", 
                    y: "totalHours", 
                    fill: colors.primary, 
                    r: 3 
                }),
                Plot.dot(dailyData, { 
                    x: "date", 
                    y: "potentialOT", 
                    fill: colors.secondary, 
                    r: 3 
                })
            ]
        });

        container.appendChild(plot);
    } catch (error) {
        console.error('Trend chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
    }
}

function updateStaffChart() {
    const container = document.getElementById('staff-chart');
    container.innerHTML = '';

    const staffData = d3.rollups(filteredData,
        v => ({
            avgDelta: d3.mean(v, d => d.delta),
            count: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.staffName
    ).map(([name, stats]) => ({
        name: truncateText(name, 12),
        fullName: name,
        ...stats
    })).sort((a, b) => b.avgDelta - a.avgDelta).slice(0, 6);

    console.log('Staff chart data:', staffData);

    try {
        const plot = Plot.plot({
            width: 250,
            height: 160,
            marginLeft: 80,
            marginRight: 20,
            marginTop: 10,
            marginBottom: 20,
            x: { label: "Avg Delta (hours)" },
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

        container.appendChild(plot);
    } catch (error) {
        console.error('Staff chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
    }
}

function updateShiftChart() {
    const container = document.getElementById('shift-chart');
    container.innerHTML = '';

    const shiftData = d3.rollups(filteredData,
        v => ({
            count: v.length,
            avgDelta: d3.mean(v, d => d.delta),
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.shiftType
    ).map(([type, stats]) => ({ type, ...stats }));

    console.log('Shift chart data:', shiftData);

    try {
        const plot = Plot.plot({
            width: 250,
            height: 160,
            marginLeft: 40,
            marginRight: 20,
            marginTop: 10,
            marginBottom: 30,
            x: { label: "Shift Type" },
            y: { label: "Count" },
            marks: [
                Plot.barY(shiftData, {
                    x: "type",
                    y: "count",
                    fill: (d, i) => [colors.primary, colors.secondary, colors.accent, colors.warning][i % 4],
                    tip: true
                })
            ]
        });

        container.appendChild(plot);
    } catch (error) {
        console.error('Shift chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
    }
}

function updateOfficerChart() {
    const container = document.getElementById('officer-chart');
    container.innerHTML = '';

    const officerData = d3.rollups(filteredData,
        v => ({
            total: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length,
            avgDelta: d3.mean(v, d => d.delta)
        }),
        d => d.reportingOfficer
    ).map(([officer, stats]) => ({
        officer: truncateText(officer, 18),
        fullOfficer: officer,
        ...stats
    })).sort((a, b) => b.total - a.total);

    console.log('Officer chart data:', officerData);

    try {
        const plot = Plot.plot({
            width: 520,
            height: 160,
            marginLeft: 120,
            marginRight: 20,
            marginTop: 20,
            marginBottom: 20,
            x: { label: "Cases" },
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

        container.appendChild(plot);
    } catch (error) {
        console.error('Officer chart error:', error);
        container.innerHTML = '<p style="text-align:center; color:red; font-size:12px;">Chart Error</p>';
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
    loadData();
}); 