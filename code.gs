/**
 * GMAIL TO DRIVE: THE COMPLETE HIERARCHY EXPORTER
 */
function exportFullGmailHierarchy() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(1000); } catch (e) { return; }

  const startTime = new Date().getTime();
  const scriptProperties = PropertiesService.getScriptProperties();
  const MY_EMAIL = Session.getActiveUser().getEmail(); 

  if (scriptProperties.getProperty('isExportFinished') === 'true') return;

  const batchSize = 50; 
  const searchQuery = "-is:trash"; 
  
  let start = parseInt(scriptProperties.getProperty('skipCount')) || 0;
  scriptProperties.setProperty('skipCount', (start + batchSize).toString());

  let rootFolderId = scriptProperties.getProperty('backupFolderId');
  let rootFolder = DriveApp.getFolderById(rootFolderId);

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

  const threads = GmailApp.search(searchQuery, start, batchSize);

  if (!threads || threads.length === 0) {
    scriptProperties.setProperty('isExportFinished', 'true');
    console.log("Full migration complete.");
    return; 
  }

  threads.forEach(thread => {
    const labelNames = thread.getLabels().map(l => l.getName());
    
    thread.getMessages().forEach(msg => {
      const msgId = msg.getId();
      let folderPath = "";

      // --- ROUTING LOGIC ---
      if (msg.getFrom().includes(MY_EMAIL)) {
        folderPath = "System/Sent Mail";
      } else if (msg.isInInbox()) {
        folderPath = "System/Inbox";
      } else if (labelNames.length > 0) {
        folderPath = labelNames[0]; 
      } else {
        folderPath = "System/Archive";
      }

      const targetFolder = getOrCreateSubFolder(rootFolder, folderPath);
      const fileName = msgId + ".eml";

      try {
        if (!targetFolder.getFilesByName(fileName).hasNext()) {
          targetFolder.createFile(fileName, msg.getRawContent(), "message/rfc822");
        }
      } catch (e) {
        console.log("Skipped error on: " + msgId);
      }
    });
  });

  lock.releaseLock();
}

function resetDeepArchive() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const rootFolderId = scriptProperties.getProperty('backupFolderId');
  scriptProperties.setProperty('skipCount', '0');
  scriptProperties.setProperty('isExportFinished', 'false');
  if (rootFolderId) {
    const rootFolder = DriveApp.getFolderById(rootFolderId);
    const files = rootFolder.getFiles();
    while (files.hasNext()) files.next().setTrashed(true);
    const subFolders = rootFolder.getFolders();
    while (subFolders.hasNext()) subFolders.next().setTrashed(true);
  }
  console.log("Reset Complete.");
}
