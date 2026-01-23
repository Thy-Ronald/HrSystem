# Issue Status Categorization Documentation

## Overview
This document explains how GitHub issues are categorized into different statuses (Assigned, In Progress, Done, Reviewed, Dev Deployed, Dev Checked) in the Staff Ranking system.

## Data Source
The system uses GitHub's GraphQL API to fetch issue data, including:
- Issue state (OPEN/CLOSED)
- Issue labels
- Assignment events (timeline items)
- Current assignees

## Status Determination Logic

### Priority Order
The status is determined in the following priority order (highest to lowest):

1. **Dev Checked** (highest priority)
2. **Dev Deployed**
3. **Reviewed**
4. **Done**
5. **In Progress**
6. **Assigned** (default)

### Status Detection Rules

#### 1. Dev Checked Cards
An issue is marked as **"Dev Checked"** if it has the exact label (case-insensitive):
- `5:Dev Checked`

**Basis and Rules:**
1. **Label Requirement:**
   - Must have the exact label "5:Dev Checked" (case-insensitive)
   - The label format must match exactly: "5:" prefix followed by "Dev Checked"
   - No variations or partial matches are accepted

2. **Status Priority:**
   - This status has the **highest priority** (Priority 1)
   - Will override all other status labels if present
   - If an issue has both "5:Dev Checked" and any other status label, it will be counted as "Dev Checked"

3. **Workflow Context:**
   - Represents the final stage of development verification
   - Typically applied after code has been deployed to dev environment and verified
   - Indicates that the development work has been checked and validated

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - Issue state does not affect the status determination (only the label matters)

**Example labels that would trigger "Dev Checked" status:**
- "5:Dev Checked" ✓
- "5:dev checked" ✓ (case-insensitive)
- "5:DEV CHECKED" ✓ (case-insensitive)

**Example labels that would NOT trigger "Dev Checked" status:**
- "Dev Checked" ✗ (missing "5:" prefix)
- "5: Dev Checked" ✗ (extra space after colon)
- "5:DevChecked" ✗ (missing space)
- "dev checked" ✗ (missing "5:" prefix)
- "checked" ✗ (not matching format)

**Code Reference:**
```javascript
devChecked: ['5:dev checked'] // Only exact match for "5:Dev Checked" label
```

#### 2. Dev Deployed Cards
An issue is marked as **"Dev Deployed"** if it has the exact label (case-insensitive):
- `4:Dev Deployed`

**Basis and Rules:**
1. **Label Requirement:**
   - Must have the exact label "4:Dev Deployed" (case-insensitive)
   - The label format must match exactly: "4:" prefix followed by "Dev Deployed"
   - No variations or partial matches are accepted

2. **Status Priority:**
   - This status has **second highest priority** (Priority 2)
   - Will override Reviewed, Done, In Progress, and Assigned statuses
   - Will be overridden by "5:Dev Checked" if both labels are present

3. **Workflow Context:**
   - Represents code that has been deployed to the development environment
   - Applied after code review and before final dev checking
   - Indicates the code is ready for verification in the dev environment

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - Issue state does not affect the status determination (only the label matters)

6. **Relationship to Other Statuses:**
   - Typically comes after "2.5 Review" in the workflow
   - Usually precedes "5:Dev Checked" in the workflow
   - Can coexist with other labels, but will take precedence over lower priority statuses

**Example labels that would trigger "Dev Deployed" status:**
- "4:Dev Deployed" ✓
- "4:dev deployed" ✓ (case-insensitive)
- "4:DEV DEPLOYED" ✓ (case-insensitive)

**Example labels that would NOT trigger "Dev Deployed" status:**
- "Dev Deployed" ✗ (missing "4:" prefix)
- "4: Dev Deployed" ✗ (extra space after colon)
- "4:DevDeployed" ✗ (missing space)
- "deployed" ✗ (not matching format)
- "dev-deployed" ✗ (wrong format)

