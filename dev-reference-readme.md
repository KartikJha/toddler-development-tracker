# Toddler Development Tracker - Developer Reference

## Architecture Overview

The application follows a modular architecture with clear separation of concerns:

- `app.js` - Core application logic
- `state.js` - State management
- `ui.js` - UI updates and rendering
- `utils.js` - Helper functions

## Key Components

### State Management (`state.js`)

```javascript
const appData = {
    child_info: { /* child details */ },
    milestone_definitions: { /* milestone data */ },
    tracking_data: { /* observations */ },
    progress_summary: { /* calculated metrics */ }
}
```

### Core Functions

#### Progress Tracking

##### `updateProgressCharts()`
Visualizes milestone progress through interactive charts:
- **Bar Chart**: Shows progress by development area
- **Doughnut Chart**: Displays milestone distribution by importance
- Handles chart lifecycle (creation, updates, cleanup)
- Features:
  - Real-time completion percentages
  - Responsive layouts
  - Clear labels and legends
  - Memory leak prevention

##### `generateRecommendations()`
Creates personalized development insights:
- **Analysis Types**:
  - Development area progress
  - High-priority milestone identification
  - Overall progress assessment
- **Recommendation Categories**:
  - Warning (yellow) - Areas needing attention
  - Priority (red) - Critical unachieved milestones
  - Success (green) - Good progress indicators
  - Alert (red) - Significant concerns
- Updates automatically with milestone changes

##### `updateDataSummary()`
Generates comprehensive progress overview:
- **Statistics Tracked**:
  - Total observations
  - Area-wise progress
  - Recent milestone updates
- **Visual Elements**:
  - Progress bars by area
  - Latest activity feed
  - Overall completion metrics
- **Update Triggers**:
  - Child profile changes
  - Milestone updates
  - Data tab activation

#### Data Management

- `saveToStorage()` - Persists app data to localStorage
- `loadFromStorage()` - Retrieves saved app data
- `getTrackingData()` - Retrieves milestone tracking data

##### `saveChildInfo()`
Handles saving and updating child profile information:

**Implementation Details:**
```javascript
async function saveChildInfo() {
    // Validation & API call
    // State updates & UI feedback
}
```

**Features:**
- Async/await pattern for API interaction
- Form validation
- Visual feedback for success/error states
- Local state synchronization
- Automatic UI updates

**API Endpoint:**
- Method: `PUT`
- Path: `/api/child`
- Content-Type: `application/json`
- Payload:
  ```json
  {
    "name": string,
    "birth_date": string,
    "current_age_months": number
  }
  ```

**Success Flow:**
1. Validate form inputs
2. Send API request
3. Update local state
4. Show success notification
5. Update related UI components

**Error Handling:**
- Form validation errors
- API communication failures
- Server-side errors
- Network issues

**UI Feedback:**
```css
.alert-success {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}

.alert-error {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
}
```

**Usage Example:**
```html
<button class="btn btn-primary" onclick="saveChildInfo()">
    Save Child Info
</button>
```

**Dependencies:**
- Requires `state.js` for local state management
- Requires `utils.js` for helper functions
- Requires backend API endpoint availability

**Testing:**
```bash
# Start server
node server.js

# Access application
open http://localhost:3000

# Test scenarios
1. Valid data submission
2. Invalid data handling
3. Network error scenarios
4. State persistence
```

## UI Components

### Charts
```javascript
// Progress visualization
{
    areaChart: {
        type: 'bar',
        data: [/* development areas */],
        options: {/* responsive config */}
    },
    importanceChart: {
        type: 'doughnut',
        data: [/* priority levels */],
        options: {/* responsive config */}
    }
}
```

### Summary Cards
```javascript
// Data display components
{
    statistics: {/* overall metrics */},
    areaProgress: {/* progress bars */},
    recentUpdates: {/* latest changes */}
}
```

## Development Guidelines

### State Updates
1. Update milestone data using `updateMilestone()`
2. Call `saveToStorage()` after state changes
3. Trigger UI updates:
   - `updateProgressCharts()`
   - `generateRecommendations()`
   - `updateDataSummary()`

### Chart Management
1. Check for existing charts before creation
2. Destroy old instances before updates
3. Use consistent color schemes:
   - Progress: #4CAF50
   - Warning: #ffc107
   - Alert: #dc3545

### Performance Considerations
1. Batch DOM updates
2. Cache frequently accessed elements
3. Debounce chart updates
4. Optimize localStorage operations

## Testing & Debugging

### Chart Testing
```bash
# Monitor chart rendering
console.log('Chart update:', chartInstance);
```

### State Verification
```javascript
// Check data consistency
console.log('Current state:', appData);
console.log('Storage state:', localStorage.getItem('toddlerTrackerData'));
```

### UI Testing
- Verify responsive layouts
- Test all chart interactions
- Validate recommendation display
- Check progress bar accuracy

## Contributing

1. Follow modular architecture
2. Document state changes
3. Test visualization updates
4. Maintain UI responsiveness
5. Update documentation