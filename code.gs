/**
 * GMAIL EXPORTER: STRICT INBOX ONLY
 */
function exportInboxOnly() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(1000); } catch (e) { return; }

  const startTime = new Date().getTime();
  const scriptProperties = PropertiesService.getScriptProperties();
  const rootFolderId = scriptProperties.getProperty('backupFolderId');
  const rootFolder = DriveApp.getFolderById(rootFolderId);

  // 1. EXIT IF FINISHED
  if (scriptProperties.getProperty('isExportFinished') === 'true') {
    console.log("Inbox export is already marked as finished.");
    return;
  }

  const batchSize = 50; 
  const searchQuery = "is:inbox"; // Targets only messages in the Inbox
  
  let start = parseInt(scriptProperties.getProperty('skipCount')) || 0;
  scriptProperties.setProperty('skipCount', (start + batchSize).toString());

  // Helper for folder creation
  function getOrCreateSubFolder(parentFolder, pathString) {
    const parts = pathString.split('/');
    let currentFolder = parentFolder;
    for (const part of parts) {
      let folderFound = false;
      for (let i = 0; i < 5; i++) {
        try {
          const iter = currentFolder.getFoldersByName(part);
          currentFolder = iter.hasNext() ? iter.next() : currentFolder.createFolder(part);
          folderFound = true;
          break; 
        } catch (e) { Utilities.sleep(Math.pow(2, i) * 1000); }
      }
    }
    return currentFolder;
  }

  // 2. PROCESS THREADS
  const threads = GmailApp.search(searchQuery, start, batchSize);

  if (!threads || threads.length === 0) {
    console.log("Inbox export complete.");
    scriptProperties.setProperty('isExportFinished', 'true');
    return; 
  }

  console.log("Processing Inbox threads: " + start + " to " + (start + threads.length));

  threads.forEach(thread => {
    const threadId = thread.getId();
    
    thread.getMessages().forEach(msg => {
      // Logic: Only export messages that are actually in the Inbox
      // This filters out Sent replies within an Inbox thread if you want it strict
      if (msg.isInInbox()) {
        const msgId = msg.getId();
        const folderPath = "System/Inbox";
        const targetFolder = getOrCreateSubFolder(rootFolder, folderPath);
        const fileName = threadId + "_" + msgId + ".eml";

        try {
          // Check for existing file to avoid duplicates
          if (!targetFolder.getFilesByName(fileName).hasNext()) {
            targetFolder.createFile(fileName, msg.getRawContent(), "message/rfc822");
          }
        } catch (e) {
          console.log("Error saving msg " + msgId + ": " + e.message);
        }
      }
    });
  });

  lock.releaseLock();
}
/**
 * RESET FUNCTION: Wipes the counter, clears the finish flag, 
 * and deletes all files/folders inside the backup directory.
 */
function resetDeepArchive() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const rootFolderId = scriptProperties.getProperty('backupFolderId');
  
  // 1. Reset Internal Progress Tracking
  scriptProperties.setProperty('skipCount', '0');
  scriptProperties.setProperty('isExportFinished', 'false');

  // 2. Delete Drive Contents
  if (rootFolderId) {
    try {
      const rootFolder = DriveApp.getFolderById(rootFolderId);
      console.log("Cleaning up Drive folder: " + rootFolder.getName());
      
      // Delete all files inside the root
      const files = rootFolder.getFiles();
      while (files.hasNext()) {
        files.next().setTrashed(true);
      }
      
      // Delete all sub-folders (Inbox, Sent, etc.)
      const subFolders = rootFolder.getFolders();
      while (subFolders.hasNext()) {
        subFolders.next().setTrashed(true);
      }
      
      console.log("Drive contents moved to Trash.");
    } catch (e) {
      console.log("Could not find or clean the Drive folder: " + e.message);
    }
  }

  // 3. Clear Spreadsheet (if you are still using it for logs)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.clear();
  
  console.log("Reset Complete. System is now empty and ready for a fresh run.");
  
  try {
    SpreadsheetApp.getUi().alert("Reset Successful: Drive files trashed and counter set to zero.");
  } catch(e) {}
}