**Code Reference:**
```javascript
devDeployed: ['4:dev deployed'] // Only exact match for "4:Dev Deployed" label
```

#### 3. Reviewed Cards
An issue is marked as **"Reviewed"** if it has the exact label (case-insensitive):
- `2.5 Review`

**Basis and Rules:**
1. **Label Requirement:**
   - Must have the exact label "2.5 Review" (case-insensitive)
   - The label format must match exactly: "2.5" prefix followed by "Review"
   - Note: Uses "2.5" (with decimal) not "2:" (with colon)
   - No variations or partial matches are accepted

2. **Status Priority:**
   - This status has **third highest priority** (Priority 3)
   - Will override Done, In Progress, and Assigned statuses
   - Will be overridden by "4:Dev Deployed" or "5:Dev Checked" if present

3. **Workflow Context:**
   - Represents code that has been reviewed by peers or reviewers
   - Applied after code is ready for review and review has been completed
   - Typically comes after "2:In Progress" and before "4:Dev Deployed" in the workflow
   - Indicates the code review process has been completed

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - Issue state does not affect the status determination (only the label matters)

6. **Common Misconceptions:**
   - "reviewed", "approved", "merged", "pr merged" labels will NOT trigger this status
   - Only the exact label "2.5 Review" will work
   - The decimal point in "2.5" is required (not "2:Review" or "2 Review")

**Example labels that would trigger "Reviewed" status:**
- "2.5 Review" ✓
- "2.5 review" ✓ (case-insensitive)
- "2.5 REVIEW" ✓ (case-insensitive)

**Example labels that would NOT trigger "Reviewed" status:**
- "reviewed" ✗
- "Review Done" ✗
- "approved" ✗
- "pr merged" ✗
- "2:Review" ✗ (wrong prefix format)
- "2 Review" ✗ (missing decimal point)
- "2.5:Review" ✗ (wrong format)
- "review" ✗ (missing "2.5" prefix)

**Code Reference:**
```javascript
reviewed: ['2.5 review'] // Only exact match for "2.5 Review" label
```

#### 4. Done Cards
An issue is marked as **"Done"** if it has the exact label (case-insensitive):
- `3:Local Done`

**Basis and Rules:**
1. **Label Requirement:**
   - Must have the exact label "3:Local Done" (case-insensitive)
   - The label format must match exactly: "3:" prefix followed by "Local Done"
   - Note: "Local" is part of the required label text
   - No variations or partial matches are accepted

2. **Status Priority:**
   - This status has **fourth priority** (Priority 4)
   - Will override In Progress and Assigned statuses
   - Will be overridden by "2.5 Review", "4:Dev Deployed", or "5:Dev Checked" if present

3. **Workflow Context:**
   - Represents work that has been completed locally by the developer
   - Applied when the developer has finished their work but it hasn't been reviewed or deployed yet
   - Typically comes after "2:In Progress" in the workflow
   - Indicates local completion but not yet reviewed or deployed

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - The issue state (OPEN/CLOSED) does NOT affect the "Done" status - only the label matters
   - A closed issue without the "3:Local Done" label will NOT be counted as "Done"

6. **Common Misconceptions:**
   - "done", "completed", "finished", "closed" labels will NOT trigger this status
   - Only the exact label "3:Local Done" will work
   - The word "Local" is required (not just "3:Done")
   - Closing an issue does NOT automatically make it "Done" - the label is required

7. **Label Format Details:**
   - Must use colon ":" after the number (not space or dash)
   - Must include "Local" in the label text
   - Case of letters doesn't matter, but format must match exactly

**Example labels that would trigger "Done" status:**
- "3:Local Done" ✓
- "3:local done" ✓ (case-insensitive)
- "3:LOCAL DONE" ✓ (case-insensitive)

**Example labels that would NOT trigger "Done" status:**
- "done" ✗
- "completed" ✗
- "closed" ✗
- "task-done" ✗
- "Local Done" ✗ (missing "3:" prefix)
- "3:Done" ✗ (missing "Local")
- "3: Done" ✗ (extra space after colon)
- "3-Local Done" ✗ (wrong separator)

