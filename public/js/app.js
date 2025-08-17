function initApp() {
    loadFromStorage();
    updateOverview();
    updateMilestones();
    updateProgress();
    updateDataSummary();
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName).style.display = 'block';
    event.target.classList.add('active');
    
    if (tabName === 'progress') {
        updateProgress();
    }
}

// Child info management
function saveChildInfo() {
    const name = document.getElementById('childName').value;
    const birthDate = document.getElementById('birthDate').value;
    const currentAge = parseInt(document.getElementById('currentAge').value);
    
    if (name && birthDate && currentAge) {
        appData.child_info = { name, birth_date: birthDate, current_age_months: currentAge };
        saveToStorage();
        updateOverview();
        updateMilestones();
        alert('Child information saved successfully!');
    } else {
        alert('Please fill in all fields.');
    }
}

function calculateAge() {
    const birthDate = new Date(document.getElementById('birthDate').value);
    const today = new Date();
    
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    
    // Adjust for day of month
    if (today.getDate() < birthDate.getDate()) {
        months--;
    }
    
    document.getElementById('currentAge').value = months;
}

function updateOverview() {
    const overview = document.getElementById('overviewContent');
    if (appData.child_info.name) {
        const totalMilestones = getTotalMilestones();
        const achievedMilestones = getAchievedMilestones();
        const completionRate = totalMilestones > 0 ? ((achievedMilestones / totalMilestones) * 100).toFixed(1) : 0;
        
        overview.innerHTML = `
            <h4>${appData.child_info.name} (${appData.child_info.current_age_months} months old)</h4>
            <p><strong>Progress:</strong> ${achievedMilestones} of ${totalMilestones} age-appropriate milestones achieved (${completionRate}%)</p>
            <p><strong>Born:</strong> ${new Date(appData.child_info.birth_date).toLocaleDateString()}</p>
        `;
    }
    
    // Update form fields
    document.getElementById('childName').value = appData.child_info.name || '';
    document.getElementById('birthDate').value = appData.child_info.birth_date || '';
    document.getElementById('currentAge').value = appData.child_info.current_age_months || '';
}

