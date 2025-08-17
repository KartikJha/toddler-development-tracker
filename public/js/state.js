// Application state
const appData = {
    child_info: {
        name: "",
        birth_date: "",
        current_age_months: 12
    },
    milestone_definitions: {
        // ...existing milestone definitions...
    },
    tracking_data: {},
    progress_summary: {
        areas_of_strength: [],
        areas_needing_attention: [],
        playschool_readiness_score: 0
    }
};

// State management functions
function saveToStorage() {
    localStorage.setItem('toddlerTrackerData', JSON.stringify(appData));
}

function loadFromStorage() {
    const saved = localStorage.getItem('toddlerTrackerData');
    if (saved) {
        Object.assign(appData, JSON.parse(saved));
    }
}