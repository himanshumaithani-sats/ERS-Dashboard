# ERS Overtime Analysis Dashboard

A comprehensive D3.js-powered dashboard for analyzing overtime patterns and potential overtime cases in the SATS Singapore Food Solutions Department - Pre-Set Org Unit.

## 🚀 Live Demo

Visit the dashboard: [Your GitHub Pages URL]

## 📊 Features

### Interactive Visualizations

1. **OT Status Distribution** - Pie chart showing the breakdown of overtime claim status categories
2. **Delta Time Distribution** - Histogram of time differences between scheduled and actual work hours
3. **Daily Overtime Trend** - Line chart tracking overtime hours and cases over time
4. **Staff Performance Analysis** - Bar chart of average delta times by staff member
5. **Shift Analysis** - Comparison of overtime patterns across different shift types
6. **Reporting Officer Overview** - Comparative analysis of cases managed by each officer

### Key Insights Panel

- Highest single delta time recorded
- Most common overtime status
- Total potential overtime hours
- Average staff delta time

### Interactive Filters

- **Date Range**: Filter data by specific dates
- **Reporting Officer**: Focus on specific officers' cases
- **OT Status**: Filter by overtime claim status
- **Staff**: Analyze individual staff members

## 🎯 Business Value

### For Supervisors
- Identify staff with consistent overtime patterns
- Monitor potential unclaimed overtime
- Track daily overtime trends

### For Department Heads
- Understand department-wide overtime patterns
- Analyze reporting officer workloads
- Identify system errors and process improvements

### For Management
- Strategic overview of overtime costs and patterns
- Data-driven decision making for staffing
- Compliance and audit trail analysis

## 📋 OT Status Categories

The dashboard analyzes the following overtime status categories:

- **Not claiming OT** - Staff working extra hours but not claiming overtime
- **OT missed out** - Legitimate overtime that was missed
- **Staff did not write on OT form** - Administrative oversight
- **OT not claimed due to early arrival** - Early arrivals not claimed as OT
- **OT not claimed due to late departure** - Late departures not claimed as OT
- **System error** - Technical issues affecting time tracking
- **Other reason** - Miscellaneous cases with custom reasons

## 🔧 Technical Implementation

### Technologies Used
- **D3.js v7** - Data visualization library
- **HTML5/CSS3** - Modern web standards
- **Vanilla JavaScript** - No framework dependencies
- **CSV Data Processing** - Client-side data parsing

### Data Processing
- Automatic time parsing and delta calculations
- Shift type classification (Day/Evening/Night/Other)
- Potential overtime identification (>30 minutes delta)
- Dynamic filtering and aggregation

## 📁 Project Structure

```
ERS-Dashboard/
├── index.html          # Main dashboard HTML
├── dashboard.js        # D3.js visualizations and data processing
├── mock_data.csv       # Sample overtime data
└── README.md          # Documentation
```

## 🚀 GitHub Pages Setup

1. **Fork or Clone** this repository
2. **Upload your data** - Replace `mock_data.csv` with your actual data
3. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

Your dashboard will be available at: `https://yourusername.github.io/repository-name`

## 📊 Data Format

The dashboard expects CSV data with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Shift Date | Date in DD-MM-YYYY format | 01-06-2025 |
| Staff No | Employee ID | 00115085 |
| Staff Name | Employee name | Rahim Bin Artali |
| Shift Start Time | Scheduled start time | 08:00 |
| Shift End Time | Scheduled end time | 16:00 |
| Clock In Time | Actual clock in time | 06:45 |
| Clock Out Time | Actual clock out time | 17:12 |
| ShiftTT | Scheduled hours | 8:00 |
| ClockTT | Actual hours worked | 10:27 |
| Delta | Time difference | 2:27 |
| reporting_officer_name | Supervisor name | Mohd Hafizi Bin Samsudin |
| Age | Employee age | 2 |
| OT? If yes, help us understand why not submitted yet | OT status | Staff did not write on OT form |

## 🎨 Customization

### Colors and Styling
- Modify the `config.colors` object in `dashboard.js`
- Update CSS variables in `index.html` for theme changes
- Adjust chart dimensions and margins as needed

### Adding New Visualizations
1. Create a new container in `index.html`
2. Add the visualization function in `dashboard.js`
3. Call it from `updateDashboard()`

## 📱 Mobile Responsive

The dashboard is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security & Privacy

- All data processing happens client-side
- No data is sent to external servers
- Suitable for sensitive HR data
- Can be hosted on internal networks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or support regarding the dashboard:
- Create an issue in this repository
- Provide sample data and describe the issue
- Include browser information for technical issues

## 📜 License

This project is open source and available under the MIT License.

---

**Built for SATS Singapore Food Solutions Department - Pre-Set Org Unit**

*Empowering data-driven workforce management decisions* 