**Code Reference:**
```javascript
done: ['3:local done'] // Only exact match for "3:Local Done" label

// Matching logic:
if (statusLabels.done.includes(name)) return 'done';
```

#### 5. In Progress Cards
An issue is marked as **"In Progress"** if it has the exact label (case-insensitive):
- `2:In Progress`

**Basis and Rules:**
1. **Label Requirement:**
   - Must have the exact label "2:In Progress" (case-insensitive)
   - The label format must match exactly: "2:" prefix followed by "In Progress"
   - Note: "In Progress" has a space between words (not "InProgress" or "In-Progress")
   - No variations or partial matches are accepted

2. **Status Priority:**
   - This status has **fifth priority** (Priority 5)
   - Will override Assigned status
   - Will be overridden by "3:Local Done", "2.5 Review", "4:Dev Deployed", or "5:Dev Checked" if present
   - This status is only checked if the issue is NOT already marked with a higher priority status

3. **Workflow Context:**
   - Represents work that is actively being worked on by the developer
   - Applied when the developer has started working on the issue
   - Typically comes after assignment and before "3:Local Done" in the workflow
   - Indicates active development is in progress

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - Issue state does not affect the status determination (only the label matters)
   - An issue can be "In Progress" even if it's closed (if it has the label)

6. **Common Misconceptions:**
   - "in progress", "in-progress", "wip", "doing", "working" labels will NOT trigger this status
   - Only the exact label "2:In Progress" will work
   - The space between "In" and "Progress" is required
   - The "2:" prefix is mandatory

7. **Label Format Details:**
   - Must use colon ":" after the number (not space or dash)
   - Must have a space between "In" and "Progress"
   - Case of letters doesn't matter, but format must match exactly

8. **When to Use:**
   - Apply this label when development work has started
   - Use it to track active work in progress
   - Remove or replace with higher priority labels as work progresses

**Example labels that would trigger "In Progress" status:**
- "2:In Progress" ✓
- "2:in progress" ✓ (case-insensitive)
- "2:IN PROGRESS" ✓ (case-insensitive)

**Example labels that would NOT trigger "In Progress" status:**
- "in progress" ✗
- "in-progress" ✗
- "wip" ✗
- "doing" ✗
- "In Progress" ✗ (missing "2:" prefix)
- "2:InProgress" ✗ (missing space)
- "2: In Progress" ✗ (extra space after colon)
- "2-In Progress" ✗ (wrong separator)

**Code Reference:**
```javascript
inProgress: ['2:in progress'] // Only exact match for "2:In Progress" label

// Matching logic:
if (statusLabels.inProgress.includes(name)) return 'inProgress';
```

#### 6. Assigned Cards (Default)
An issue is marked as **"Assigned"** if:
- It has assignees
- It doesn't match any of the above status labels
- It's not closed (or if closed, it has no status labels)

**Basis and Rules:**
1. **Label Requirement:**
   - No specific label is required
   - This is the **default status** when no status labels are present
   - Any issue without status labels ("2:In Progress", "3:Local Done", etc.) will be counted as "Assigned"

2. **Status Priority:**
   - This status has **lowest priority** (Priority 6)
   - Will be overridden by any of the above status labels if present
   - Used as fallback when no status labels match

3. **Workflow Context:**
   - Represents issues that have been assigned but work hasn't started yet
   - Applied when an issue is assigned but no status label has been added
   - Typically the initial state after assignment
   - Indicates the issue is ready to be worked on but hasn't been started

4. **Assignment Requirements:**
   - User must be assigned to the issue within the selected date range
   - User must still be currently assigned to the issue
   - Assignment date is determined from the most recent ASSIGNED_EVENT timeline item

5. **Issue State:**
   - Works with both OPEN and CLOSED issues
   - Closed issues without status labels will also be counted as "Assigned"
   - Issue state does not affect the status determination

