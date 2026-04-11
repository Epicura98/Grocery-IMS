/**
 * Fetches sheet data in chunks from the Google Apps Script backend.
 * Returns the first chunk immediately and continues loading the rest in the background.
 * 
 * @param {string} url - Script URL
 * @param {string} sheetName - Name of the sheet
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {function} onDataUpdate - Callback for each new chunk of data [data, isComplete]
 */
export const fetchSheetDataInBackground = async (url, sheetName, spreadsheetId, onDataUpdate) => {
  let allData = [];
  let currentPage = 0;
  const pageSize = 100;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `${url}?action=fetchPaginated&sheet=${encodeURIComponent(sheetName)}&page=${currentPage}&pageSize=${pageSize}&spreadsheetId=${spreadsheetId}`
      );
      const result = await response.json();

      if (!result.success) throw new Error(result.error);

      // result.data only contains the current page
      const chunk = result.data || [];
      
      // If result.data is empty but headers are returned (empty sheet), or if it's just empty
      if (chunk.length === 0 && currentPage === 0) {
        onDataUpdate([], true);
        return;
      }

      allData = [...allData, ...chunk];
      hasMore = result.hasMore;
      currentPage++;

      // Update the frontend with what we have so far
      onDataUpdate([...allData], !hasMore);
    }
  } catch (error) {
    console.error(`Background fetch failed for ${sheetName}:`, error);
    onDataUpdate(allData, true);
  }
};
