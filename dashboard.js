// ERS Overtime Analysis Dashboard
// SATS Singapore - Food Solutions Department - Pre-Set Org Unit

// Configuration
const config = {
    colors: {
        primary: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'],
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
    },
    margins: { top: 20, right: 30, bottom: 40, left: 50 }
};

// Global variables
let data = [];
let filteredData = [];
let tooltip;

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

function formatTime(hours) {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    const sign = hours < 0 ? '-' : '';
    return `${sign}${h}:${m.toString().padStart(2, '0')}`;
}

function formatDuration(hours) {
    return `${Math.abs(hours).toFixed(1)}h`;
}

function getShiftType(startTime, endTime) {
    if (startTime === '08:00' && endTime === '16:00') return 'Day Shift';
    if (startTime === '16:00' && endTime === '00:00') return 'Evening Shift';
    if (startTime === '00:00' && endTime === '08:00') return 'Night Shift';
    return 'Other';
}

// Data loading and processing
async function loadData() {
    try {
        const csvData = await d3.csv('mock_data.csv');
        
        data = csvData.map(d => ({
            date: new Date(d['Shift Date'].split('-').reverse().join('-')),
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
            otStatus: d['OT? If yes, help us understand why not submitted yet   '] || '',
            shiftType: getShiftType(d['Shift Start Time'], d['Shift End Time']),
            isPotentialOT: parseDelta(d['Delta']) > 0.5
        }));

        filteredData = [...data];
        console.log('Data loaded:', data.length, 'records');
        
        initializeFilters();
        updateDashboard();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please ensure mock_data.csv is in the same directory.');
    }
}

// Filter functionality
function initializeFilters() {
    const dates = [...new Set(data.map(d => d.date.toDateString()))].sort();
    const dateSelect = d3.select('#date-filter');
    dateSelect.selectAll('option:not(:first-child)').remove();
    dates.forEach(date => {
        dateSelect.append('option').attr('value', date).text(date);
    });

    const officers = [...new Set(data.map(d => d.reportingOfficer))].sort();
    const officerSelect = d3.select('#officer-filter');
    officerSelect.selectAll('option:not(:first-child)').remove();
    officers.forEach(officer => {
        officerSelect.append('option').attr('value', officer).text(officer);
    });

    const statuses = [...new Set(data.map(d => d.otStatus).filter(s => s))].sort();
    const statusSelect = d3.select('#status-filter');
    statusSelect.selectAll('option:not(:first-child)').remove();
    statuses.forEach(status => {
        statusSelect.append('option').attr('value', status).text(status);
    });

    const staff = [...new Set(data.map(d => d.staffName))].sort();
    const staffSelect = d3.select('#staff-filter');
    staffSelect.selectAll('option:not(:first-child)').remove();
    staff.forEach(person => {
        staffSelect.append('option').attr('value', person).text(person);
    });

    d3.selectAll('.filters select').on('change', applyFilters);
}

function applyFilters() {
    const dateFilter = d3.select('#date-filter').node().value;
    const officerFilter = d3.select('#officer-filter').node().value;
    const statusFilter = d3.select('#status-filter').node().value;
    const staffFilter = d3.select('#staff-filter').node().value;

    filteredData = data.filter(d => {
        return (dateFilter === 'all' || d.date.toDateString() === dateFilter) &&
               (officerFilter === 'all' || d.reportingOfficer === officerFilter) &&
               (statusFilter === 'all' || d.otStatus === statusFilter) &&
               (staffFilter === 'all' || d.staffName === staffFilter);
    });

    updateDashboard();
}

// Dashboard update
function updateDashboard() {
    updateSummaryStats();
    updateOTStatusChart();
    updateDeltaHistogram();
    updateDailyTrend();
    updateStaffPerformance();
    updateShiftAnalysis();
    updateOfficerOverview();
    updateInsights();
}

function updateSummaryStats() {
    const totalRecords = filteredData.length;
    const avgDelta = d3.mean(filteredData, d => d.delta) || 0;
    const potentialOT = filteredData.filter(d => d.isPotentialOT).length;

    d3.select('#total-records').text(totalRecords);
    d3.select('#avg-delta').text(formatDuration(avgDelta));
    d3.select('#potential-ot').text(potentialOT);
}

