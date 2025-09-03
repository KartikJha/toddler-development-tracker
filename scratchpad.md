### toddler-tracker-ui-bootstrap-code   
   
   // Initialize app
        function initApp() {
            loadFromStorage();
            updateOverview();
            updateMilestones();
            updateProgress();
            updateDataSummary();
        }

        // Tab switching
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
            // document.getElementByI
        }

### toddler development auth curls

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","name":"Test Parent"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'

# Update parent info (with token)
curl -X PUT http://localhost:3000/api/parent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"primary":{"phone":"+1234567890"}}'

# Update password (with token)
curl -X PUT http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"current_password":"secret123","new_password":"newSecret123"}'

# gpt-oss quantization

python -m mlc_llm convert_weight ./tools/gpt-oss-20b/original/ \
    --quantization q4f16_1 \
    --model-type qwen3_moe \
    -o ./tools/gpt-oss-20b-int4/