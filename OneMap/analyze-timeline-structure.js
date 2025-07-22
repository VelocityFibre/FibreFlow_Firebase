const fs = require('fs');
const path = require('path');

const timelinePath = path.join(__dirname, 'reports/chronological_split/timeline.json');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));

console.log('Timeline Structure Analysis');
console.log('==========================\n');

console.log(`Total dates in timeline: ${timeline.dates.length}`);
console.log('\nDates with comparison data:');
console.log('---------------------------');

timeline.dates.forEach((entry, index) => {
    if (entry.changes) {
        console.log(`\n${index + 1}. ${entry.date} (compared with ${entry.changes.comparedWith})`);
        console.log(`   Stats: ${entry.stats.permissions} permissions, ${entry.stats.poles} poles, ${entry.stats.total} total`);
        
        if (entry.changes.permissions) {
            const perm = entry.changes.permissions;
            console.log(`   Permissions: ${perm.prevCount} → ${perm.currCount}`);
            if (perm.changes) {
                console.log(`     - New: ${perm.changes.new ? perm.changes.new.length : 0}`);
                console.log(`     - Status Changed: ${perm.changes.statusChanged ? perm.changes.statusChanged.length : 0}`);
            }
        }
        
        if (entry.changes.poles) {
            const poles = entry.changes.poles;
            console.log(`   Poles: ${poles.prevCount} → ${poles.currCount}`);
            if (poles.changes) {
                console.log(`     - New: ${poles.changes.new ? poles.changes.new.length : 0}`);
                console.log(`     - Reappeared: ${poles.changes.reappeared ? poles.changes.reappeared.length : 0}`);
                console.log(`     - Pole Assignments: ${poles.changes.poleAssignments ? poles.changes.poleAssignments.length : 0}`);
            }
        }
    } else {
        console.log(`\n${index + 1}. ${entry.date} (baseline - no comparison)`);
        console.log(`   Stats: ${entry.stats.permissions} permissions, ${entry.stats.poles} poles, ${entry.stats.total} total`);
    }
});

// Find the most significant changes
console.log('\n\nMost Significant Changes:');
console.log('========================');

const significantDates = timeline.dates
    .filter(d => d.changes)
    .map(d => ({
        date: d.date,
        newPermissions: d.changes.permissions?.changes?.new?.length || 0,
        newPoles: d.changes.poles?.changes?.new?.length || 0,
        poleAssignments: d.changes.poles?.changes?.poleAssignments?.length || 0,
        totalChange: (d.stats.total - (d.changes.permissions?.prevCount || 0) - (d.changes.poles?.prevCount || 0))
    }))
    .sort((a, b) => b.totalChange - a.totalChange)
    .slice(0, 5);

significantDates.forEach((d, i) => {
    console.log(`${i + 1}. ${d.date}: +${d.totalChange} total records`);
    console.log(`   - ${d.newPermissions} new permissions`);
    console.log(`   - ${d.newPoles} new poles`);
    console.log(`   - ${d.poleAssignments} pole assignments`);
});

// Check what data is available for each change type
console.log('\n\nAvailable Data Fields:');
console.log('====================');

const sampleChange = timeline.dates.find(d => d.changes && d.changes.permissions?.changes?.new?.length > 0);
if (sampleChange) {
    console.log('\nPermission Record Fields:');
    const samplePerm = sampleChange.changes.permissions.changes.new[0];
    console.log(Object.keys(samplePerm).map(k => `  - ${k}: ${typeof samplePerm[k]}`).join('\n'));
}

const samplePoleChange = timeline.dates.find(d => d.changes && d.changes.poles?.changes?.new?.length > 0);
if (samplePoleChange) {
    console.log('\nPole Record Fields:');
    const samplePole = samplePoleChange.changes.poles.changes.new[0];
    console.log(Object.keys(samplePole).map(k => `  - ${k}: ${typeof samplePole[k]}`).join('\n'));
}

const sampleAssignment = timeline.dates.find(d => d.changes && d.changes.poles?.changes?.poleAssignments?.length > 0);
if (sampleAssignment) {
    console.log('\nPole Assignment Fields:');
    const sampleAss = sampleAssignment.changes.poles.changes.poleAssignments[0];
    console.log(Object.keys(sampleAss).map(k => `  - ${k}: ${typeof sampleAss[k]}`).join('\n'));
}