function updateOTStatusChart() {
    const container = d3.select('#ot-status-chart');
    container.selectAll('*').remove();

    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.otStatus || 'No Status');
    const statusData = Array.from(statusCounts, ([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

    const width = 350;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.4).outerRadius(radius);

    const arcs = g.selectAll('.arc')
        .data(pie(statusData))
        .enter().append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => config.colors.status[d.data.status] || config.colors.primary[i % config.colors.primary.length])
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.data.status}: ${d.data.count} cases (${(d.data.count / filteredData.length * 100).toFixed(1)}%)`);
        })
        .on('mouseout', hideTooltip);

    const legend = container.append('div').attr('class', 'legend').style('margin-top', '1rem');
    statusData.forEach((d, i) => {
        const item = legend.append('div').attr('class', 'legend-item');
        item.append('div').attr('class', 'legend-color')
            .style('background-color', config.colors.status[d.status] || config.colors.primary[i % config.colors.primary.length]);
        item.append('span').text(`${d.status}: ${d.count}`);
    });
}

function updateDeltaHistogram() {
    const container = d3.select('#delta-histogram');
    container.selectAll('*').remove();

    const width = 350;
    const height = 200;
    const margin = config.margins;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const deltaValues = filteredData.map(d => d.delta).filter(d => !isNaN(d));
    const x = d3.scaleLinear().domain(d3.extent(deltaValues)).range([0, chartWidth]);
    const histogram = d3.histogram().value(d => d).domain(x.domain()).thresholds(x.ticks(12));
    const bins = histogram(deltaValues);
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([chartHeight, 0]);

    g.selectAll('.bar').data(bins).enter().append('rect').attr('class', 'bar')
        .attr('x', d => x(d.x0))
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', d => y(d.length))
        .attr('height', d => chartHeight - y(d.length))
        .attr('fill', config.colors.primary[0])
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            showTooltip(event, `Range: ${formatTime(d.x0)} to ${formatTime(d.x1)}<br>Count: ${d.length}`);
        })
        .on('mouseout', hideTooltip);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => formatTime(d)));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));
}

function updateDailyTrend() {
    const container = d3.select('#daily-trend');
    container.selectAll('*').remove();

    const width = 700;
    const height = 250;
    const margin = config.margins;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const dailyData = d3.rollups(filteredData, 
        v => ({
            totalHours: d3.sum(v, d => Math.max(0, d.delta)),
            cases: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length
        }), 
        d => d.date.toDateString()
    ).map(([date, stats]) => ({ date: new Date(date), ...stats }))
     .sort((a, b) => a.date - b.date);

    const x = d3.scaleTime().domain(d3.extent(dailyData, d => d.date)).range([0, chartWidth]);
    const y1 = d3.scaleLinear().domain([0, d3.max(dailyData, d => d.totalHours)]).range([chartHeight, 0]);
    const y2 = d3.scaleLinear().domain([0, d3.max(dailyData, d => d.cases)]).range([chartHeight, 0]);

    const line1 = d3.line().x(d => x(d.date)).y(d => y1(d.totalHours)).curve(d3.curveMonotoneX);
    const line2 = d3.line().x(d => x(d.date)).y(d => y2(d.potentialOT)).curve(d3.curveMonotoneX);

    g.append('path').datum(dailyData).attr('fill', 'none').attr('stroke', config.colors.primary[0]).attr('stroke-width', 2).attr('d', line1);
    g.append('path').datum(dailyData).attr('fill', 'none').attr('stroke', config.colors.primary[1]).attr('stroke-width', 2).attr('d', line2);

    g.selectAll('.dot1').data(dailyData).enter().append('circle').attr('class', 'dot1')
        .attr('cx', d => x(d.date)).attr('cy', d => y1(d.totalHours)).attr('r', 3)
        .attr('fill', config.colors.primary[0])
        .on('mouseover', function(event, d) {
            showTooltip(event, `Date: ${d.date.toLocaleDateString()}<br>Total OT Hours: ${d.totalHours.toFixed(1)}h<br>Cases: ${d.cases}`);
        })
        .on('mouseout', hideTooltip);

    g.selectAll('.dot2').data(dailyData).enter().append('circle').attr('class', 'dot2')
        .attr('cx', d => x(d.date)).attr('cy', d => y2(d.potentialOT)).attr('r', 3)
        .attr('fill', config.colors.primary[1])
        .on('mouseover', function(event, d) {
            showTooltip(event, `Date: ${d.date.toLocaleDateString()}<br>Potential OT Cases: ${d.potentialOT}`);
        })
        .on('mouseout', hideTooltip);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%m/%d')));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y1));

    const legend = container.append('div').attr('class', 'legend');
    legend.append('div').attr('class', 'legend-item')
        .html(`<div class="legend-color" style="background-color: ${config.colors.primary[0]}"></div><span>Total OT Hours</span>`);
    legend.append('div').attr('class', 'legend-item')
        .html(`<div class="legend-color" style="background-color: ${config.colors.primary[1]}"></div><span>Potential OT Cases</span>`);
}

function updateStaffPerformance() {
    const container = d3.select('#staff-performance');
    container.selectAll('*').remove();

    const staffData = d3.rollups(filteredData,
        v => ({
            avgDelta: d3.mean(v, d => d.delta),
            count: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.staffName
    ).map(([name, stats]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        ...stats
    })).sort((a, b) => b.avgDelta - a.avgDelta).slice(0, 8);

    const width = 350;
    const height = 250;
    const margin = { ...config.margins, left: 80 };

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, d3.max(staffData, d => d.avgDelta)]).range([0, chartWidth]);
    const y = d3.scaleBand().domain(staffData.map(d => d.name)).range([0, chartHeight]).padding(0.1);

    g.selectAll('.bar').data(staffData).enter().append('rect').attr('class', 'bar')
        .attr('x', 0).attr('y', d => y(d.name)).attr('width', d => x(d.avgDelta))
        .attr('height', y.bandwidth()).attr('fill', config.colors.primary[2]).attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.fullName}<br>Avg Delta: ${formatDuration(d.avgDelta)}<br>Records: ${d.count}<br>Potential OT: ${d.potentialOT}`);
        })
        .on('mouseout', hideTooltip);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => formatDuration(d)));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));
}