6. **When This Status Applies:**
   - Issue has assignees but no status labels
   - Issue was assigned within the date range
   - Issue doesn't match any of the defined status label patterns
   - Issue may be OPEN or CLOSED

7. **Common Scenarios:**
   - Newly assigned issues without any status labels
   - Issues that haven't been updated with status labels yet
   - Issues that were closed without proper status labeling
   - Issues with only non-status labels (e.g., "bug", "feature", "frontend")

8. **Best Practice:**
   - Apply appropriate status labels as work progresses
   - Use "2:In Progress" when work starts
   - Update to higher priority labels as work moves through the workflow
   - Avoid leaving issues in "Assigned" state for extended periods

## Assignment Date Filtering

### Important: Date Range Filtering
Issues are only counted if:
1. The user was assigned to the issue within the selected date range (Today, Yesterday, This Week, etc.)
2. The user is still currently assigned to the issue

**How assignment dates are tracked:**
- The system fetches `ASSIGNED_EVENT` timeline items from GitHub
- For each user, it finds the most recent assignment event
- Only assignments that occurred within the selected date range are counted
- The issue must still have the user as a current assignee

**Example:**
- User was assigned on Monday (within "This Week" range)
- User is still assigned to the issue
- Issue has label "3:Local Done"
- **Result:** Counted as "Done Cards" for that user

## Implementation Details

### GraphQL Query
The system queries GitHub for:
```graphql
{
  repository(owner: $owner, name: $repo) {
    issues {
      state                    # OPEN or CLOSED
      labels(first: 10) {
        nodes {
          name                 # Label name (used for status detection)
        }
      }
      assignees(first: 10) {
        nodes {
          login                # Current assignees
        }
      }
      timelineItems(first: 20, itemTypes: [ASSIGNED_EVENT]) {
        nodes {
          createdAt            # Assignment date
          assignee {
            login              # User who was assigned
          }
        }
      }
    }
  }
}
```

### Status Detection Function
```javascript
function getStatusFromLabels(labels) {
  const labelNames = labels.map((l) => l.name.toLowerCase());
  
  // Check in priority order: devChecked > devDeployed > reviewed > done > inProgress
  for (const name of labelNames) {
    if (statusLabels.devChecked.includes(name)) return 'devChecked';
    if (statusLabels.devDeployed.includes(name)) return 'devDeployed';
    if (statusLabels.reviewed.includes(name)) return 'reviewed';
    if (statusLabels.done.includes(name)) return 'done';
    if (statusLabels.inProgress.includes(name)) return 'inProgress';
  }
  return 'assigned'; // Default
}
```

### Final Status Assignment
```javascript
// Get status from labels (priority order: devChecked > devDeployed > reviewed > done > inProgress > assigned)
let status = getStatusFromLabels(labels);
```

## Examples

### Example 1: Dev Checked Card (Highest Priority)
- **Issue State:** OPEN
- **Labels:** ["feature", "5:Dev Checked", "frontend"]
- **Result:** Counted as "Dev Checked Cards"

### Example 2: Dev Deployed Card
- **Issue State:** OPEN
- **Labels:** ["bug", "4:Dev Deployed", "backend"]
- **Result:** Counted as "Dev Deployed Cards"

### Example 3: Reviewed Card
- **Issue State:** OPEN
- **Labels:** ["feature", "2.5 Review", "frontend"]
- **Result:** Counted as "Reviewed Cards"

### Example 4: Done Card
- **Issue State:** OPEN
- **Labels:** ["bug", "3:Local Done", "backend"]
- **Result:** Counted as "Done Cards"

### Example 5: In Progress Card
- **Issue State:** OPEN
- **Labels:** ["feature", "2:In Progress", "backend"]
- **Result:** Counted as "In Progress Cards"

### Example 6: Assigned Card
- **Issue State:** OPEN
- **Labels:** ["bug", "frontend"] (no status labels)
- **Result:** Counted as "Assigned Cards"