function updateMilestones() {
    const container = document.getElementById('milestonesContainer');
    if (!appData.child_info.name) {
        container.innerHTML = '<p>Please set up your child\'s profile first to see age-appropriate milestones.</p>';
        return;
    }

    const currentAge = appData.child_info.current_age_months;
    let html = '';

    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        const relevantMilestones = Object.keys(milestones).filter(key => {
            const ageRange = milestones[key].typical_age_range;
            return currentAge >= ageRange[0] && currentAge <= ageRange[1];
        });

        if (relevantMilestones.length > 0) {
            const areaName = area.replace('_', ' ').toUpperCase();
            const isPlayschool = area === 'playschool_readiness';
            
            html += `
                <div class="milestone-area">
                    <div class="milestone-header ${isPlayschool ? 'playschool' : ''}" onclick="toggleMilestoneArea('${area}')">
                        <span>${areaName}</span>
                        <span id="toggle-${area}">▼</span>
                    </div>
                    <div class="milestone-content" id="content-${area}">
            `;

            relevantMilestones.forEach(milestoneKey => {
                const milestone = milestones[milestoneKey];
                const tracking = getTrackingData(area, milestoneKey);
                
                html += `
                    <div class="milestone-item">
                        <div class="milestone-title">${milestone.description}</div>
                        <div class="milestone-details">
                            Age Range: ${milestone.typical_age_range[0]}-${milestone.typical_age_range[1]} months | 
                            Playschool Importance: ${milestone.playschool_importance}
                        </div>
                        <div class="milestone-tracking">
                            <div class="status-buttons">
                                <button class="status-btn ${tracking.observed === true ? 'achieved' : ''}" 
                                        onclick="updateMilestone('${area}', '${milestoneKey}', true)">
                                    ✓ Achieved
                                </button>
                                <button class="status-btn ${tracking.observed === false ? 'not-yet' : ''}" 
                                        onclick="updateMilestone('${area}', '${milestoneKey}', false)">
                                    ⏳ Not Yet
                                </button>
                                <button class="status-btn ${tracking.observed === null ? 'not-applicable' : ''}" 
                                        onclick="updateMilestone('${area}', '${milestoneKey}', null)">
                                    N/A
                                </button>
                            </div>
                            <input type="text" class="notes-input" placeholder="Notes..." 
                                   value="${tracking.notes || ''}"
                                   onchange="updateMilestoneNotes('${area}', '${milestoneKey}', this.value)">
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html || '<p>No age-appropriate milestones found.</p>';
}

function toggleMilestoneArea(area) {
    const content = document.getElementById(`content-${area}`);
    const toggle = document.getElementById(`toggle-${area}`);
    
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        toggle.textContent = '▼';
    } else {
        content.classList.add('show');
        toggle.textContent = '▲';
    }
}

function updateMilestone(area, milestone, status) {
    if (!appData.tracking_data[appData.child_info.current_age_months]) {
        appData.tracking_data[appData.child_info.current_age_months] = {};
    }
    if (!appData.tracking_data[appData.child_info.current_age_months][area]) {
        appData.tracking_data[appData.child_info.current_age_months][area] = {};
    }
    if (!appData.tracking_data[appData.child_info.current_age_months][area][milestone]) {
        appData.tracking_data[appData.child_info.current_age_months][area][milestone] = {};
    }

    appData.tracking_data[appData.child_info.current_age_months][area][milestone].observed = status;
    appData.tracking_data[appData.child_info.current_age_months][area][milestone].date_observed = status ? new Date().toISOString().split('T')[0] : null;
    
    saveToStorage();
    updateMilestones();
    updateOverview();
}

function updateMilestoneNotes(area, milestone, notes) {
    if (!appData.tracking_data[appData.child_info.current_age_months]) {
        appData.tracking_data[appData.child_info.current_age_months] = {};
    }
    if (!appData.tracking_data[appData.child_info.current_age_months][area]) {
        appData.tracking_data[appData.child_info.current_age_months][area] = {};
    }
    if (!appData.tracking_data[appData.child_info.current_age_months][area][milestone]) {
        appData.tracking_data[appData.child_info.current_age_months][area][milestone] = {};
    }

    appData.tracking_data[appData.child_info.current_age_months][area][milestone].notes = notes;
    saveToStorage();
}

function getTrackingData(area, milestone) {
    const ageData = appData.tracking_data[appData.child_info.current_age_months];
    return (ageData && ageData[area] && ageData[area][milestone]) || 
           { observed: null, date_observed: null, notes: '' };
}

function getTotalMilestones() {
    const currentAge = appData.child_info.current_age_months;
    let total = 0;
    
    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        Object.keys(milestones).forEach(key => {
            const ageRange = milestones[key].typical_age_range;
            if (currentAge >= ageRange[0] && currentAge <= ageRange[1]) {
                total++;
            }
        });
    });
    
    return total;
}

function getAchievedMilestones() {
    const currentAge = appData.child_info.current_age_months;
    let achieved = 0;
    
    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        Object.keys(milestones).forEach(key => {
            const ageRange = milestones[key].typical_age_range;
            if (currentAge >= ageRange[0] && currentAge <= ageRange[1]) {
                const tracking = getTrackingData(area, key);
                if (tracking.observed === true) {
                    achieved++;
                }
            }
        });
    });
    
    return achieved;
}

function updateProgress() {
    calculateReadinessScore();
    updateProgressCharts();
    generateRecommendations();
}

function calculateReadinessScore() {
    let score = 0;
    let maxScore = 0;
    
    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        Object.keys(milestones).forEach(key => {
            const milestone = milestones[key];
            const importance = milestone.playschool_importance;
            const weight = importance === 'high' ? 3 : importance === 'medium' ? 2 : 1;
            
            maxScore += weight;
            
            const tracking = getTrackingData(area, key);
            if (tracking.observed === true) {
                score += weight;
            }
        });
    });
    
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    // document.getElementById('readinessScore').textContent = `${percentage}%`;
}

function updateProgressCharts() {
    // Prepare data for milestone progress by area
    const areaData = {};
    Object.keys(appData.milestone_definitions).forEach(area => {
        areaData[area] = {
            total: 0,
            achieved: 0
        };
        
        const milestones = appData.milestone_definitions[area];
        Object.keys(milestones).forEach(key => {
            const tracking = getTrackingData(area, key);
            areaData[area].total++;
            if (tracking.observed === true) {
                areaData[area].achieved++;
            }
        });
    });

    // Create/update area progress chart
    const areaCtx = document.getElementById('areaProgressChart')?.getContext('2d');
    if (areaCtx) {
        if (window.areaChart) window.areaChart.destroy();
        
        window.areaChart = new Chart(areaCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(areaData).map(area => area.replace('_', ' ').toUpperCase()),
                datasets: [{
                    label: 'Progress by Area (%)',
                    data: Object.values(areaData).map(data => 
                        data.total > 0 ? ((data.achieved / data.total) * 100).toFixed(1) : 0
                    ),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Completion %'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Create/update importance chart
    const importanceData = {
        high: { total: 0, achieved: 0 },
        medium: { total: 0, achieved: 0 },
        low: { total: 0, achieved: 0 }
    };

    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        Object.keys(milestones).forEach(key => {
            const importance = milestones[key].playschool_importance;
            const tracking = getTrackingData(area, key);
            
            importanceData[importance].total++;
            if (tracking.observed === true) {
                importanceData[importance].achieved++;
            }
        });
    });

    // const importanceCtx = document.getElementById('importanceChart')?.getContext('2d');
    // if (importanceCtx) {
    //     if (window.importanceChart) window.importanceChart.destroy();
        
    //     window.importanceChart = new Chart(importanceCtx, {
    //         type: 'doughnut',
    //         data: {
    //             labels: ['High', 'Medium', 'Low'].map(imp => 
    //                 `${imp} Priority (${importanceData[imp.toLowerCase()].achieved}/${importanceData[imp.toLowerCase()].total})`
    //             ),
    //             datasets: [{
    //                 data: Object.values(importanceData).map(data => 
    //                     data.total > 0 ? ((data.achieved / data.total) * 100).toFixed(1) : 0
    //                 ),
    //                 backgroundColor: [
    //                     'rgba(255, 99, 132, 0.6)',
    //                     'rgba(54, 162, 235, 0.6)',
    //                     'rgba(255, 206, 86, 0.6)'
    //                 ],
    //                 borderColor: [
    //                     'rgba(255, 99, 132, 1)',
    //                     'rgba(54, 162, 235, 1)',
    //                     'rgba(255, 206, 86, 1)'
    //                 ],
    //                 borderWidth: 1
    //             }]
    //         },
    //         options: {
    //             responsive: true,
    //             plugins: {
    //                 legend: {
    //                     position: 'bottom'
    //                 },
    //                 title: {
    //                     display: true,
    //                     text: 'Progress by Priority Level'
    //                 }
    //             }
    //         }
    //     });
    // }
}

function generateRecommendations() {
    const recommendations = [];
    const currentAge = appData.child_info.current_age_months;
    
    // Analyze each development area
    Object.keys(appData.milestone_definitions).forEach(area => {
        const milestones = appData.milestone_definitions[area];
        const areaStats = {
            total: 0,
            achieved: 0,
            pending: [],
            critical: []
        };

        // Analyze milestones in this area
        Object.keys(milestones).forEach(key => {
            const milestone = milestones[key];
            const tracking = getTrackingData(area, key);
            const ageRange = milestone.typical_age_range;
            
            // Only consider age-appropriate milestones
            if (currentAge >= ageRange[0] && currentAge <= ageRange[1]) {
                areaStats.total++;
                
                if (tracking.observed === true) {
                    areaStats.achieved++;
                } else if (tracking.observed === false || tracking.observed === null) {
                    // Track unachieved milestones
                    if (milestone.playschool_importance === 'high') {
                        areaStats.critical.push(milestone.description);
                    } else {
                        areaStats.pending.push(milestone.description);
                    }
                }
            }
        });

        // Generate area-specific recommendations
        if (areaStats.total > 0) {
            const completion = (areaStats.achieved / areaStats.total) * 100;
            const areaName = area.replace('_', ' ').toLowerCase();

            if (completion < 50) {
                recommendations.push({
                    type: 'warning',
                    area: areaName,
                    message: `Focus needed in ${areaName}. Only ${completion.toFixed(1)}% of age-appropriate milestones achieved.`
                });
            }

            // Add recommendations for critical milestones
            if (areaStats.critical.length > 0) {
                recommendations.push({
                    type: 'priority',
                    area: areaName,
                    message: `Priority milestones to work on in ${areaName}:`,
                    items: areaStats.critical
                });
            }
        }
    });

    // Calculate overall progress
    const totalMilestones = getTotalMilestones();
    const achievedMilestones = getAchievedMilestones();
    const overallCompletion = totalMilestones > 0 ? 
        (achievedMilestones / totalMilestones) * 100 : 0;

    // Add overall progress recommendation
    if (overallCompletion >= 75) {
        recommendations.push({
            type: 'success',
            area: 'overall',
            message: `Great progress! ${overallCompletion.toFixed(1)}% of age-appropriate milestones achieved.`
        });
    } else if (overallCompletion < 40) {
        recommendations.push({
            type: 'alert',
            area: 'overall',
            message: `Consider consulting a development specialist. Overall progress is ${overallCompletion.toFixed(1)}%.`
        });
    }

    // Update recommendations in UI
    const recommendationsContainer = document.getElementById('recommendations');
    if (recommendationsContainer) {
        if (recommendations.length === 0) {
            recommendationsContainer.innerHTML = '<p>No specific recommendations at this time. Keep up the good work!</p>';
            return;
        }

        const html = recommendations.map(rec => {
            let recHtml = `
                <div class="recommendation ${rec.type}">
                    <h4>${rec.area.toUpperCase()}</h4>
                    <p>${rec.message}</p>
            `;

            if (rec.items) {
                recHtml += `
                    <ul>
                        ${rec.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                `;
            }

            recHtml += '</div>';
            return recHtml;
        }).join('');

        recommendationsContainer.innerHTML = html;
    }
}

function updateDataSummary() {
    const summaryContainer = document.getElementById('dataSummary');
    if (!summaryContainer) return;

    if (!appData.child_info.name) {
        summaryContainer.innerHTML = '<p>No data available. Please set up your child\'s profile first.</p>';
        return;
    }

    // Calculate statistics
    const stats = {
        totalObservations: 0,
        observationsByArea: {},
        latestUpdates: [],
        completionByMonth: {}
    };

    // Process tracking data
    Object.keys(appData.tracking_data).forEach(month => {
        const monthData = appData.tracking_data[month];
        stats.completionByMonth[month] = {
            total: 0,
            achieved: 0
        };

        Object.keys(monthData).forEach(area => {
            if (!stats.observationsByArea[area]) {
                stats.observationsByArea[area] = {
                    total: 0,
                    achieved: 0,
                    notYet: 0
                };
            }

            Object.keys(monthData[area]).forEach(milestone => {
                const observation = monthData[area][milestone];
                stats.totalObservations++;
                
                // Count by area
                if (observation.observed === true) {
                    stats.observationsByArea[area].achieved++;
                    stats.completionByMonth[month].achieved++;
                } else if (observation.observed === false) {
                    stats.observationsByArea[area].notYet++;
                }
                stats.observationsByArea[area].total++;
                stats.completionByMonth[month].total++;

                // Track latest updates
                if (observation.date_observed) {
                    stats.latestUpdates.push({
                        date: observation.date_observed,
                        area: area,
                        milestone: milestone,
                        description: appData.milestone_definitions[area][milestone].description
                    });
                }
            });
        });
    });

    // Sort latest updates by date
    stats.latestUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate HTML
    let html = `
        <div class="data-summary-grid">
            <div class="summary-card">
                <h5>Overall Statistics</h5>
                <p>Total Observations: ${stats.totalObservations}</p>
                <p>Areas Tracked: ${Object.keys(stats.observationsByArea).length}</p>
            </div>
            
            <div class="summary-card">
                <h5>Progress by Area</h5>
                ${Object.entries(stats.observationsByArea).map(([area, data]) => `
                    <div class="area-progress">
                        <span>${area.replace('_', ' ').toUpperCase()}</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${(data.achieved/data.total * 100).toFixed(1)}%"></div>
                        </div>
                        <span>${data.achieved}/${data.total}</span>
                    </div>
                `).join('')}
            </div>

            <div class="summary-card">
                <h5>Latest Updates</h5>
                ${stats.latestUpdates.slice(0, 5).map(update => `
                    <div class="update-item">
                        <span class="update-date">${new Date(update.date).toLocaleDateString()}</span>
                        <span class="update-desc">${update.description}</span>
                        <span class="update-area">${update.area.replace('_', ' ')}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    summaryContainer.innerHTML = html;
}