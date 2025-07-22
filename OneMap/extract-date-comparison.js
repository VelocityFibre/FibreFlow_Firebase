const fs = require('fs');
const path = require('path');

// Get date from command line argument
const targetDate = process.argv[2];
if (!targetDate) {
    console.log('Usage: node extract-date-comparison.js YYYY-MM-DD');
    console.log('Available dates:');
    const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'reports/chronological_split/timeline.json'), 'utf-8'));
    timeline.dates.forEach(d => {
        if (d.changes) {
            console.log(`  ${d.date} (compared with ${d.changes.comparedWith})`);
        }
    });
    process.exit(1);
}

const timelinePath = path.join(__dirname, 'reports/chronological_split/timeline.json');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));

// Find the requested date
const dateEntry = timeline.dates.find(d => d.date === targetDate);

if (!dateEntry) {
    console.error(`Date ${targetDate} not found in timeline`);
    process.exit(1);
}

if (!dateEntry.changes) {
    console.log(`${targetDate} is the baseline date - no comparison available`);
    process.exit(0);
}

// Create output directory
const outputDir = path.join(__dirname, 'reports/individual_comparisons');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Save the full comparison data
const outputPath = path.join(outputDir, `comparison_${targetDate}.json`);
fs.writeFileSync(outputPath, JSON.stringify(dateEntry, null, 2));

// Create a summary report
const summaryPath = path.join(outputDir, `summary_${targetDate}.txt`);
let summary = `Date Comparison Report: ${targetDate}\n`;
summary += `Compared with: ${dateEntry.changes.comparedWith}\n`;
summary += `${'='.repeat(60)}\n\n`;

summary += `Overall Statistics:\n`;
summary += `-----------------\n`;
summary += `Total Records: ${dateEntry.stats.total}\n`;
summary += `Permissions: ${dateEntry.stats.permissions}\n`;
summary += `Poles: ${dateEntry.stats.poles}\n\n`;

if (dateEntry.changes.permissions) {
    const perm = dateEntry.changes.permissions;
    summary += `Permission Changes:\n`;
    summary += `-----------------\n`;
    summary += `Previous Count: ${perm.prevCount}\n`;
    summary += `Current Count: ${perm.currCount}\n`;
    summary += `Net Change: ${perm.currCount - perm.prevCount}\n`;
    
    if (perm.changes) {
        summary += `\nNew Permissions: ${perm.changes.new?.length || 0}\n`;
        summary += `Status Changes: ${perm.changes.statusChanged?.length || 0}\n`;
        
        if (perm.changes.new?.length > 0) {
            summary += `\nSample New Permissions (first 5):\n`;
            perm.changes.new.slice(0, 5).forEach(p => {
                summary += `  - ${p.location}\n`;
                summary += `    GPS: ${p.gps}, Property: ${p.propertyId}\n`;
            });
        }
        
        if (perm.changes.statusChanged?.length > 0) {
            summary += `\nSample Status Changes (first 5):\n`;
            perm.changes.statusChanged.slice(0, 5).forEach(p => {
                summary += `  - ${p.location}\n`;
                summary += `    ${p.oldStatus || '(empty)'} → ${p.newStatus || '(empty)'}\n`;
            });
        }
    }
}

if (dateEntry.changes.poles) {
    const poles = dateEntry.changes.poles;
    summary += `\n\nPole Changes:\n`;
    summary += `------------\n`;
    summary += `Previous Count: ${poles.prevCount}\n`;
    summary += `Current Count: ${poles.currCount}\n`;
    summary += `Net Change: ${poles.currCount - poles.prevCount}\n`;
    
    if (poles.changes) {
        summary += `\nNew Poles: ${poles.changes.new?.length || 0}\n`;
        summary += `Reappeared: ${poles.changes.reappeared?.length || 0}\n`;
        summary += `Pole Assignments: ${poles.changes.poleAssignments?.length || 0}\n`;
        
        if (poles.changes.new?.length > 0) {
            summary += `\nSample New Poles (first 5):\n`;
            poles.changes.new.slice(0, 5).forEach(p => {
                summary += `  - ${p.poleNumber}: ${p.location}\n`;
                summary += `    Status: ${p.status}, Property: ${p.propertyId}\n`;
            });
        }
        
        if (poles.changes.poleAssignments?.length > 0) {
            summary += `\nSample Pole Assignments (first 5):\n`;
            poles.changes.poleAssignments.slice(0, 5).forEach(p => {
                summary += `  - ${p.poleNumber}: ${p.location}\n`;
                summary += `    Previous: ${p.previousStatus || '(none)'}\n`;
                summary += `    Current: ${p.currentStatus}\n`;
                summary += `    Note: ${p.note || ''}\n`;
            });
        }
    }
}

fs.writeFileSync(summaryPath, summary);

console.log(`Comparison data extracted for ${targetDate}:`);
console.log(`  Full data: ${outputPath}`);
console.log(`  Summary: ${summaryPath}`);
console.log(`\nComparison Overview:`);
console.log(`  Compared ${targetDate} with ${dateEntry.changes.comparedWith}`);
console.log(`  Total records: ${dateEntry.stats.total}`);
if (dateEntry.changes.permissions?.changes?.new?.length > 0) {
    console.log(`  New permissions: ${dateEntry.changes.permissions.changes.new.length}`);
}
if (dateEntry.changes.poles?.changes?.poleAssignments?.length > 0) {
    console.log(`  Pole assignments: ${dateEntry.changes.poles.changes.poleAssignments.length}`);
}