### Example 7: Priority Order (Dev Checked takes precedence)
- **Issue State:** OPEN
- **Labels:** ["3:Local Done", "2.5 Review", "5:Dev Checked", "frontend"]
- **Result:** Counted as "Dev Checked Cards" (devChecked has highest priority)

### Example 8: Priority Order (Dev Deployed takes precedence over Reviewed)
- **Issue State:** OPEN
- **Labels:** ["2.5 Review", "4:Dev Deployed", "frontend"]
- **Result:** Counted as "Dev Deployed Cards" (devDeployed has higher priority than reviewed)

## Label Matching
- Matching is **case-insensitive**
- Matching uses **substring matching** (e.g., "in-progress" matches "in-progress-label")
- Only the **first matching label** in priority order determines the status

## Limitations
1. **Label dependency:** Status detection relies on GitHub labels. If labels are not used consistently, status may be incorrect.
2. **Timeline limit:** Only the first 20 assignment events are fetched per issue. For issues with many assignment changes, older events may not be considered.
3. **Label limit:** Only the first 10 labels per issue are fetched. If status labels are beyond this limit, they won't be detected.
4. **Exact labels required:** All status labels require exact matches (case-insensitive). Variations or similar labels will not be recognized:
   - "2:In Progress" for In Progress Cards
   - "2.5 Review" for Reviewed Cards
   - "3:Local Done" for Done Cards
   - "4:Dev Deployed" for Dev Deployed Cards
   - "5:Dev Checked" for Dev Checked Cards

## Recommendations
1. **Use the exact labels:** Always use the exact labels (case variations are acceptable):
   - "2:In Progress" for In Progress Cards
   - "2.5 Review" for Reviewed Cards
   - "3:Local Done" for Done Cards
   - "4:Dev Deployed" for Dev Deployed Cards
   - "5:Dev Checked" for Dev Checked Cards
2. **Use consistent labels:** Establish a labeling convention for your team and ensure all team members use the same label format.
3. **Use status labels:** Apply appropriate status labels to issues to ensure accurate categorization.
4. **Label verification:** Verify that issues have the correct labels before expecting them to appear in the respective columns.
5. **Priority awareness:** Remember that if an issue has multiple status labels, the one with highest priority will be used (Dev Checked > Dev Deployed > Reviewed > Done > In Progress > Assigned).

## File Location
- **Backend Logic:** `backend/src/services/githubService.js`
- **Function:** `getIssuesByUserForPeriod()`
- **Status Detection:** Lines 285-301, 389-395

## Real-Time Updates

The Staff Ranking system supports real-time updates via WebSocket and GitHub Webhooks.

### How It Works
1. **WebSocket Connection:** The frontend maintains a WebSocket connection to the backend
2. **GitHub Webhooks:** GitHub sends notifications when issues are modified (assigned, labeled, etc.)
3. **Broadcast:** The backend receives webhook events and broadcasts updates to connected clients
4. **Auto-Refresh:** When an update is received for the current repository, the data refreshes automatically

### Setting Up GitHub Webhooks

To enable real-time updates, configure a webhook in your GitHub repository:

1. Go to your repository → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://your-backend-url/api/webhooks/github`
3. **Content type:** `application/json`
4. **Secret:** Set a secret and add it to `.env` as `GITHUB_WEBHOOK_SECRET`
5. **Events to send:**
   - Issues (opened, closed, labeled, unlabeled, assigned, unassigned)
   - Pull requests (for PR merge events)

### Environment Variables

Add to your backend `.env`:
```
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

### WebSocket Endpoint
- **URL:** `ws://localhost:4000/ws` (or your production URL)
- **Messages:**
  - `{ type: 'subscribe', repo: 'owner/repo' }` - Subscribe to a repository
  - `{ type: 'unsubscribe', repo: 'owner/repo' }` - Unsubscribe from a repository

### Connection Indicator
The Staff Ranking page shows a "Live" indicator when connected to WebSocket:
- 🟢 **Live** - Real-time updates are active
- ⚫ **Offline** - Attempting to reconnect
