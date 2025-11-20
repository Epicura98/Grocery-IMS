"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  ArrowLeft,
  FileText,
  MapPin,
  Users,
  Phone,
  Zap,
  Building,
  Eye,
  DollarSign,
  Clock,
  Home,
  Wrench,
  Package,
  ShoppingCart,
  RotateCcw,
  Calculator,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

// INSTANT IMAGE LOADING - Optimized Image Component
const OptimizedImage = ({ src, alt, className, style, onClick }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // SIMPLE & FAST URL EXTRACTION
  const getFastImageUrl = useCallback((url) => {
    if (!url || url === "No Image" || url === "" || url === null) return null;
    
    // Fast file ID extraction - single regex pattern
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || 
                       url.match(/id=([a-zA-Z0-9-_]+)/) ||
                       url.match(/\/([a-zA-Z0-9-_]{25,})/);
    
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    
    if (fileId && fileId.length >= 25) {
      // Use ONLY the fastest method - direct thumbnail
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500&authuser=0`;
    }
    
    return null;
  }, []);

  // INSTANT SETUP - Minimal processing
  useEffect(() => {
    if (src) {
      const fastUrl = getFastImageUrl(src);
      if (fastUrl) {
        setImgSrc(fastUrl);
        setLoading(true);
        setError(false);
      } else {
        setError(true);
        setLoading(false);
      }
    } else {
      setError(true);
      setLoading(false);
    }
  }, [src, getFastImageUrl]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  if (error || !imgSrc) {
    return (
      <div className="flex items-center justify-center h-16 w-24 bg-gray-100 rounded border border-gray-200">
        <FileText className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${loading ? 'invisible' : 'visible'}`}
        style={style}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

// FAST Image compression - minimal processing
const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // Quick resize calculation
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Fast draw - no fancy settings
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((compressedBlob) => {
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbz_705CZWY7WafvEwM309BuWKOOYi24B9tlCuwUaLBvQSy9PzD7nkojRUcRajaBCchv/exec",
  DRIVE_FOLDER_ID: "113JJSny0edSxkwl9MpjTmNJo0uZuHqVn",
  SOURCE_SHEET_NAME: "INVENTORY",
  HISTORY_SHEET_NAME: "INVENTORY History",
  PAGE_CONFIG: {
    title: "All INVENTORY",
    historyTitle: "History",
  },
};

// Column configuration with foodName added
const COLUMN_CONFIG = [
  { key: 'action', label: 'ACTION', pendingOnly: true },
  { key: 'serialNo', label: 'SERIAL NO', pendingOnly: false },
  { key: 'inventoryNo', label: 'INVENTORY NO', pendingOnly: false },
  { key: 'inventoryType', label: 'INVENTORY TYPE', pendingOnly: false },
  { key: 'department', label: 'DEPARTMENT', pendingOnly: false },
  { key: 'itemsName', label: 'ITEMS NAME', pendingOnly: false },
  { key: 'foodName', label: 'FOOD NAME', pendingOnly: false },
  { key: 'openingBalance', label: 'OPENING BALANCE', pendingOnly: false },
  { key: 'issueData', label: 'ISSUE DATA', pendingOnly: false },
  { key: 'returnData', label: 'RETURN DATA', pendingOnly: false },
  { key: 'damageItems', label: 'DAMAGE ITEMS', pendingOnly: false },
  { key: 'missingItems', label: 'MISSING ITEMS', pendingOnly: false },
  { key: 'closingBalance', label: 'CLOSING BALANCE', pendingOnly: false },
  { key: 'uploadFile', label: 'UPLOAD FILE', pendingOnly: false },
  { key: 'unit', label: 'UNIT', pendingOnly: false },
  { key: 'perUnitPrice', label: 'PER UNIT PRICE', pendingOnly: false },
  { key: 'eventDate', label: 'EVENT DATE', pendingOnly: false },
  { key: 'remarks', label: 'REMARKS', pendingOnly: false },
];

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Function to format date to dd/mm/yyyy
function formatDate(dateString) {
  if (!dateString) return "";
  if (typeof dateString === "string" && dateString.includes("/")) return dateString;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
}

// Function to convert date string to Date object for comparison
function parseDate(dateString) {
  if (!dateString) return null;
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  return new Date(dateString);
}

function Inventory() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [inventoryTypes, setInventoryTypes] = useState([]);
  const [selectedInventoryType, setSelectedInventoryType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editableData, setEditableData] = useState({});

  // Column visibility states
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initialState = {};
    COLUMN_CONFIG.forEach(col => {
      initialState[col.key] = true;
    });
    return initialState;
  });

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const user = sessionStorage.getItem("username");
    setUserRole(role);
    setUsername(user);
    fetchData();
    fetchInventoryTypes();
  }, []);

  // Close column filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnFilter && !event.target.closest('.column-filter-container')) {
        setShowColumnFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter]);

  // Fetch inventory types from Master Drop-Down sheet
  const fetchInventoryTypes = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=Master Drop-Down&action=fetch&ts=${Date.now()}`);
      const result = await response.json();
      if (result.success && result.data) {
        const types = [...new Set(result.data.slice(1).map(row => row[0]).filter(Boolean))];
        setInventoryTypes(types);
      }
    } catch (err) {
      console.error('Error fetching inventory types:', err);
    }
  }, []);

  // INSTANT DATA FETCH - No cache, immediate loading
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // PENDING DATA - Fetch from INVENTORY sheet with timestamp for no cache
      const timestamp = Date.now();
      const pendingResponse = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch&ts=${timestamp}&nocache=${Math.random()}`);
      const pendingResult = await pendingResponse.json();

      if (!pendingResult.success) {
        throw new Error(pendingResult.error || "Failed to fetch pending data");
      }

      // Map pending data from INVENTORY sheet WITH FILTER TO REMOVE EMPTY ROWS
      const pendingRows = pendingResult.data.slice(1)
        .map((row, index) => ({
          id: index + 1,
          timestamp: row[0] || '',
          serialNo: row[1] || '',
          inventoryNo: row[2] || '',
          inventoryType: row[3] || '',
          department: row[4] || '',
          itemsName: row[5] || '',
          foodName: row[22] || '',
          openingBalance: parseInt(row[7]) || 0,
          purchaseData: parseInt(row[8]) || 0,
          issueData: parseInt(row[9]) || 0,
          returnData: parseInt(row[10]) || 0,
          damageItems: parseInt(row[11]) || 0,
          missingItems: parseInt(row[12]) || 0,
          closingBalance: parseInt(row[13]) || 0,
          totalBalance: parseInt(row[14]) || 0,
          uploadFile: row[15] || null,
          unit: row[16] || '',
          perUnitPrice: parseInt(row[17]) || 0,
          eventDate: row[19] || '',
          remarks: row[20] || '',
          inventry: row[21] || '',
        }))
        .filter(record => {
          // Filter out rows where all key fields are empty or zero
          const hasData = record.serialNo || record.inventoryNo || record.inventoryType || 
                         record.department || record.itemsName || record.foodName ||
                         record.openingBalance > 0 || record.purchaseData > 0 || 
                         record.issueData > 0 || record.returnData > 0 || 
                         record.damageItems > 0 || record.missingItems > 0 || 
                         record.closingBalance > 0 || record.totalBalance > 0 || 
                         record.uploadFile || record.unit || record.perUnitPrice > 0 || 
                         record.eventDate || record.remarks;
          return hasData;
        });

      // HISTORY DATA - Fetch from INVENTORY History sheet with better error handling
      let historyRows = [];
      try {
        const historyResponse = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.HISTORY_SHEET_NAME}&action=fetch&ts=${timestamp}&nocache=${Math.random()}`);
        const historyResult = await historyResponse.json();

        if (historyResult.success && historyResult.data && historyResult.data.length > 1) {
          // Map history data from INVENTORY History sheet WITH FILTER TO REMOVE EMPTY ROWS
          historyRows = historyResult.data.slice(1)
            .map((row, index) => ({
              id: index + 1000, // Different ID range for history
              timestamp: row[0] || '',
              serialNo: row[1] || '',
              inventoryNo: row[2] || '',
              inventoryType: row[3] || '',
              department: row[4] || '',
              itemsName: row[5] || '',
              foodName: row[22] || '',
              openingBalance: parseInt(row[7]) || 0,
              purchaseData: parseInt(row[8]) || 0,
              issueData: parseInt(row[9]) || 0,
              returnData: parseInt(row[10]) || 0,
              damageItems: parseInt(row[11]) || 0,
              missingItems: parseInt(row[12]) || 0,
              closingBalance: parseInt(row[13]) || 0,
              totalBalance: parseInt(row[14]) || 0,
              uploadFile: row[15] || null,
              unit: row[16] || '',
              perUnitPrice: parseInt(row[17]) || 0,
              eventDate: row[19] || '',
              remarks: row[20] || '',
              inventry: row[21] || '',
            }))
            .filter(record => {
              // Filter out rows where all key fields are empty or zero
              const hasData = record.serialNo || record.inventoryNo || record.inventoryType || 
                             record.department || record.itemsName || record.foodName ||
                             record.openingBalance > 0 || record.purchaseData > 0 || 
                             record.issueData > 0 || record.returnData > 0 || 
                             record.damageItems > 0 || record.missingItems > 0 || 
                             record.closingBalance > 0 || record.totalBalance > 0 || 
                             record.uploadFile || record.unit || record.perUnitPrice > 0 || 
                             record.eventDate || record.remarks;
              return hasData;
            });
        } else {
          console.log('No history data found or empty history sheet');
        }
      } catch (historyError) {
        console.error('Error fetching history data:', historyError);
        // Don't throw error, just log it and continue with empty history
      }

      setHistoryData(historyRows);
      setPendingData(pendingRows); // Show all pending rows

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Show ALL data from INVENTORY sheet (no filtering)
  const filteredPendingData = useMemo(() => {
    let filteredData = pendingData; // NO COLUMN V FILTER - Show all data from INVENTORY sheet

    // Additional filters
    if (selectedInventoryType) {
      filteredData = filteredData.filter(
        (record) => record.inventoryType === selectedInventoryType
      );
    }

    if (selectedDate) {
      filteredData = filteredData.filter((record) => {
        if (!record.eventDate) return false;
        const recordDate = parseDate(record.eventDate);
        if (!recordDate) return false;

        const filterDate = new Date(selectedDate);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        const filterDateStr = `${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}-${String(filterDate.getDate()).padStart(2, '0')}`;
        
        return recordDateStr === filterDateStr;
      });
    }

    return filteredData;
  }, [pendingData, selectedInventoryType, selectedDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const filteredData = filteredPendingData;
    
    const totalOpeningBalance = filteredData.reduce((sum, item) => sum + (item.openingBalance || 0), 0);
    const totalIssueData = filteredData.reduce((sum, item) => sum + (item.issueData || 0), 0);
    const totalClosingBalance = filteredData.reduce((sum, item) => sum + (item.closingBalance || 0), 0);
    const totalReturn = filteredData.reduce((sum, item) => sum + (item.returnData || 0), 0);

    return {
      totalOpeningBalance,
      totalIssueData,
      totalClosingBalance,
      totalReturn,
    };
  }, [filteredPendingData]);

  // Show ALL data from INVENTORY History sheet (no filtering)
  const filteredHistoryData = useMemo(() => {
    let filteredData = historyData; // NO COLUMN V FILTER - Show all data from INVENTORY History sheet

    // Additional filters
    if (selectedInventoryType) {
      filteredData = filteredData.filter(
        (record) => record.inventoryType === selectedInventoryType
      );
    }

    if (selectedDate) {
      filteredData = filteredData.filter((record) => {
        if (!record.eventDate) return false;
        const recordDate = parseDate(record.eventDate);
        if (!recordDate) return false;

        const filterDate = new Date(selectedDate);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        const filterDateStr = `${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}-${String(filterDate.getDate()).padStart(2, '0')}`;
        
        return recordDateStr === filterDateStr;
      });
    }

    return filteredData;
  }, [historyData, selectedInventoryType, selectedDate]);

  // Function to download data as Excel
  const downloadExcel = useCallback(() => {
    const dataToDownload = showHistory ? filteredHistoryData : filteredPendingData;
    
    if (dataToDownload.length === 0) {
      alert("No data to download");
      return;
    }

const headers = ["Inventory No", "Inventory Type", "Department", "Items Name", "Food Name", "Issue Data", "Return Data", "Missing Item", "Damage Item", "Upload file-url"];
const csvContent = [
  headers.join(","),
  ...dataToDownload.map(item => [
    item.inventoryNo,
    item.inventoryType.replace(/,/g, ""),
    item.department.replace(/,/g, ""),
    item.itemsName.replace(/,/g, ""),
    item.foodName ? item.foodName.replace(/,/g, "") : "",
    item.issueData || 0,
    item.returnData || 0,
    item.missingItems || 0,
    item.damageItems || 0,
    item.uploadFile || ""
  ].join(","))
].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", showHistory ? "inventory_history_pending_inventory_data.csv" : "inventory_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredPendingData, filteredHistoryData, showHistory]);

  const handleRowSelect = useCallback((id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        setEditableData(prevData => {
          const newData = { ...prevData };
          delete newData[id];
          return newData;
        });
      } else {
        newSet.add(id);
        const rowData = filteredPendingData.find(item => item.id === id);
        if (rowData) {
          setEditableData(prevData => ({
            ...prevData,
            [id]: { ...rowData }
          }));
        }
      }
      return newSet;
    });
  }, [filteredPendingData]);

  const handleEditableChange = useCallback((id, field, value) => {
    setEditableData(prevData => ({
      ...prevData,
      [id]: {
        ...prevData[id],
        [field]: value
      }
    }));
  }, []);

  const uploadFileToDrive = useCallback(async (file) => {
  try {
    // Skip compression for faster uploads - let Google Drive handle it
    let processedFile = file;
    
    // Only compress if really large (>5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('Fast compressing large image:', file.name);
      processedFile = await compressImage(file, 800, 600, 0.8);
    }

    const base64Data = await fileToBase64(processedFile);

    // Fast upload with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "uploadFile",
        base64Data: base64Data,
        fileName: processedFile.name,
        mimeType: processedFile.type,
        folderId: CONFIG.DRIVE_FOLDER_ID,
      }),
    });

    clearTimeout(timeoutId);

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to upload file");
    }

    return result.fileUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}, []);

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Submit updates to INVENTORY History sheet
  const handleSaveChanges = useCallback(async () => {
    try {
      setLoading(true);

      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimestamp = `${day}/${month}/${year}, ${hours}:${minutes}`;

      const updates = await Promise.all(
        Array.from(selectedRows).map(async (id) => {
          const data = editableData[id];
          let fileUrl = data.uploadFile;

          if (data.uploadFile instanceof File) {
            fileUrl = await uploadFileToDrive(data.uploadFile);
          }

          return {
            id,
            rowData: [
              currentTimestamp, // Column A
              "",               // Column B - Empty
              data.inventoryNo || "",  // Column C
              data.inventoryType || "", // Column D
              data.department || "",   // Column E
              data.itemsName || "",    // Column F
              "",                     // Column G - Empty
              data.openingBalance || 0, // Column H
              data.purchaseData || 0,   // Column I
              data.issueData || 0,      // Column J
              data.returnData || 0,     // Column K
              data.damageItems || 0,    // Column L
              data.missingItems || 0,   // Column M
              data.closingBalance || 0, // Column N
              data.totalBalance || 0,   // Column O
              fileUrl,                  // Column P
              data.unit || "",          // Column Q
              data.perUnitPrice || 0,   // Column R
              "",                       // Column S - Empty
              data.eventDate || "",     // Column T
              data.remarks || "",       // Column U
              "all inventory",          // Column V - automatically set to "all inventory"
              data.foodName || "",      // Column W
            ],
          };
        })
      );

      // Create new rows in INVENTORY History sheet
      for (const update of updates) {
        const updateResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            action: "update",
            sheetName: CONFIG.HISTORY_SHEET_NAME, // Submit to INVENTORY History
            rowData: JSON.stringify(update.rowData),
          }),
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          throw new Error(updateResult.error || "Failed to create new row");
        }
      }

      await fetchData();
      setSelectedRows(new Set());
      setEditableData({});
      setSuccessMessage("Changes saved successfully to inventory history!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving changes:", err);
      setError(err.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  }, [editableData, selectedRows, fetchData, uploadFileToDrive]);

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history");
    setSelectedRows(new Set());
    setEditableData({});
  }, []);

  const handleColumnToggle = useCallback((columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  const handleSelectAllColumns = useCallback((e) => {
    e.stopPropagation();
    const newState = {};
    COLUMN_CONFIG.forEach(col => {
      if (showHistory && col.pendingOnly) return;
      newState[col.key] = true;
    });
    setVisibleColumns(newState);
  }, [showHistory]);

  const getVisibleColumnsForCurrentSection = useCallback(() => {
    return COLUMN_CONFIG.filter(col => {
      if (showHistory && col.pendingOnly) return false;
      return visibleColumns[col.key];
    });
  }, [visibleColumns, showHistory]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header - More compact */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-blue-700">
            {CONFIG.PAGE_CONFIG.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {/* Inventory Type Dropdown */}
            <select
              value={selectedInventoryType}
              onChange={(e) => setSelectedInventoryType(e.target.value)}
              className="px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">All Inventory Types</option>
              {inventoryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:border-blue-400 text-sm bg-white"
            />

            <button
              onClick={downloadExcel}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            {selectedRows.size > 0 && !showHistory && (
              <button
                onClick={handleSaveChanges}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Summary Statistics - More compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Total Opening Balance</p>
                <p className="text-xl font-bold">{summaryStats.totalOpeningBalance}</p>
              </div>
              <Package className="h-6 w-6 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Total Issue Data</p>
                <p className="text-xl font-bold">{summaryStats.totalIssueData}</p>
              </div>
              <ShoppingCart className="h-6 w-6 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs">Total Return</p>
                <p className="text-xl font-bold">{summaryStats.totalReturn}</p>
              </div>
              <RotateCcw className="h-6 w-6 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Closing Balance</p>
                <p className="text-xl font-bold">{summaryStats.totalClosingBalance.toLocaleString()}</p>
              </div>
              <Calculator className="h-6 w-6 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Section Toggle Buttons */}
        <div className="flex space-x-1 border-b border-gray-200 mb-4">
          <button
            onClick={() => toggleSection("pending")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pending Inventory ({filteredPendingData.length})
            </div>
          </button>
          <button
            onClick={() => toggleSection("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Inventory History ({filteredHistoryData.length})
            </div>
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Table Container - FIXED */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3 flex items-center justify-between">
            <div>
              <h2 className="text-blue-700 font-medium text-sm">
                {showHistory ? "Inventory History" : "Pending Inventory Items"}
              </h2>
              <p className="text-blue-600 text-xs">
                {showHistory ? "All records from INVENTORY History sheet" : "All records from INVENTORY sheet - select rows to complete"}
              </p>
            </div>

            {/* Column Filter Button */}
            <div className="relative column-filter-container">
              <button
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                <Filter className="h-4 w-4" />
                Columns
              </button>

              {showColumnFilter && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900 text-sm mb-2">Show/Hide Columns</h3>
                    <button
                      onClick={handleSelectAllColumns}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {COLUMN_CONFIG.filter(col => !showHistory || !col.pendingOnly).map((column) => (
                      <label key={column.key} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns[column.key] || false}
                          onChange={() => handleColumnToggle(column.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                        />
                        <span className="text-sm text-gray-700">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Content - FIXED LAYOUT */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-blue-600">Loading inventory data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-md text-red-800 text-center">
              {error}
              <button className="underline ml-2" onClick={fetchData}>
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {!showHistory && visibleColumns.action && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                          ACTION
                        </th>
                      )}
                      {visibleColumns.serialNo && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          SERIAL NO
                        </th>
                      )}
                      {visibleColumns.inventoryNo && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[120px]">
                          INVENTORY NO
                        </th>
                      )}
                      {visibleColumns.inventoryType && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[120px]">
                          INVENTORY TYPE
                        </th>
                      )}
                      {visibleColumns.department && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[120px]">
                          DEPARTMENT
                        </th>
                      )}
                      {visibleColumns.itemsName && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[150px]">
                          ITEMS NAME
                        </th>
                      )}
                      {visibleColumns.foodName && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[120px]">
                          FOOD NAME
                        </th>
                      )}
                      {visibleColumns.openingBalance && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          OPENING BALANCE
                        </th>
                      )}
                      {visibleColumns.issueData && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          ISSUE DATA
                        </th>
                      )}
                      {visibleColumns.returnData && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          RETURN DATA
                        </th>
                      )}
                      {visibleColumns.damageItems && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          DAMAGE ITEMS
                        </th>
                      )}
                      {visibleColumns.missingItems && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          MISSING ITEMS
                        </th>
                      )}
                      {visibleColumns.closingBalance && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          CLOSING BALANCE
                        </th>
                      )}
                      {visibleColumns.uploadFile && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[150px]">
                          UPLOAD FILE
                        </th>
                      )}
                      {visibleColumns.unit && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[80px]">
                          UNIT
                        </th>
                      )}
                      {visibleColumns.perUnitPrice && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[100px]">
                          PER UNIT PRICE
                        </th>
                      )}
                      {visibleColumns.eventDate && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[120px]">
                          EVENT DATE
                        </th>
                      )}
                      {visibleColumns.remarks && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 min-w-[150px]">
                          REMARKS
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {showHistory ? (
                      filteredHistoryData.length > 0 ? (
                        filteredHistoryData.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            {visibleColumns.serialNo && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.serialNo || ''}
                              </td>
                            )}
                            {visibleColumns.inventoryNo && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.inventoryNo || ''}
                              </td>
                            )}
                            {visibleColumns.inventoryType && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.inventoryType || ''}
                              </td>
                            )}
                            {visibleColumns.department && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.department || ''}
                              </td>
                            )}
                            {visibleColumns.itemsName && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.itemsName || ''}
                              </td>
                            )}
                            {visibleColumns.foodName && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.foodName || ''}
                              </td>
                            )}
                            {visibleColumns.openingBalance && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.openingBalance || 0}
                              </td>
                            )}
                            {visibleColumns.issueData && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.issueData || 0}
                              </td>
                            )}
                            {visibleColumns.returnData && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.returnData || 0}
                              </td>
                            )}
                            {visibleColumns.damageItems && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.damageItems || 0}
                              </td>
                            )}
                            {visibleColumns.missingItems && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.missingItems || 0}
                              </td>
                            )}
                            {visibleColumns.closingBalance && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.closingBalance || 0}
                              </td>
                            )}
                            {visibleColumns.uploadFile && (
                              <td className="px-3 py-3 text-xs border-r border-gray-100">
                                {record.uploadFile && record.uploadFile !== "No Image" ? (
                                  <OptimizedImage
                                    src={record.uploadFile}
                                    alt="Item image"
                                    className="h-16 w-24 object-cover cursor-pointer border border-gray-200 rounded-md hover:shadow-md transition-shadow"
                                    onClick={() => window.open(record.uploadFile, '_blank')}
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.unit && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.unit || ''}
                              </td>
                            )}
                            {visibleColumns.perUnitPrice && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {record.perUnitPrice || 0}
                              </td>
                            )}
                            {visibleColumns.eventDate && (
                              <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                {formatDate(record.eventDate)}
                              </td>
                            )}
                            {visibleColumns.remarks && (
                              <td className="px-3 py-3 text-xs text-gray-900 max-w-[150px] truncate" title={record.remarks}>
                                {record.remarks || ''}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={getVisibleColumnsForCurrentSection().length} className="px-4 py-8 text-center text-gray-500">
                            {selectedInventoryType || selectedDate ?
                              `No history records found${selectedDate ? ` for ${formatDate(selectedDate)}` : ''}${selectedInventoryType ? ` in ${selectedInventoryType}` : ''}` :
                              'No inventory history data available. Records will appear here after items are completed.'
                            }
                          </td>
                        </tr>
                      )
                    ) : (
                      filteredPendingData.length > 0 ? (
                        filteredPendingData.map((record) => {
                          const isSelected = selectedRows.has(record.id);
                          const editData = editableData[record.id] || record;

                          return (
                            <tr key={record.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                              {visibleColumns.action && (
                                <td className="px-3 py-3 border-r border-gray-100">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleRowSelect(record.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                              {visibleColumns.serialNo && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.serialNo}
                                </td>
                              )}
                              {visibleColumns.inventoryNo && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.inventoryNo}
                                </td>
                              )}
                              {visibleColumns.inventoryType && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.inventoryType}
                                </td>
                              )}
                              {visibleColumns.department && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.department}
                                </td>
                              )}
                              {visibleColumns.itemsName && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.itemsName}
                                </td>
                              )}
                              {visibleColumns.foodName && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.foodName}
                                      onChange={(e) => handleEditableChange(record.id, "foodName", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="Enter food name"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.foodName}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.openingBalance && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.openingBalance}
                                      onChange={(e) => handleEditableChange(record.id, "openingBalance", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.openingBalance}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.issueData && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.issueData}
                                      onChange={(e) => handleEditableChange(record.id, "issueData", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.issueData}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.returnData && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.returnData}
                                      onChange={(e) => handleEditableChange(record.id, "returnData", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.returnData}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.damageItems && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.damageItems}
                                      onChange={(e) => handleEditableChange(record.id, "damageItems", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.damageItems}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.missingItems && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.missingItems}
                                      onChange={(e) => handleEditableChange(record.id, "missingItems", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.missingItems}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.closingBalance && (
                                <td className="px-3 py-3 text-xs text-gray-900 border-r border-gray-100">
                                  {record.closingBalance}
                                </td>
                              )}
                              {visibleColumns.uploadFile && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <input
                                        type="file"
                                        onChange={async (e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            let processedFile = file;
                                            if (file.size > 2 * 1024 * 1024) {
                                              processedFile = await compressImage(file);
                                            }
                                            handleEditableChange(record.id, 'uploadFile', processedFile);
                                          }
                                        }}
                                        className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        accept="image/*"
                                      />
                                      {editData.uploadFile instanceof File ? (
                                        <img
                                          src={URL.createObjectURL(editData.uploadFile)}
                                          alt="File preview"
                                          className="h-16 w-24 object-cover border border-gray-200 rounded-md"
                                        />
                                      ) : (
                                        typeof editData.uploadFile === 'string' && editData.uploadFile && editData.uploadFile !== "No Image" ? (
                                          <OptimizedImage
                                            src={editData.uploadFile}
                                            alt="Current file"
                                            className="h-16 w-24 object-cover border border-gray-200 rounded-md cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => window.open(editData.uploadFile, '_blank')}
                                          />
                                        ) : null
                                      )}
                                    </div>
                                  ) : (
                                    record.uploadFile && record.uploadFile !== "No Image" ? (
                                      <div className="flex items-center justify-center">
                                        <OptimizedImage
                                          src={record.uploadFile}
                                          alt="Uploaded file"
                                          className="h-16 w-24 object-cover cursor-pointer border border-gray-200 rounded-md hover:shadow-md transition-shadow"
                                          onClick={() => window.open(record.uploadFile, '_blank')}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )
                                  )}
                                </td>
                              )}
                              {visibleColumns.unit && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="text"
                                      value={editData.unit}
                                      onChange={(e) => handleEditableChange(record.id, "unit", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.unit}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.perUnitPrice && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="number"
                                      value={editData.perUnitPrice}
                                      onChange={(e) => handleEditableChange(record.id, "perUnitPrice", parseInt(e.target.value) || 0)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{record.perUnitPrice}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.eventDate && (
                                <td className="px-3 py-3 text-xs border-r border-gray-100">
                                  {isSelected ? (
                                    <input
                                      type="date"
                                      value={editData.eventDate}
                                      onChange={(e) => handleEditableChange(record.id, "eventDate", e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-900">{formatDate(record.eventDate)}</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.remarks && (
                                <td className="px-3 py-3 text-xs max-w-[150px]">
                                  {isSelected ? (
                                    <textarea
                                      value={editData.remarks}
                                      onChange={(e) => handleEditableChange(record.id, "remarks", e.target.value)}
                                      rows={2}
                                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                    />
                                  ) : (
                                    <span className="text-gray-900 block truncate" title={record.remarks}>
                                      {record.remarks}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={getVisibleColumnsForCurrentSection().length} className="px-4 py-8 text-center text-gray-500">
                            {selectedInventoryType || selectedDate ? 
                              `No pending inventory items found${selectedDate ? ` for date ${formatDate(selectedDate)}` : ''}${selectedInventoryType ? ` in ${selectedInventoryType}` : ''}` :
                              'No pending inventory items found'
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default Inventory;