function updateShiftAnalysis() {
    const container = d3.select('#shift-analysis');
    container.selectAll('*').remove();

    const shiftData = d3.rollups(filteredData,
        v => ({
            count: v.length,
            avgDelta: d3.mean(v, d => d.delta),
            potentialOT: v.filter(d => d.isPotentialOT).length
        }),
        d => d.shiftType
    ).map(([type, stats]) => ({ type, ...stats }));

    const width = 350;
    const height = 200;
    const margin = config.margins;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(shiftData.map(d => d.type)).range([0, chartWidth]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(shiftData, d => d.count)]).range([chartHeight, 0]);

    g.selectAll('.bar').data(shiftData).enter().append('rect').attr('class', 'bar')
        .attr('x', d => x(d.type)).attr('width', x.bandwidth())
        .attr('y', d => y(d.count)).attr('height', d => chartHeight - y(d.count))
        .attr('fill', (d, i) => config.colors.primary[i % config.colors.primary.length])
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.type}<br>Records: ${d.count}<br>Avg Delta: ${formatDuration(d.avgDelta)}<br>Potential OT: ${d.potentialOT}`);
        })
        .on('mouseout', hideTooltip);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0, ${chartHeight})`).call(d3.axisBottom(x));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));
}

function updateOfficerOverview() {
    const container = d3.select('#officer-overview');
    container.selectAll('*').remove();

    const officerData = d3.rollups(filteredData,
        v => ({
            total: v.length,
            potentialOT: v.filter(d => d.isPotentialOT).length,
            avgDelta: d3.mean(v, d => d.delta)
        }),
        d => d.reportingOfficer
    ).map(([officer, stats]) => ({
        officer: officer.length > 15 ? officer.substring(0, 15) + '...' : officer,
        fullOfficer: officer,
        ...stats
    })).sort((a, b) => b.total - a.total);

    const width = 700;
    const height = 250;
    const margin = { ...config.margins, left: 120 };

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, d3.max(officerData, d => d.total)]).range([0, chartWidth]);
    const y = d3.scaleBand().domain(officerData.map(d => d.officer)).range([0, chartHeight]).padding(0.1);

    g.selectAll('.bar-total').data(officerData).enter().append('rect').attr('class', 'bar-total')
        .attr('x', 0).attr('y', d => y(d.officer)).attr('width', d => x(d.total))
        .attr('height', y.bandwidth()).attr('fill', config.colors.primary[0]).attr('opacity', 0.3);

    g.selectAll('.bar-ot').data(officerData).enter().append('rect').attr('class', 'bar-ot')
        .attr('x', 0).attr('y', d => y(d.officer)).attr('width', d => x(d.potentialOT))
        .attr('height', y.bandwidth()).attr('fill', config.colors.primary[1]).attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.fullOfficer}<br>Total Cases: ${d.total}<br>Potential OT: ${d.potentialOT}<br>Avg Delta: ${formatDuration(d.avgDelta)}`);
        })
        .on('mouseout', hideTooltip);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0, ${chartHeight})`).call(d3.axisBottom(x));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));

    const legend = container.append('div').attr('class', 'legend');
    legend.append('div').attr('class', 'legend-item')
        .html(`<div class="legend-color" style="background-color: ${config.colors.primary[0]}; opacity: 0.3;"></div><span>Total Cases</span>`);
    legend.append('div').attr('class', 'legend-item')
        .html(`<div class="legend-color" style="background-color: ${config.colors.primary[1]}"></div><span>Potential OT Cases</span>`);
}

function updateInsights() {
    const highestDelta = d3.max(filteredData, d => d.delta) || 0;
    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.otStatus || 'No Status');
    const mostCommonStatus = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const totalPotentialHours = d3.sum(filteredData.filter(d => d.isPotentialOT), d => d.delta);
    const avgStaffDelta = d3.mean(filteredData, d => d.delta) || 0;

    d3.select('#highest-delta').text(formatDuration(highestDelta));
    d3.select('#most-common-status').text(mostCommonStatus.length > 15 ? mostCommonStatus.substring(0, 15) + '...' : mostCommonStatus);
    d3.select('#total-potential-hours').text(formatDuration(totalPotentialHours));
    d3.select('#avg-staff-delta').text(formatDuration(avgStaffDelta));
}

function showTooltip(event, content) {
    if (!tooltip) {
        tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);
    }
    tooltip.transition().duration(200).style('opacity', 1);
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

function hideTooltip() {
    if (tooltip) {
        tooltip.transition().duration(200).style('opacity', 0);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
}); 