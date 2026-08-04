# Apple Reminders Export Shortcut Setup

This Shortcut exports your Apple Reminders to JSON format for the Kindle dashboard.

## Shortcut Instructions

Follow these steps to create the Shortcut in the Shortcuts app on your iPhone:

### 1. Create New Shortcut
1. Open **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Name it: **"Export Reminders to JSON"**

### 2. Add Shortcut Actions (in order)

#### Action 1: Get Current Date
1. Search for **"Current Date"** and add it
2. This gets today's date

#### Action 2: Adjust Date (for Tomorrow)
1. Search for **"Adjust Date"** and add it
2. Set it to: **Add 1 Day** to **Current Date**
3. This creates tomorrow's date

#### Action 3: Get Reminders
1. Search for **"Find Reminders"** and add it
2. Configure the filter:
   - **List** is **"Familie"** (or whatever list name you want)
   - **Is Completed** is **false**
3. Tap **Show More** and add another filter:
   - **Due Date** is **after** Yesterday
4. **Sort by**: Due Date (Oldest First)

#### Action 4: Set Variable
1. Search for **"Set Variable"** and add it
2. Set variable name: **"AllReminders"**
3. This stores all the reminders we found

#### Action 5: Get Current Date Again
1. Add **"Current Date"** action again
2. We'll use this for filtering

#### Action 6: Repeat with Each Reminder
1. Search for **"Repeat with Each"** and add it
2. Set it to repeat with each item in **AllReminders**

#### Inside the Repeat Block:

##### Action 7: Get Details of Reminder
1. Search for **"Get Details of Reminders"** and add it
2. Get **Due Date** from **Repeat Item**

##### Action 8: Format Date (Start of Day)
1. Search for **"Adjust Date"** and add it
2. Set to: **Get Start of Day** from **Details of Reminders**
3. This gets just the date part (no time)

##### Action 9: If Statement (Check if Overdue or Today/Tomorrow)
1. Search for **"If"** and add it
2. Set condition: **Adjusted Date** is **before or on** **Current Date**
   - This catches overdue and today's tasks

##### Action 10: Add to Variable
1. Inside the If block, search for **"Add to Variable"** and add it
2. Variable name: **"FilteredReminders"**

##### Action 11: End If
1. This closes the If statement

##### Action 12: End Repeat
1. This closes the Repeat loop

#### Action 13: Format as JSON
1. Search for **"Get Dictionary from Input"** and add it
2. Input: **FilteredReminders**

For each reminder, we need to create a dictionary. This is complex in Shortcuts, so here's a **simpler approach**:

### Simplified Version (Recommended)

Instead of complex formatting, use this simpler structure:

1. **Find Reminders** (configure as above)
2. **Get Dictionary from Reminders**
3. **Get Value for Key** "title" from Dictionary
4. **Text** action with JSON template (see below)
5. **Save File** to iCloud Drive

Here's the JSON template to use in a Text action:

```
{
  "fetchedAt": "[Current Date in ISO format]",
  "tasks": [
    {
      "id": "[Reminder ID]",
      "title": "[Reminder Title]",
      "dueDate": "[Due Date ISO]",
      "isCompleted": false,
      "notes": "[Notes]",
      "isOverdue": [check if overdue]
    }
  ]
}
```

### Even Simpler: Use This Script

Actually, let me provide you with a direct import link. Copy this text and I'll help you create it:

## Quick Setup Method

1. Open this link on your iPhone: [I'll create a share link]
2. Or manually create with these key steps:
   - Get reminders from "Familie" list where "Is Completed" is false
   - Filter for due date within next 2 days
   - Convert to JSON
   - Save to iCloud Drive at: `Shortcuts/reminders.json`

### Output Location
The Shortcut should save the JSON file to:
```
iCloud Drive/Shortcuts/tasks.json
```

### Automation
Once created:
1. Go to **Automation** tab in Shortcuts
2. Create a **Time of Day** automation
3. Set it to run every hour (or every 6 hours)
4. Choose your "Export Reminders to JSON" shortcut
5. Disable "Ask Before Running"

## NAS Integration

After the Shortcut creates the file in iCloud Drive, you have options:

### Option 1: Manual Sync
- Download from iCloud Drive on your Mac
- SCP to NAS manually

### Option 2: Automatic Sync
- Set up iCloud Drive sync on your Mac
- Create a simple script to copy from iCloud Drive to NAS

### Option 3: HTTP Upload
- Modify Shortcut to POST to NAS endpoint (requires HTTP server on NAS)

---

**Note**: Creating complex JSON formatting in Shortcuts is tedious. If you want, I can create a simple web endpoint that your Shortcut can POST to, which then formats and saves the JSON properly.
