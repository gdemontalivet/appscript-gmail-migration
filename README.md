# Gmail to Google Drive Migration Tool

## 1. Overview
This script automates the export of Gmail messages to Google Drive as `.eml` files. It is designed to handle large inboxes (4,500+ emails) by processing them in small batches using time-based triggers to bypass Google's execution limits.

The script preserves the original email headers (`Message-ID`, `In-Reply-To`), ensuring that conversation threads can be reconstructed by your destination mail client upon import.

## 2. Folder Hierarchy Logic
The tool uses a strict priority system to sort every message into the correct folder:

1.  **System/Sent Mail**: Any message sent from your email address.
2.  **System/Inbox**: Any message currently residing in your active Inbox.
3.  **Custom Labels**: Archived messages tagged with custom labels (e.g., `Work/Project A`).
4.  **System/Archive**: Archived messages with no labels.

## 3. Setup Instructions
1.  **Create a New Sheet**: Go to [sheets.new](https://sheets.new).
2.  **Open Apps Script**: Navigate to `Extensions` > `Apps Script`.
3.  **Paste the Script**: Delete any placeholder code and paste the provided script.
4.  **Run Initial Setup**:
    * Select `exportFullGmailHierarchy` from the dropdown and click **Run**.
    * Review and grant permissions for Gmail, Drive, and Script Properties.
    * This creates the root folder in your Drive.

## 4. Automating the Export (Trigger Setup)
Since Google restricts script runtime to ~6 minutes, you must set a trigger to process the full 4,500 emails:
1.  Click the **Clock icon** (Triggers) on the left sidebar.
2.  Click **+ Add Trigger**.
3.  Set "Choose which function to run" to `exportFullGmailHierarchy`.
4.  Set "Select event source" to **Time-driven**.
5.  Set "Select type of time based trigger" to **Minutes timer**.
6.  Set "Select minute interval" to **Every 10 minutes**.



## 5. Maintenance Commands
* **Monitoring Progress**: View the `Executions` tab in the script editor to see logs like `Processing batch: 500 to 550`.
* **Resetting**: To wipe your progress and start over, run the `resetDeepArchive` function. This clears the counter and moves existing Drive files to the Trash.
* **Completion**: Once the logs show `Full migration complete`, delete the trigger in the Triggers menu to stop further executions.

## 6. Technical Safeguards
* **Deduplication**: The script checks for the existence of a Message ID before creating a file.
* **Rate Limiting**: Includes "Exponential Backoff" to handle temporary Google Drive API service errors.
* **Locking**: Uses `LockService` to prevent multiple trigger instances from processing the same emails simultaneously.
