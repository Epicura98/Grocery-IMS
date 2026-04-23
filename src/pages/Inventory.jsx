import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ArrowUpRight,
  Loader2,
  Database,
  Settings2,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Calendar,
  Zap,
  CheckCircle2,
  ArrowLeftRight,
  ClipboardList,
  UploadCloud,
  FileText
} from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import { formatDate, toInputDate, compressImage, parseRowDate, parseNumber, formatIndianAmount, formatDateTime } from '../utils/helpers';
import { fetchSheetDataInBackground } from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' or 'return'
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [showFullTotal, setShowFullTotal] = useState(false);

  // Data State
  const [inventoryItems, setInventoryItems] = useState([]);
  const [issueHistory, setIssueHistory] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: [],
    issuerOptions: []
  });
  const [showIssuerDropdown, setShowIssuerDropdown] = useState(false);
  const issuerDropdownRef = useRef(null);
  const [masterData, setMasterData] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  // Filter States - Issued History
  const [issuedFilterItem, setIssuedFilterItem] = useState("");
  const [issuedFilterType, setIssuedFilterType] = useState("");
  const [issuedFilterParty, setIssuedFilterParty] = useState("");
  const [issuedStartDate, setIssuedStartDate] = useState("");
  const [issuedEndDate, setIssuedEndDate] = useState("");

  // Filter States - Return History
  const [returnFilterItem, setReturnFilterItem] = useState("");
  const [returnFilterType, setReturnFilterType] = useState("");
  const [returnFilterParty, setReturnFilterParty] = useState("");
  const [returnStartDate, setReturnStartDate] = useState("");
  const [returnEndDate, setReturnEndDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSerialNo, setEditingSerialNo] = useState(null);
  const [originalTimestamp, setOriginalTimestamp] = useState(null);

  // Edit State
  const [editDataMap, setEditDataMap] = useState({}); // { [serial]: rowArray }
  const [selectedSerials, setSelectedSerials] = useState(new Set());

  const scriptUrl = import.meta.env.VITE_SCRIPT_URL;
  const folderId = import.meta.env.VITE_INVENTORY_FOLDER_ID;
  const spreadsheetId = import.meta.env.VITE_SHEET_ID;

  // Form States
  const [issueForm, setIssueForm] = useState({
    forType: 'Rent', issuer: '', inventoryNo: '', inventoryType: '', department: '', itemsName: '', openingBalance: '', perUnit: '', unit: '', eventDate: '', partyName: '', eventTime: '', foodName: '', issueData: '', remarks: '', imageUrl: ''
  });

  const [returnForm, setReturnForm] = useState({
    inventoryNo: '', inventoryType: '', department: '', itemsName: '', openingBalance: '', damageRate: '0', rentingRate: '0', totalCost: '0', foodName: '', eventDate: '', partyName: '', returnData: '0', returnDate: new Date().toISOString().split('T')[0], issueQty: '0', damageItems: '0', missingItems: '0', closingBalance: '', remarks: '', imageUrl: '', forType: ''
  });

  const [modalFilterDate, setModalFilterDate] = useState('');
  const [modalFilterParty, setModalFilterParty] = useState('');
  const [modalFilterItem, setModalFilterItem] = useState('');

  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [matchingIssuedRows, setMatchingIssuedRows] = useState([]);

  // Column Visibility & Config
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    serial: true,
    type: true,
    item: true,
    qty: true,
    party: true,
    eventDate: true,
    eventType: true,
    estimatedCost: true,
    returnDate: true,
    damage: true,
    missing: true,
    totalCost: true,
    image: true,
    for: true
  });

  const columnConfig = activeTab === 'issued' ? [
    { key: 'serial', label: 'Serial No.', index: 1 },
    { key: 'type', label: 'Type', index: 3 },
    { key: 'item', label: 'Item Name', index: 5 },
    { key: 'qty', label: 'Issue Qty', index: 8 },
    { key: 'image', label: 'Image', index: 15 },
    { key: 'date', label: 'Date', index: 0 },
    { key: 'for', label: 'For', index: 19 },
    { key: 'party', label: 'Party Name', index: 6 },
    { key: 'eventDate', label: 'Event Date', index: 7 },
    { key: 'eventType', label: 'Event Type', index: 17 },
    { key: 'estimatedCost', label: 'Estimated Cost', index: 18 }
  ] : [
    { key: 'serial', label: 'Serial No.', index: 1 },
    { key: 'type', label: 'Type', index: 3 },
    { key: 'item', label: 'Item Name', index: 5 },
    { key: 'qty', label: 'Return Qty', index: 10 },
    { key: 'image', label: 'Image', index: 18 },
    { key: 'date', label: 'Date', index: 0 },
    { key: 'for', label: 'For', index: 21 },
    { key: 'party', label: 'Party Name', index: 6 },
    { key: 'returnDate', label: 'Return Date', index: 8 },
    { key: 'damage', label: 'Damage', index: 11 },
    { key: 'missing', label: 'Missing', index: 12 },
    { key: 'totalCost', label: 'Total Cost', index: 20 }
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (issuerDropdownRef.current && !issuerDropdownRef.current.contains(event.target)) {
        setShowIssuerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadToDrive = async (file) => {
    const compressedFile = await compressImage(file);
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(compressedFile);
    });
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "uploadFile",
        base64Data: base64,
        fileName: `${Date.now()}_${compressedFile.name}`,
        mimeType: compressedFile.type,
        folderId: folderId,
        spreadsheetId: spreadsheetId
      })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.fileUrl;
  };

  const extractDriveFileId = (url) => {
    if (!url || url === 'No Image') return null;
    const match = url.match(/(?:[?&]id=|\/d\/)([a-zA-Z0-9\-_]{10,})/);
    return match ? match[1] : null;
  };

  const getDisplayableImageUrl = (url) => {
    if (!url || url === 'No Image') return null;
    try {
      const match = url.match(/(?:[?&]id=|\/d\/)([a-zA-Z0-9\-_]{10,})/);
      if (match && match[1]) {
        // uc?export=view is stable for publicly-shared files
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
      return url;
    } catch (e) { return url; }
  };

  const toggleRowSelection = (row) => {
    const sn = row[1];
    const newSelected = new Set(selectedSerials);
    const newEditMap = { ...editDataMap };
    
    if (newSelected.has(sn)) {
      newSelected.delete(sn);
      delete newEditMap[sn];
    } else {
      newSelected.add(sn);
      newEditMap[sn] = [...row];
    }
    setSelectedSerials(newSelected);
    setEditDataMap(newEditMap);
  };

  const handleSelectAll = (filteredRows) => {
    if (selectedSerials.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedSerials(new Set());
      setEditDataMap({});
    } else {
      const newSelected = new Set();
      const newEditMap = {};
      filteredRows.forEach(row => {
        const sn = row[1];
        newSelected.add(sn);
        newEditMap[sn] = [...row];
      });
      setSelectedSerials(newSelected);
      setEditDataMap(newEditMap);
    }
  };

  const handleInlineEdit = (sn, index, value, type) => {
    setEditDataMap(prev => {
      const row = [...prev[sn]];
      row[index] = value;
      
      if (type === 'issued') {
        // Recalculate Estimated Cost (Index 18) = Issue Qty (8) * Per Unit (10)
        if (index === 8 || index === 10) {
          row[18] = (parseFloat(row[8] || 0) * parseFloat(row[10] || 0)).toFixed(2);
        }
        // Update Closing (Index 12/13) = Opening (11) - Issue (8)
        if (index === 11 || index === 8) {
          const closing = (parseFloat(row[11] || 0) - parseFloat(row[8] || 0));
          row[12] = closing;
          row[13] = closing;
        }
      } else if (type === 'return') {
        // Sanity Check: Return Qty >= 0 (User requirement: basic sanity checks)
        // Recalculate Total Cost (Index 20) = ((Damage(11) + Missing(12)) * DamageRate(13)) + (ReturnQty(10) * RentingRate(14))
        if ([10, 11, 12, 13, 14].includes(index)) {
          const dmg = parseFloat(row[11] || 0);
          const mis = parseFloat(row[12] || 0);
          const ret = parseFloat(row[10] || 0);
          const dRate = parseFloat(row[13] || 0);
          const rRate = parseFloat(row[14] || 0);
          row[20] = ((dmg + mis) * dRate + (ret * rRate)).toFixed(2);
          
          // Logic requirement from plan: Issue Qty >= Damage + Missing
          const issueQty = parseFloat(row[9] || 0);
          if (dmg + mis > issueQty) {
            // Optional: reset or alert, but usually we just allow it and let price reflect
          }
        }
      }
      return { ...prev, [sn]: row };
    });
  };

  const changedRowsCount = useMemo(() => {
    const currentRows = activeTab === 'issued' ? issueHistory : returnHistory;
    return Object.keys(editDataMap).filter(sn => {
      const editRow = editDataMap[sn];
      const originalRow = currentRows.find(r => r[1] === sn);
      if (!originalRow) return false;
      return JSON.stringify(editRow) !== JSON.stringify(originalRow);
    }).length;
  }, [editDataMap, issueHistory, returnHistory, activeTab]);

  const handleBatchSubmit = async () => {
    setIsSubmitting(true);
    try {
      const rowsToUpdate = Object.values(editDataMap).map(row => {
        const newRow = [...row];
        newRow[0] = formatDateTime(newRow[0]);
        if (activeTab === 'issued') {
          if (newRow[7]) newRow[7] = formatDate(newRow[7]);
          // Clear Column V for Issued sheet
          while (newRow.length < 22) newRow.push("");
          newRow[21] = "";
        } else if (activeTab === 'return') {
          if (newRow[8]) newRow[8] = formatDate(newRow[8]);
          // Also format eventDate (index 7) in return sheet if it exists
          if (newRow[7]) newRow[7] = formatDate(newRow[7]);
        }
        return newRow;
      });
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'batchUpdate',
          sheetName: activeTab === 'issued' ? 'Issued' : 'Return',
          spreadsheetId: spreadsheetId,
          rowsData: JSON.stringify(rowsToUpdate)
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast(`${rowsToUpdate.length} record(s) updated successfully`);
        setEditDataMap({});
        setSelectedSerials(new Set());
        fetchHistory();
      } else throw new Error(result.error);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [dropdownRes, invRes] = await Promise.all([
        fetch(`${scriptUrl}?action=fetch&sheet=Master Drop-Down&spreadsheetId=${spreadsheetId}`).then(r => r.json()),
        fetch(`${scriptUrl}?action=fetch&sheet=INVENTORY&spreadsheetId=${spreadsheetId}`).then(r => r.json())
      ]);
      let dropdownResult = dropdownRes;
      if (!dropdownResult.success || !dropdownResult.data) {
        dropdownResult = await fetch(`${scriptUrl}?action=fetch&sheet=Master-Dropdown&spreadsheetId=${spreadsheetId}`).then(r => r.json());
      }
      if (dropdownResult.success && dropdownResult.data) {
        const rows = dropdownResult.data.slice(1);
        setMasterData(rows);
        setDropdownOptions({
          inventoryTypeOptions: [...new Set(rows.map(row => row[3]).filter(Boolean))],
          departmentOptions: [...new Set(rows.map(row => row[2]).filter(Boolean))],
          unitOptions: [...new Set(rows.map(row => row[4]).filter(Boolean))],
          issuerOptions: [...new Set(rows.map(row => row[7]).filter(Boolean))].sort()
        });
      }
      // Fetch Add-Stock to get stock-only options for Issue form
      try {
        const stockRes = await fetch(`${scriptUrl}?action=fetch&sheet=Add-Stock&sheetName=Add-Stock&spreadsheetId=${spreadsheetId}`).then(r => r.json());
        if (stockRes.success && stockRes.data) {
          const rows = stockRes.data.slice(1);
          setStockRows(rows);
        }
      } catch (e) { console.warn('Could not fetch Add-Stock for dropdown filtering:', e); }

      if (invRes.success && invRes.data) {
        // Fetch Add-Stock to get the Unit column (col I = index 8), matched by Inv No (col C = index 2)
        let unitMap = {};
        try {
          const stockRes = await fetch(`${scriptUrl}?action=fetch&sheet=Add-Stock&sheetName=Add-Stock&spreadsheetId=${spreadsheetId}`).then(r => r.json());
          if (stockRes.success && stockRes.data) {
            stockRes.data.slice(1).forEach(row => {
              const invNo = row[2] && row[2].toString().trim();
              const unit = row[8] && row[8].toString().trim();
              if (invNo && unit) unitMap[invNo] = unit;
            });
          }
        } catch (e) { console.warn('Could not fetch Add-Stock for unit lookup:', e); }

        const validRows = invRes.data.slice(1).filter(row => row[1] && row[1].toString().trim() !== "");
        setInventoryItems(validRows.map(row => ({
          inventoryNo: row[1],
          inventoryType: row[2],
          department: row[3],
          itemsName: row[4],
          openingBalance: parseNumber(row[6]),          // col-G of INVENTORY (parsed as number)
          unit: unitMap[row[1]] || 'PCS',            // col I of Add-Stock, matched by Inv No
          perUnit: parseNumber(row[8]),
          imageUrl: row[13] || '',
          remarks: ''
        })));
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load initial data', 'error');
    } finally { setIsLoading(false); }
  };

  const fetchHistory = async () => {
    setIsTableLoading(true);
    // Fetch Issued History in background
    fetchSheetDataInBackground(scriptUrl, 'Issued', spreadsheetId, (data, isComplete) => {
      const validRows = data.filter(row => row[2] && row[2].toString().trim() !== "");
      setIssueHistory(validRows.reverse());
      if (isComplete && activeTab === 'issued') setIsTableLoading(false);
      if (validRows.length > 0 && activeTab === 'issued') setIsTableLoading(false);
    });

    // Fetch Return History in background
    fetchSheetDataInBackground(scriptUrl, 'Return', spreadsheetId, (data, isComplete) => {
      const validRows = data.filter(row => row[1] && row[1].toString().trim() !== "");
      setReturnHistory(validRows.reverse());
      if (isComplete && activeTab === 'return') setIsTableLoading(false);
      if (validRows.length > 0 && activeTab === 'return') setIsTableLoading(false);
    });
  };

  useEffect(() => { fetchInitialData(); fetchHistory(); }, []);

  useEffect(() => {
    const currentType = isIssueModalOpen ? issueForm.inventoryType : returnForm.inventoryType;
    if (currentType) {
      if (isIssueModalOpen) {
        const uniqueItemsFromStock = [...new Set(stockRows.filter(row => row[3] === currentType).map(row => row[5]))].filter(Boolean);
        setFilteredItems(uniqueItemsFromStock);
      } else {
        const uniqueItems = [...new Set(inventoryItems.filter(item => item.inventoryType === currentType).map(item => item.itemsName))].filter(Boolean);
        setFilteredItems(uniqueItems);
      }
    } else { setFilteredItems([]); }
  }, [issueForm.inventoryType, returnForm.inventoryType, inventoryItems, stockRows, isIssueModalOpen, isReturnModalOpen]);

  // Derive Options for Filters
  const issuedOptions = useMemo(() => {
    const filteredByItem = issueHistory.filter(r => (!issuedFilterType || r[3] === issuedFilterType) && (!issuedFilterParty || r[6] === issuedFilterParty));
    const filteredByType = issueHistory.filter(r => (!issuedFilterItem || r[5] === issuedFilterItem) && (!issuedFilterParty || r[6] === issuedFilterParty));
    const filteredByParty = issueHistory.filter(r => (!issuedFilterItem || r[5] === issuedFilterItem) && (!issuedFilterType || r[3] === issuedFilterType));
    
    return {
      items: [...new Set(filteredByItem.map(r => r[5]).filter(Boolean))].sort(),
      types: [...new Set(filteredByType.map(r => r[3]).filter(Boolean))].sort(),
      parties: [...new Set(filteredByParty.map(r => r[6]).filter(Boolean))].sort(),
    };
  }, [issueHistory, issuedFilterItem, issuedFilterType, issuedFilterParty]);

  const returnOptions = useMemo(() => {
    const filteredByItem = returnHistory.filter(r => (!returnFilterType || r[3] === returnFilterType) && (!returnFilterParty || r[6] === returnFilterParty));
    const filteredByType = returnHistory.filter(r => (!returnFilterItem || r[5] === returnFilterItem) && (!returnFilterParty || r[6] === returnFilterParty));
    const filteredByParty = returnHistory.filter(r => (!returnFilterItem || r[5] === returnFilterItem) && (!returnFilterType || r[3] === returnFilterType));

    return {
      items: [...new Set(filteredByItem.map(r => r[5]).filter(Boolean))].sort(),
      types: [...new Set(filteredByType.map(r => r[3]).filter(Boolean))].sort(),
      parties: [...new Set(filteredByParty.map(r => r[6]).filter(Boolean))].sort(),
    };
  }, [returnHistory, returnFilterItem, returnFilterType, returnFilterParty]);

  const filteredIssuedHistory = useMemo(() => {
    return issueHistory.filter(row => {
      const matchesSearch = !searchTerm.trim() || row.some(cell => cell && String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesItem = !issuedFilterItem || row[5] === issuedFilterItem;
      const matchesType = !issuedFilterType || row[3] === issuedFilterType;
      const matchesParty = !issuedFilterParty || row[6] === issuedFilterParty;
      let matchesDate = true;
      if (issuedStartDate || issuedEndDate) {
        const rowDate = parseRowDate(row[0]);
        if (!rowDate || isNaN(rowDate)) return true;
        if (issuedStartDate && rowDate < new Date(issuedStartDate)) matchesDate = false;
        if (issuedEndDate) {
          const end = new Date(issuedEndDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) matchesDate = false;
        }
      }
      return matchesSearch && matchesItem && matchesType && matchesParty && matchesDate;
    });
  }, [issueHistory, searchTerm, issuedFilterItem, issuedFilterType, issuedFilterParty, issuedStartDate, issuedEndDate]);

  const filteredReturnHistory = useMemo(() => {
    return returnHistory.filter(row => {
      const matchesSearch = !searchTerm.trim() || row.some(cell => cell && String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesItem = !returnFilterItem || row[5] === returnFilterItem;
      const matchesType = !returnFilterType || row[3] === returnFilterType;
      const matchesParty = !returnFilterParty || row[6] === returnFilterParty;
      let matchesDate = true;
      if (returnStartDate || returnEndDate) {
        const rowDate = parseRowDate(row[0]);
        if (!rowDate || isNaN(rowDate)) return true;
        if (returnStartDate && rowDate < new Date(returnStartDate)) matchesDate = false;
        if (returnEndDate) {
          const end = new Date(returnEndDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) matchesDate = false;
        }
      }
      return matchesSearch && matchesItem && matchesType && matchesParty && matchesDate;
    });
  }, [returnHistory, searchTerm, returnFilterItem, returnFilterType, returnFilterParty, returnStartDate, returnEndDate]);

  const totalInventoryCost = useMemo(() => {
    const data = activeTab === 'issued' ? filteredIssuedHistory : filteredReturnHistory;
    const colIndex = activeTab === 'issued' ? 18 : 20;
    return data.reduce((sum, row) => {
      const val = parseFloat(row[colIndex] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [activeTab, filteredIssuedHistory, filteredReturnHistory]);

  const validationState = useMemo(() => {
    if (!issueForm.itemsName || !issueForm.eventDate) return { remaining: 0, isOver: false, committed: 0 };
    
    const selectedItem = issueForm.itemsName.trim().toLowerCase();
    const selectedDate = issueForm.eventDate;
    const masterStock = Number(issueForm.openingBalance) || 0;
    const currentQty = Number(issueForm.issueData) || 0;
    const currentParty = String(issueForm.partyName || '').trim().toLowerCase();
    const currentVenue = String(issueForm.foodName || '').trim().toLowerCase();
    const currentSlot = String(issueForm.eventTime || 'Regular').trim().toLowerCase();
    const currentKey = `${currentParty}|${currentVenue}`;

    // 1. Group existing issues by (Party | Venue) AND (Slot)
    const partyVenueMap = {}; 
    issueHistory.forEach(row => {
      const rowItem = String(row[5] || '').trim().toLowerCase();
      const rowDate = toInputDate(row[7]);
      
      if (rowItem === selectedItem && rowDate === selectedDate) {
        const p = String(row[6] || '').trim().toLowerCase();
        const v = String(row[14] || '').trim().toLowerCase();
        const s = String(row[17] || 'Regular').trim().toLowerCase();
        const q = Number(row[8] || 0);
        
        const key = `${p}|${v}`;
        if (!partyVenueMap[key]) partyVenueMap[key] = {};
        partyVenueMap[key][s] = (partyVenueMap[key][s] || 0) + q;
      }
    });

    // 2. Calculate Commitment per Party/Venue peak
    const groupPeaks = {};
    Object.entries(partyVenueMap).forEach(([key, slots]) => {
      groupPeaks[key] = Math.max(...Object.values(slots), 0);
    });

    // 3. For the CURRENT form
    let committedByOthers = 0;
    Object.keys(groupPeaks).forEach(key => {
      if (key !== currentKey) committedByOthers += groupPeaks[key];
    });

    const slotsInCurrent = partyVenueMap[currentKey] || {};
    const sumInCurrentSlot = (slotsInCurrent[currentSlot] || 0) + currentQty;
    const otherSlotsInCurrent = Object.entries(slotsInCurrent)
      .filter(([s]) => s !== currentSlot)
      .map(([_, q]) => q);
    
    const currentGroupPotentialPeak = Math.max(sumInCurrentSlot, ...otherSlotsInCurrent, 0);
    const totalPotential = committedByOthers + currentGroupPotentialPeak;
    const isOver = totalPotential > masterStock;
    const totalCommittedRightNow = Object.values(groupPeaks).reduce((a, b) => a + b, 0);

    return { 
      remaining: Math.max(0, masterStock - totalCommittedRightNow), 
      isOver, 
      committed: totalCommittedRightNow,
      availableForThisGroup: masterStock - committedByOthers 
    };
  }, [issueHistory, issueForm.itemsName, issueForm.eventDate, issueForm.partyName, issueForm.foodName, issueForm.eventTime, issueForm.issueData, issueForm.openingBalance]);

  // Auto-calculate Return Qty and Total Cost
  useEffect(() => {
    if (!isReturnModalOpen) return;
    const issueQty = Number(returnForm.issueQty || 0);
    const damage = Number(returnForm.damageItems || 0);
    const missing = Number(returnForm.missingItems || 0);
    const damageRate = Number(returnForm.damageRate || 0);
    const rentingRate = Number(returnForm.rentingRate || 0);

    const returnQty = Math.max(0, issueQty - damage - missing);
    const totalCost = ((damage + missing) * damageRate) + (returnQty * rentingRate);

    setReturnForm(prev => {
      if (prev.returnData === returnQty.toString() && prev.totalCost === totalCost.toFixed(2)) return prev;
      return { ...prev, returnData: returnQty.toString(), totalCost: totalCost.toFixed(2) };
    });
  }, [returnForm.issueQty, returnForm.damageItems, returnForm.missingItems, returnForm.damageRate, returnForm.rentingRate, isReturnModalOpen]);

  const handleIssueSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      if (validationState.isOver) {
        showToast(`Error: Exceeds available stock for this date (Limit: ${validationState.availableForThisGroup})`, 'error');
        setIsSubmitting(false);
        return;
      }
      
      const imageUrl = selectedImage ? await uploadToDrive(selectedImage) : (issueForm.imageUrl || 'No Image');
      const now = new Date();
      const localTimestamp = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
      const opening = parseFloat(issueForm.openingBalance) || 0;
      const consumed = parseFloat(issueForm.issueData) || 0;
      const closing = opening - consumed;
      const rowData = [localTimestamp, '', issueForm.inventoryNo, issueForm.inventoryType, issueForm.department, issueForm.itemsName, issueForm.partyName || '', issueForm.eventDate || '', issueForm.issueData || 0, issueForm.unit || '', issueForm.perUnit || 0, issueForm.openingBalance || 0, closing, closing, issueForm.foodName || '', imageUrl, issueForm.remarks || '', issueForm.eventTime || '', (Number(issueForm.issueData || 0) * Number(issueForm.perUnit || 0)).toFixed(2), issueForm.forType || 'Rent', issueForm.issuer || '', ''];
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'insert', sheet: 'Issued', sheetName: 'Issued', spreadsheetId: spreadsheetId, rowData: JSON.stringify(rowData) })
      });
      const result = await response.json();
      if (result.success) {
        showToast('Issue recorded successfully');
        setIsIssueModalOpen(false);
        setIssueForm({ forType: 'Rent', inventoryNo: '', inventoryType: '', department: '', itemsName: '', openingBalance: '', perUnit: '', unit: '', eventDate: '', partyName: '', eventTime: '', foodName: '', issueData: '', remarks: '', imageUrl: '' });
        setSelectedImage(null); setImagePreview(null); fetchHistory();
      } else throw new Error(result.error);
    } catch (err) { showToast(err.message || 'Failed to submit', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleSelectIssue = (issueRow) => {
    if (!issueRow) return;
    setReturnForm(prev => ({
      ...prev,
      inventoryNo: issueRow[2],
      inventoryType: issueRow[3],
      department: issueRow[4],
      itemsName: issueRow[5],
      partyName: issueRow[6],
      eventDate: toInputDate(issueRow[7]),
      issueQty: parseNumber(issueRow[8]),
      damageRate: parseNumber(issueRow[9]), 
      rentingRate: parseNumber(issueRow[10]),
      openingBalance: parseNumber(issueRow[11]),
      closingBalance: parseNumber(issueRow[12]),
      foodName: issueRow[14],
      imageUrl: issueRow[15],
      forType: issueRow[19]
    }));
    setIsReturnModalOpen(true);
    if (issueRow[15]) setImagePreview(getDisplayableImageUrl(issueRow[15]));
  };

  const handleSelectBatch = (rows) => {
    if (!rows || rows.length === 0) return;
    const first = rows[0];
    const totalQty = rows.reduce((sum, r) => sum + parseNumber(r[8]), 0);
    
    setReturnForm({
      inventoryNo: first[2],
      inventoryType: first[3],
      department: first[4],
      itemsName: first[5],
      partyName: first[6],
      eventDate: toInputDate(first[7]),
      issueQty: totalQty,
      damageRate: parseNumber(first[9]), 
      rentingRate: parseNumber(first[10]),
      openingBalance: parseNumber(first[11]),
      closingBalance: '', 
      foodName: first[14],
      imageUrl: first[15],
      returnData: '0', 
      damageItems: '0', 
      missingItems: '0',
      remarks: '',
      totalCost: '0',
      forType: first[19] || '',
      returnDate: new Date().toISOString().split('T')[0]
    });
    setMatchingIssuedRows(rows);
    if (first[15]) setImagePreview(getDisplayableImageUrl(first[15]));
  };

  const handleEditReturn = (row) => {
    setReturnForm({
      inventoryNo: row[2], 
      inventoryType: row[3], 
      department: row[4], 
      itemsName: row[5], 
      partyName: row[6], 
      eventDate: toInputDate(row[7]), 
      returnDate: toInputDate(row[8]), 
      issueQty: row[9], 
      returnData: row[10], 
      damageItems: row[11], 
      missingItems: row[12], 
      damageRate: row[13], 
      rentingRate: row[14], 
      openingBalance: row[15], 
      closingBalance: row[16], 
      remarks: row[19], 
      imageUrl: row[18],
      totalCost: row[20] || '0',
      forType: row[21] || ''
    });
    setEditingSerialNo(row[1]); setOriginalTimestamp(row[0]); setIsEditing(true); setIsReturnModalOpen(true); setImagePreview(getDisplayableImageUrl(row[18]));
  };

  const handleReturnSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const imageUrl = selectedImage ? await uploadToDrive(selectedImage) : (returnForm.imageUrl || 'No Image');
      const now = new Date();
      const localTimestamp = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '');
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const toSheetDate = (val) => {
        if (!val) return '';
        const s = String(val).trim();
        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) { const [, y, mo, d] = isoMatch; return `${d}-${MONTHS[parseInt(mo, 10) - 1]}-${y}`; }
        const dmyMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (dmyMatch) { const [, d, mo, y] = dmyMatch; return `${d}-${MONTHS[parseInt(mo, 10) - 1]}-${y}`; }
        return s;
      };
      const baseRowData = [
        isEditing ? originalTimestamp : localTimestamp, 
        isEditing ? editingSerialNo : "", 
        returnForm.inventoryNo, 
        returnForm.inventoryType, 
        returnForm.department, 
        returnForm.itemsName, 
        returnForm.partyName, 
        toSheetDate(returnForm.eventDate), 
        toSheetDate(returnForm.returnDate), 
        returnForm.issueQty, 
        returnForm.returnData, 
        returnForm.damageItems, 
        returnForm.missingItems, 
        returnForm.damageRate, 
        returnForm.rentingRate, 
        returnForm.openingBalance, 
        returnForm.closingBalance, 
        (Number(returnForm.closingBalance || 0) + Number(returnForm.returnData || 0) - Number(returnForm.damageItems || 0) - Number(returnForm.missingItems || 0)).toString(), 
        imageUrl, 
        returnForm.remarks,
        returnForm.totalCost,
        returnForm.forType || ''
      ];
      const rowData = isEditing ? [...baseRowData, '', ''] : baseRowData;
      const response = await fetch(scriptUrl, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: isEditing ? "update" : "insert", sheet: "Return", sheetName: "Return", spreadsheetId: spreadsheetId, rowData: JSON.stringify(rowData) })
      });
      const result = await response.json();
      if (result.success) {
        showToast(isEditing ? 'Record updated successfully' : 'Return recorded successfully');
        setIsReturnModalOpen(false); setIsEditing(false); setEditingSerialNo(null); setOriginalTimestamp(null);
        setReturnForm({ inventoryType: '', itemsName: '', department: '', inventoryNo: '', openingBalance: '', damageRate: '', rentingRate: '', totalCost: '', foodName: '', eventDate: '', partyName: '', returnData: '', returnDate: new Date().toISOString().split('T')[0], issueQty: '', damageItems: '0', missingItems: '0', closingBalance: '', remarks: '', imageUrl: '' });
        setModalFilterDate(''); setModalFilterParty(''); setModalFilterItem(''); setSelectedImage(null); setImagePreview(null); fetchHistory();
      } else throw new Error(result.error);
    } catch (err) { showToast(err.message || 'Failed to submit', 'error'); } finally { setIsSubmitting(false); }
  };

  const getFilteredHistory = () => activeTab === 'issued' ? filteredIssuedHistory : filteredReturnHistory;
  
  const handleGenerateReport = () => {
    const isIssued = activeTab === 'issued';
    const sourceData = isIssued ? issueHistory : returnHistory;
    
    // 1. Filter data (EXCLUDING search term as requested)
    const filteredReportData = sourceData.filter(row => {
      if (isIssued) {
        const matchesItem = !issuedFilterItem || row[5] === issuedFilterItem;
        const matchesType = !issuedFilterType || row[3] === issuedFilterType;
        const matchesParty = !issuedFilterParty || row[6] === issuedFilterParty;
        let matchesDate = true;
        if (issuedStartDate || issuedEndDate) {
          const rowDate = parseRowDate(row[0]);
          if (!rowDate || isNaN(rowDate)) return true;
          if (issuedStartDate && rowDate < new Date(issuedStartDate)) matchesDate = false;
          if (issuedEndDate) {
            const end = new Date(issuedEndDate);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) matchesDate = false;
          }
        }
        return matchesItem && matchesType && matchesParty && matchesDate;
      } else {
        const matchesItem = !returnFilterItem || row[5] === returnFilterItem;
        const matchesType = !returnFilterType || row[3] === returnFilterType;
        const matchesParty = !returnFilterParty || row[6] === returnFilterParty;
        let matchesDate = true;
        if (returnStartDate || returnEndDate) {
          const rowDate = parseRowDate(row[0]);
          if (!rowDate || isNaN(rowDate)) return true;
          if (returnStartDate && rowDate < new Date(returnStartDate)) matchesDate = false;
          if (returnEndDate) {
            const end = new Date(returnEndDate);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) matchesDate = false;
          }
        }
        return matchesItem && matchesType && matchesParty && matchesDate;
      }
    });


    // 1. Identify common fields for the summary header and enforce uniformity restriction
    if (filteredReportData.length === 0) {
      showToast('No records to export', 'info');
      return;
    }

    const firstRow = filteredReportData[0];
    const dateIdx = 0;
    const partyIdx = 6;
    const forIdx = isIssued ? 19 : 21;
    const eventDateIdx = isIssued ? 7 : -1;
    
    const commonDateRaw = firstRow[dateIdx];
    const commonParty = firstRow[partyIdx];
    const commonFor = firstRow[forIdx];
    const commonEventDateRaw = eventDateIdx !== -1 ? firstRow[eventDateIdx] : null;

    const mismatchFields = [];
    if (filteredReportData.some(row => formatDate(row[dateIdx]) !== formatDate(commonDateRaw))) mismatchFields.push('Date');
    if (filteredReportData.some(row => row[partyIdx] !== commonParty)) mismatchFields.push('Party Name');
    if (filteredReportData.some(row => row[forIdx] !== commonFor)) mismatchFields.push('For');
    if (eventDateIdx !== -1 && filteredReportData.some(row => formatDate(row[eventDateIdx]) !== formatDate(commonEventDateRaw))) mismatchFields.push('Event Date');

    let uniformInfo = null;
    if (mismatchFields.length > 0) {
      const confirmPrint = window.confirm(`The data for the fields: ${mismatchFields.join(', ')} are different. Do you still want to print the PDF?`);
      if (!confirmPrint) return;
    } else {
      uniformInfo = {
        date: commonDateRaw,
        party: commonParty,
        for: commonFor,
        eventDate: commonEventDateRaw
      };
    }

    // 2. Identify visible columns (Strictly honors UI toggles)
    const columnsToInclude = columnConfig.filter(col => 
      visibleColumns[col.key] !== false && col.key !== 'actions'
    );

    const reportColumns = [
      ...columnsToInclude.map(col => ({ header: col.label, dataKey: col.key })),
      { header: 'Remark', dataKey: 'remark' }
    ];
    
    const body = filteredReportData.map(row => {
      const rowData = {};
      columnsToInclude.forEach(col => {
        let val = row[col.index];
        if (col.key === 'image') {
          rowData[col.key] = val && val !== 'No Image' ? val : '';
        } else if (['date', 'eventDate', 'returnDate'].includes(col.key)) {
          rowData[col.key] = formatDate(val);
        } else if (['estimatedCost', 'totalCost'].includes(col.key)) {
          rowData[col.key] = `Rs ${parseFloat(val || 0).toFixed(2)}`;
        } else {
          rowData[col.key] = val || '-';
        }
      });
      rowData['remark'] = '';
      return rowData;
    });

    // Helper to fetch base64 through GAS backend
    const loadImageAsBase64 = async (url) => {
      if (!url || url === 'No Image') return null;
      try {
        const fileId = extractDriveFileId(url);
        if (!fileId) return null;
        const res = await fetch(`${scriptUrl}?action=getImageBase64&fileId=${fileId}&spreadsheetId=${spreadsheetId}`);
        const result = await res.json();
        return result.success ? result.base64 : null;
      } catch { return null; }
    };

    // 3. Generate PDF
    setIsReportGenerating(true);

    setTimeout(async () => {
      try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;

        // Calculate dynamic column styles for precise widths
        const colStyles = {};
        const availableWidth = pageWidth - 12; // margins
        const colCount = reportColumns.length;
        const hasImage = reportColumns.some(c => c.dataKey === 'image');
        const imgWeight = 1.4;
        const otherWeight = 1.0;
        const totalWeight = hasImage ? (colCount - 1) * otherWeight + imgWeight : colCount * otherWeight;
        const unitWidth = availableWidth / totalWeight;

        reportColumns.forEach(col => {
          colStyles[col.dataKey] = { 
            cellWidth: col.dataKey === 'image' ? unitWidth * imgWeight : unitWidth * otherWeight 
          };
        });

        // Pre-load images if column is visible
        const imageMap = {};
        if (visibleColumns.image) {
          const uniqueUrls = [...new Set(filteredReportData.map(row => row[isIssued ? 15 : 18]).filter(url => url && url !== 'No Image'))];
          const results = await Promise.all(uniqueUrls.map(async (url) => ({ url, b64: await loadImageAsBase64(url) })));
          results.forEach(({ url, b64 }) => { if (b64) imageMap[url] = b64; });
        }
        
        // Add Title with Record Count
        const title = `${isIssued ? 'ISSUED' : 'RETURN'} HISTORY REPORT`;
        const countText = `(${body.length})`;
        doc.setFontSize(14);
        doc.setTextColor(124, 58, 237);
        doc.text(title, 14, 10);
        
        const titleWidth = doc.getTextWidth(title);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(countText, 14 + titleWidth + 2, 10);

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 14, 10, { align: 'right' });

        // Add Summary Info Header (Single Line)
        let currentY = 14;
        if (uniformInfo) {
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'bold');
          
          const row1 = `Date: ${formatDate(uniformInfo.date)}    For: ${uniformInfo.for}`;
          const row2 = `Party: ${uniformInfo.party}${uniformInfo.eventDate ? `    Event-Date: ${formatDate(uniformInfo.eventDate)}` : ''}`;
          doc.text(row1, 14, 16);
          doc.text(row2, 14, 21);
          currentY = 28; 
        }

        autoTable(doc, {
          startY: currentY,
          columns: reportColumns,
          body: body,
          theme: 'grid',
          columnStyles: colStyles,
          headStyles: { 
            fillColor: [109, 40, 217], 
            textColor: 255, 
            fontSize: 7, 
            fontStyle: 'bold', 
            halign: 'center',
            cellPadding: 2
          },
          styles: { 
            fontSize: 6, 
            cellPadding: 1.5, 
            halign: 'center',
            valign: 'middle',
            overflow: 'ellipsize',
            minCellHeight: 11.5
          },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          rowPageBreak: 'avoid',
          margin: { top: 14, right: 6, bottom: 20, left: 6 },
          // willDrawCell fires BEFORE text is painted — use it to blank out the raw URL text
          willDrawCell: (data) => {
            if (data.column.dataKey === 'image' && data.cell.section === 'body') {
              data.cell.text = [];
            }
          },
          // didDrawCell fires AFTER the cell background is drawn — overlay the image here
          didDrawCell: (data) => {
            if (data.column.dataKey === 'image' && data.cell.section === 'body') {
              const url = data.cell.raw;
              const b64 = imageMap[url];
              if (b64) {
                const padding = 1;
                const imgSize = Math.min(data.cell.width - padding * 2, data.cell.height - padding * 2, 8);
                const x = data.cell.x + (data.cell.width - imgSize) / 2;
                const y = data.cell.y + (data.cell.height - imgSize) / 2;
                try {
                  doc.addImage(b64, 'JPEG', x, y, imgSize, imgSize);
                } catch (e) {
                  console.warn('Failed to add image to PDF:', e);
                }
              }
            }
          },
          didDrawPage: function (data) {
            const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text(
              `Page ${pageNumber} of {total_pages_count_string}`,
              doc.internal.pageSize.width - 6,
              doc.internal.pageSize.height - 8,
              { align: 'right' }
            );
          }
        });

        if (typeof doc.putTotalPages === 'function') {
          doc.putTotalPages('{total_pages_count_string}');
        }

        doc.save(`${isIssued ? 'Issued' : 'Return'}_History_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Report generated successfully');
      } catch (err) {
        console.error('Report error:', err);
        showToast('Failed to generate report', 'error');
      } finally {
        setIsReportGenerating(false);
      }
    }, 100);
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-42px)] bg-[#f0f2f8] font-sans flex flex-col overflow-hidden">
        {toast.show && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-3xl shadow-2xl z-[200] transition-all duration-300 transform animate-in slide-in-from-right-8 ${toast.type === "success" ? "bg-violet-600 text-white shadow-violet-200" : "bg-red-600 text-white shadow-red-200"}`}>
            <div className="flex items-center gap-3 font-sans"><span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span></div>
          </div>
        )}

        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
            {Object.keys(editDataMap).length > 0 && (
              <button
                onClick={handleBatchSubmit}
                disabled={isSubmitting || changedRowsCount === 0}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg animate-in fade-in zoom-in-95 ${
                  changedRowsCount > 0 
                  ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit {changedRowsCount} {changedRowsCount === 1 ? 'Change' : 'Changes'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setShowFullTotal(!showFullTotal)}
              className="flex items-center h-10 px-4 bg-emerald-600 text-white rounded-lg shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 cursor-pointer hover:bg-emerald-700 transition-all select-none"
              title={showFullTotal ? "Click to see short format" : "Click to see exact amount"}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mr-3">
                {activeTab === 'issued' ? 'Issue Amount:' : 'Return Amount:'}
              </span>
              <span className="text-sm font-bold text-white">
                ₹{showFullTotal 
                   ? totalInventoryCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                   : formatIndianAmount(totalInventoryCost)
                 }
              </span>
            </div>
            <button onClick={() => { setIsIssueModalOpen(true); setImagePreview(null); setSelectedImage(null); }} className="h-10 px-5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-violet-100">
              <ClipboardList className="h-4 w-4 text-white/70" /> Issue Form
            </button>
            <button onClick={() => { setIsReturnModalOpen(true); setImagePreview(null); setSelectedImage(null); }} className="h-10 px-5 bg-white border border-fuchsia-200 text-fuchsia-600 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-fuchsia-50 transition-all shadow-sm">
              <ArrowLeftRight className="h-4 w-4 text-fuchsia-400" /> Return Form
            </button>
            <button 
              onClick={handleGenerateReport} 
              disabled={isReportGenerating}
              className={`h-10 px-5 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-indigo-100 ${isReportGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              {isReportGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-white/70" />}
              {activeTab === 'issued' ? 'Issue Report' : 'Return Report'}
            </button>
          </div>
        </div>

        <div className="mx-6 mb-6 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0 overflow-visible relative">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/50 rounded-t-xl">
            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl shadow-inner-sm">
              <button onClick={() => setActiveTab('issued')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'issued' ? 'bg-white text-fuchsia-600 shadow-xl shadow-fuchsia-100/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Issued History</button>
              <button onClick={() => setActiveTab('return')} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'return' ? 'bg-white text-fuchsia-600 shadow-xl shadow-fuchsia-100/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Return History</button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white w-40 transition-all" />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                  {activeTab === 'issued' ? (
                    <>
                      <select value={issuedFilterParty} onChange={(e) => setIssuedFilterParty(e.target.value)} className="h-8 pl-2 pr-8 bg-white border border-slate-200/60 rounded-xl text-[10px] font-bold text-slate-600 appearance-none min-w-[90px] hover:border-fuchsia-200 transition-all cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d946ef' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}>
                        <option value="">All Party</option>
                        {issuedOptions.parties.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <select value={issuedFilterItem} onChange={(e) => setIssuedFilterItem(e.target.value)} className="h-8 pl-2 pr-8 bg-white border border-slate-200/60 rounded-xl text-[10px] font-bold text-slate-600 appearance-none min-w-[90px] hover:border-fuchsia-200 transition-all cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d946ef' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}>
                        <option value="">All Items</option>
                        {issuedOptions.items.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </>
                  ) : (
                    <>
                      <select value={returnFilterParty} onChange={(e) => setReturnFilterParty(e.target.value)} className="h-8 pl-2 pr-8 bg-white border border-slate-200/60 rounded-xl text-[10px] font-bold text-slate-600 appearance-none min-w-[90px] hover:border-fuchsia-200 transition-all cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d946ef' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}>
                        <option value="">All Party</option>
                        {returnOptions.parties.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <select value={returnFilterItem} onChange={(e) => setReturnFilterItem(e.target.value)} className="h-8 pl-2 pr-8 bg-white border border-slate-200/60 rounded-xl text-[10px] font-bold text-slate-600 appearance-none min-w-[90px] hover:border-fuchsia-200 transition-all cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d946ef' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}>
                        <option value="">All Items</option>
                        {returnOptions.items.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </>
                  )}
                  <div className="relative border-l border-slate-200 ml-1 pl-1">
                    <button
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className={`h-8 px-3 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-all ${isDateMenuOpen || (activeTab === 'issued' ? (issuedStartDate || issuedEndDate) : (returnStartDate || returnEndDate)) ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}
                    >
                      <Calendar className={`h-3 w-3 ${isDateMenuOpen || (activeTab === 'issued' ? (issuedStartDate || issuedEndDate) : (returnStartDate || returnEndDate)) ? 'text-white' : 'text-slate-400'}`} />
                      <span>{activeTab === 'issued' ? (issuedStartDate || issuedEndDate ? `${issuedStartDate || '...'} - ${issuedEndDate || '...'}` : 'DATE') : (returnStartDate || returnEndDate ? `${returnStartDate || '...'} - ${returnEndDate || '...'}` : 'DATE')}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDateMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-[140]" 
                          onClick={() => setIsDateMenuOpen(false)}
                        />
                        <div className="absolute top-10 right-0 z-[160] w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'issued' ? 'Issued History' : 'Return History'}</p>
                            {(activeTab === 'issued' ? (issuedStartDate || issuedEndDate) : (returnStartDate || returnEndDate)) && (
                              <button 
                                onClick={() => { if (activeTab === 'issued') { setIssuedStartDate(""); setIssuedEndDate(""); } else { setReturnStartDate(""); setReturnEndDate(""); } }}
                                className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-tighter"
                              >
                                Clear Dates
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={activeTab === 'issued' ? issuedStartDate : returnStartDate}
                                  onChange={(e) => activeTab === 'issued' ? setIssuedStartDate(e.target.value) : setReturnStartDate(e.target.value)}
                                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={activeTab === 'issued' ? issuedEndDate : returnEndDate}
                                  onChange={(e) => activeTab === 'issued' ? setIssuedEndDate(e.target.value) : setReturnEndDate(e.target.value)}
                                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsDateMenuOpen(false)}
                            className="w-full mt-4 py-2 bg-violet-600 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all uppercase tracking-widest"
                          >
                            Apply Filter
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {((activeTab === 'issued' ? (issuedFilterItem || issuedFilterType || issuedFilterParty || issuedStartDate || issuedEndDate) : (returnFilterItem || returnFilterType || returnFilterParty || returnStartDate || returnEndDate)) || searchTerm) && (
                    <button
                      onClick={() => {
                        if (activeTab === 'issued') { setIssuedFilterItem(""); setIssuedFilterType(""); setIssuedFilterParty(""); setIssuedStartDate(""); setIssuedEndDate(""); } 
                        else { setReturnFilterItem(""); setReturnFilterType(""); setReturnFilterParty(""); setReturnStartDate(""); setReturnEndDate(""); }
                        setSearchTerm("");
                      }}
                      className="p-1 ml-1 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-colors border-l border-slate-100 pl-2"
                      title="Clear All Filters"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <button onClick={() => setIsColMenuOpen(!isColMenuOpen)} className={`h-8 px-3 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-all ${isColMenuOpen ? 'bg-violet-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}>
                  <Settings2 className="h-3 w-3" /> Column <ChevronDown className={`h-3 w-3 transition-transform ${isColMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isColMenuOpen && (
                  <div className="absolute top-12 right-0 z-[100] w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-3">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</p><button onClick={() => setIsColMenuOpen(false)}><X className="h-4 w-4 text-slate-300" /></button></div>
                    <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto pr-1">
                      {columnConfig.filter(c => c.key !== 'actions').map(col => (
                        <button key={col.key} onClick={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold ${visibleColumns[col.key] ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <span>{col.label}</span> {visibleColumns[col.key] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-center border-collapse border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="bg-violet-50">
                  <th className="px-4 py-4 w-12 text-center bg-violet-50 border-b border-violet-100/50">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      checked={getFilteredHistory().length > 0 && selectedSerials.size === getFilteredHistory().length}
                      onChange={() => handleSelectAll(getFilteredHistory())}
                    />
                  </th>
                  {columnConfig.map(col => visibleColumns[col.key] !== false && (
                    <th key={col.key} className={`px-6 py-4 text-[10px] font-bold text-violet-600 uppercase tracking-[0.15em] bg-violet-50 border-b border-violet-100/50 text-center ${['date', 'eventDate', 'returnDate'].includes(col.key) ? 'min-w-[120px]' : ''}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isTableLoading ? (
                  <tr><td colSpan={columnConfig.length + 1} className="py-20 text-center"><div className="flex flex-col items-center gap-3"><Loader2 className="h-10 w-10 animate-spin text-violet-200" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Records...</p></div></td></tr>
                ) : getFilteredHistory().length === 0 ? (
                  <tr><td colSpan={columnConfig.length + 1} className="py-32 text-center text-slate-300"><Database className="h-12 w-12 mx-auto mb-4 opacity-10" /><p className="text-xs font-bold uppercase tracking-widest">No history found</p></td></tr>
                ) : (
                  getFilteredHistory().map((row, idx) => {
                    const sn = row[1];
                    const isSelected = selectedSerials.has(sn);
                    const currentData = editDataMap[sn] || row;

                    return (
                      <tr key={idx} className={`transition-all font-sans border-b border-slate-50 last:border-0 ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row)}
                          />
                        </td>
                        {columnConfig.map(col => visibleColumns[col.key] !== false && (
                          <td key={col.key} className="px-4 py-3 text-xs font-semibold text-slate-600 text-center">
                            {isSelected && activeTab === 'issued' && col.key === 'qty' ? (
                              <input type="number" value={currentData[8]} onChange={(e) => handleInlineEdit(sn, 8, e.target.value, 'issued')} className="w-20 px-2 py-1 bg-white border border-violet-200 rounded text-center text-xs font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                            ) : isSelected && activeTab === 'return' && col.key === 'qty' ? (
                              <input type="number" value={currentData[10]} onChange={(e) => handleInlineEdit(sn, 10, e.target.value, 'return')} className="w-20 px-2 py-1 bg-white border border-violet-200 rounded text-center text-xs font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                            ) : isSelected && activeTab === 'return' && col.key === 'damage' ? (
                              <input type="number" value={currentData[11]} onChange={(e) => handleInlineEdit(sn, 11, e.target.value, 'return')} className="w-20 px-2 py-1 bg-white border border-violet-200 rounded text-center text-xs font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                            ) : isSelected && activeTab === 'return' && col.key === 'missing' ? (
                              <input type="number" value={currentData[12]} onChange={(e) => handleInlineEdit(sn, 12, e.target.value, 'return')} className="w-20 px-2 py-1 bg-white border border-violet-200 rounded text-center text-xs font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                            ) : col.key === 'actions' ? (
                              <button onClick={() => handleEditReturn(currentData)} className="p-2 bg-slate-100 text-slate-400 hover:bg-violet-600 hover:text-white rounded-lg transition-all" title="Edit Record"><Settings2 className="h-4 w-4" /></button>
                            ) : col.key === 'date' || col.key === 'eventDate' || col.key === 'returnDate' ? (
                              <span className="text-slate-400 whitespace-nowrap">{formatDate(currentData[col.index])}</span>
                            ) : col.key === 'damage' ? ( <span className="text-red-500 font-bold">{currentData[col.index]}</span>
                            ) : col.key === 'missing' ? ( <span className="text-orange-500 font-bold">{currentData[col.index]}</span>
                            ) : col.key === 'item' ? ( <span className="font-bold text-slate-800">{currentData[col.index]}</span>
                            ) : col.key === 'estimatedCost' || col.key === 'totalCost' ? ( <span className="font-bold text-emerald-600">₹{parseFloat(currentData[col.index] || 0).toFixed(2)}</span>
                            ) : col.key === 'image' ? (
                              currentData[col.index] && currentData[col.index] !== 'No Image' ? (
                                <div className="relative flex justify-center group/img">
                                  <a href={currentData[col.index]} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-50 group-hover:scale-110 transition-transform">
                                    <img 
                                      src={getDisplayableImageUrl(currentData[col.index])} 
                                      alt="Item" 
                                      className="h-full w-full object-cover" 
                                      onError={(e) => {
                                        const id = extractDriveFileId(currentData[col.index]);
                                        if (id && !e.target.dataset.retried) {
                                          e.target.dataset.retried = '1';
                                          // Try the lh3 CDN as a second attempt
                                          e.target.src = `https://lh3.googleusercontent.com/d/${id}`;
                                        }
                                      }}
                                    />
                                  </a>
                                </div>
                              ) : <EyeOff className="h-4 w-4 opacity-10 mx-auto text-slate-200" />
                            ) : currentData[col.index] || '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS (Preserved as is but with small bug fixes found during review) */}
        {(isIssueModalOpen || isReturnModalOpen) && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isIssueModalOpen ? 'bg-violet-100 text-violet-600' : 'bg-fuchsia-100 text-fuchsia-600'}`}>
                    {isIssueModalOpen ? <ClipboardList className="h-5 w-5" /> : <ArrowLeftRight className="h-5 w-5" />}
                  </div>
                  {isEditing ? 'Edit Return Record' : (isIssueModalOpen ? 'Issue Items to Party' : 'Return Items from Party')}
                </h2>
                <button onClick={() => { setIsIssueModalOpen(false); setIsReturnModalOpen(false); setIsEditing(false); }} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-all font-sans"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={isIssueModalOpen ? handleIssueSubmit : handleReturnSubmit} className="px-7 py-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar font-sans">
                {isIssueModalOpen && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-600 uppercase tracking-wide">For *</label>
                      <select 
                        value={issueForm.forType} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const item = inventoryItems.find(i => i.itemsName === issueForm.itemsName && i.inventoryType === issueForm.inventoryType);
                          const masterRow = masterData.find(row => String(row[1] || '').trim().toLowerCase() === String(issueForm.itemsName).trim().toLowerCase());
                          
                          setIssueForm(p => ({ 
                            ...p, 
                            forType: val,
                            perUnit: val === 'H3' ? '0' : (masterRow ? masterRow[5] : (item ? item.perUnit : p.perUnit)),
                            unit: val === 'H3' ? '0' : (masterRow ? masterRow[6] : (item ? item.unit : p.unit))
                          }));
                        }} 
                        required 
                        className="w-full h-11 px-4 rounded-lg border-2 border-violet-100 focus:border-violet-500 outline-none text-sm font-bold text-violet-700 bg-violet-50/20 transition-all"
                      >
                        <option value="Rent">Rent</option>
                        <option value="H3">H3</option>
                      </select>
                    </div>

                    <div className="space-y-1 relative" ref={issuerDropdownRef}>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Issuer *</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={issueForm.issuer} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setIssueForm(p => ({ ...p, issuer: val }));
                            setShowIssuerDropdown(true);
                          }}
                          onFocus={() => setShowIssuerDropdown(true)}
                          required 
                          placeholder="Type or select..." 
                          className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 bg-white"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowIssuerDropdown(!showIssuerDropdown)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showIssuerDropdown ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      
                      {showIssuerDropdown && (
                        <div className="absolute z-[160] w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                          {(dropdownOptions.issuerOptions || [])
                            .filter(opt => !issueForm.issuer || opt.toLowerCase().includes(issueForm.issuer.toLowerCase()))
                            .map((opt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setIssueForm(p => ({ ...p, issuer: opt }));
                                  setShowIssuerDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition-colors border-b border-slate-50 last:border-0"
                              >
                                {opt}
                              </button>
                            ))}
                          {dropdownOptions.issuerOptions.filter(opt => !issueForm.issuer || opt.toLowerCase().includes(issueForm.issuer.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-xs font-bold text-slate-400 italic text-center">No matching issuers</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type *</label>
                      <select value={issueForm.inventoryType} onChange={(e) => setIssueForm(p => ({ ...p, inventoryType: e.target.value, itemsName: '' }))} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 bg-white">
                        <option value="">Select type</option>
                        {[...new Set(stockRows.map(row => row[3]).filter(Boolean))].sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name *</label>
                      <select value={issueForm.itemsName} onChange={(e) => {
                        const val = e.target.value;
                        const item = inventoryItems.find(i => i.itemsName === val && i.inventoryType === issueForm.inventoryType);
                        const masterRow = masterData.find(row => String(row[1] || '').trim().toLowerCase() === String(val).trim().toLowerCase());
                        
                        if (item) {
                          setIssueForm(prev => ({ 
                            ...prev, 
                            itemsName: val, 
                            department: item.department, 
                            inventoryNo: item.inventoryNo, 
                            openingBalance: item.openingBalance, 
                            perUnit: prev.forType === 'H3' ? '0' : (masterRow ? masterRow[5] : item.perUnit), 
                            unit: prev.forType === 'H3' ? '0' : (masterRow ? masterRow[6] : item.unit), 
                            imageUrl: item.imageUrl 
                          }));
                          if (item.imageUrl) setImagePreview(getDisplayableImageUrl(item.imageUrl));
                        }
                      }} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 bg-white">
                        <option value="">Select item name</option>
                        {filteredItems.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {isReturnModalOpen && !isEditing && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Event Date *</label>
                      <select 
                        value={modalFilterDate} 
                        onChange={(e) => { 
                          const d = e.target.value; 
                          setModalFilterDate(d); setModalFilterParty(''); setModalFilterItem(''); 
                          setReturnForm(p => ({ ...p, eventDate: d, partyName: '', itemsName: '' })); 
                        }} 
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 outline-none text-sm font-medium bg-white"
                      >
                        <option value="">Select date</option>
                        {[...new Set(issueHistory.map(row => row[7]).filter(Boolean))].sort().map(d => <option key={d} value={toInputDate(d)}>{formatDate(d)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Party Name *</label>
                      <select 
                        value={modalFilterParty} 
                        disabled={!modalFilterDate}
                        onChange={(e) => { 
                          const p = e.target.value; 
                          setModalFilterParty(p); setModalFilterItem(''); 
                          setReturnForm(prev => ({ ...prev, partyName: p, itemsName: '' })); 
                        }} 
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 outline-none text-sm font-medium bg-white disabled:bg-slate-50"
                      >
                        <option value="">Select party</option>
                        {[...new Set(issueHistory.filter(r => toInputDate(r[7]) === modalFilterDate).map(r => r[6]).filter(Boolean))].sort().map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name *</label>
                      <select 
                        value={modalFilterItem} 
                        disabled={!modalFilterParty}
                        onChange={(e) => { 
                          const i = e.target.value; 
                          setModalFilterItem(i); 
                          const matches = issueHistory.filter(r => toInputDate(r[7]) === modalFilterDate && r[6] === modalFilterParty && r[5] === i);
                          if (matches.length > 0) handleSelectBatch(matches);
                          else setMatchingIssuedRows([]);
                        }} 
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 outline-none text-sm font-medium bg-white disabled:bg-slate-50"
                      >
                        <option value="">Select item</option>
                        {[...new Set(issueHistory.filter(r => toInputDate(r[7]) === modalFilterDate && r[6] === modalFilterParty).map(r => r[5]).filter(Boolean))].sort().map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {isIssueModalOpen ? (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                    {[
                      { label: 'Department', val: issueForm.department },
                      { label: 'Inventory No', val: issueForm.inventoryNo },
                      { label: 'Opening Bal', val: (issueForm.openingBalance !== undefined && issueForm.openingBalance !== '') ? issueForm.openingBalance : '-' },
                      { label: 'Last Issued (Date)', val: validationState.committed || '0' }
                    ].map((f, i) => (
                      <div key={i} className="space-y-1.5 flex-1 min-w-[22%]">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">{f.label}</label>
                        <div className="h-10 flex items-center bg-white/50 px-3 rounded-lg border border-slate-200/50 text-xs font-bold text-slate-500 truncate">{f.val}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {!isEditing && matchingIssuedRows.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between px-2 mb-1">
                          <div className="flex flex-col">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">For (Issue Type)</label>
                            <div className="text-[11px] font-bold text-slate-700 ml-1">{returnForm.forType || '-'}</div>
                          </div>
                          <div className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                            {matchingIssuedRows.length}  Events  Combined
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                          <table className="w-full text-left text-xs table-fixed">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2.5 border-r border-slate-200/50 w-[20%] text-center">S. No.</th>
                                <th className="px-4 py-2.5 border-r border-slate-200/50 w-[30%]">Inv. Type</th>
                                <th className="px-4 py-2.5 border-r border-slate-200/50 w-[30%]">Event Type</th>
                                <th className="px-4 py-2.5 w-[20%] text-center">Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {matchingIssuedRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-2.5 border-r border-slate-200/50 text-center font-bold text-slate-400 truncate">{row[1] || '-'}</td>
                                  <td className="px-4 py-2.5 border-r border-slate-200/50 font-bold text-slate-600 truncate">{row[3] || '-'}</td>
                                  <td className="px-4 py-2.5 border-r border-slate-200/50 font-bold text-slate-700 truncate">{row[17] || 'Regular'}</td>
                                  <td className="px-4 py-2.5 text-center font-black text-violet-600">{row[8]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                        {[
                          { label: 'Department', val: returnForm.department },
                          { label: 'Inventory Type', val: returnForm.inventoryType },
                          { label: 'Inventory No', val: returnForm.inventoryNo }
                        ].map((f, i) => (
                          <div key={i} className="space-y-1.5 flex-1 min-w-[30%]">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">{f.label}</label>
                            <div className="h-10 flex items-center bg-white/50 px-3 rounded-lg border border-slate-200/50 text-xs font-bold text-slate-500 truncate">{f.val}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isIssueModalOpen && (
                  <div className="space-y-4">
                    {/* Row 1: Party Name, Event Date, Event Type */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Party Name *</label>
                        <input type="text" value={issueForm.partyName} onChange={(e) => setIssueForm(p => ({ ...p, partyName: e.target.value }))} required placeholder="Party name" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 text-sm font-medium" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Event Date *</label>
                        <input type="date" value={issueForm.eventDate} onChange={(e) => setIssueForm(p => ({ ...p, eventDate: e.target.value }))} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 text-sm font-medium" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Event Type *</label>
                        <select value={issueForm.eventTime} onChange={(e) => setIssueForm(p => ({ ...p, eventTime: e.target.value }))} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 text-sm font-medium bg-white outline-none">
                          <option value="">Select time</option>
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Venue Name, Issue Qty, Renting Rate */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Venue Name</label>
                        <input 
                          type="text" 
                          value={issueForm.foodName} 
                          onChange={(e) => setIssueForm(p => ({ ...p, foodName: e.target.value }))} 
                          placeholder="Enter venue..."
                          className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 text-sm font-medium" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-violet-600 uppercase tracking-wide">Issue Quantity *</label>
                        <input 
                          type="number" 
                          onWheel={(e) => e.target.blur()} 
                          value={issueForm.issueData} 
                          onChange={(e) => setIssueForm(p => ({ ...p, issueData: e.target.value }))} 
                          required 
                          placeholder="0"
                          className={`w-full h-11 px-4 rounded-lg border-2 outline-none text-sm font-bold transition-all ${validationState.isOver ? 'border-red-500 bg-red-50 text-red-700' : 'border-violet-100 focus:border-violet-500 text-violet-700 bg-violet-50/20'}`} 
                        />
                        {validationState.isOver && (
                          <div className="absolute z-10 w-full">
                            <p className="text-[10px] text-red-600 font-black mt-2 animate-pulse px-1 flex items-center gap-2 uppercase tracking-widest bg-red-50 py-1.5 rounded-md border border-red-100 shadow-xl w-fit whitespace-nowrap">
                              <Zap className="h-3 w-3 fill-red-600" /> Over Capacity: Only {validationState.availableForThisGroup} units left
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Renting Rate (₹) *</label>
                        <input 
                          type="number" 
                          onWheel={(e) => e.target.blur()} 
                          step="0.01" 
                          value={issueForm.perUnit} 
                          onChange={(e) => setIssueForm(p => ({ ...p, perUnit: e.target.value }))} 
                          required 
                          readOnly={issueForm.forType === 'H3'}
                          placeholder="0.00"
                          className={`w-full h-11 px-4 rounded-lg border focus:border-violet-500 text-sm font-medium ${issueForm.forType === 'H3' ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-200'}`} 
                        />
                      </div>
                    </div>

                    {/* Row 3: Estimated Cost, Damage/Missing Rate, Item-Attachment */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Estimated Cost</label>
                        <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700 shadow-sm">
                          ₹{(Number(issueForm.issueData || 0) * Number(issueForm.perUnit || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Damage/Missing Rate (₹) *</label>
                        <input 
                          type="number" 
                          onWheel={(e) => e.target.blur()} 
                          step="0.01" 
                          value={issueForm.unit} 
                          onChange={(e) => setIssueForm(p => ({ ...p, unit: e.target.value }))} 
                          required 
                          readOnly={issueForm.forType === 'H3'}
                          placeholder="0.00"
                          className={`w-full h-11 px-4 rounded-lg border focus:border-violet-500 text-sm font-medium ${issueForm.forType === 'H3' ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-200'}`} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item-Attachment</label>
                        <div className="h-11">
                          <input type="file" id="inventory-upload" onChange={handleImageChange} className="hidden" accept="image/*" />
                          <label htmlFor="inventory-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 bg-white cursor-pointer transition-all">
                            <div className="flex items-center gap-3 truncate">
                              <UploadCloud className="h-4 w-4 text-slate-300" />
                              <span className="text-xs font-semibold text-slate-500">{selectedImage ? "New File" : "Upload"}</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Final Row: Image Preview & Remarks (Stay in 2-cols) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Preview</label>
                        <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm h-28 flex items-center justify-center">
                          {imagePreview ? (
                            <div className="relative group rounded-lg overflow-hidden bg-slate-50 h-full w-full">
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                              <button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-20">
                              <UploadCloud className="h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks</label>
                        <textarea 
                          value={issueForm.remarks} 
                          onChange={(e) => setIssueForm(p => ({ ...p, remarks: e.target.value }))} 
                          placeholder="Add any internal remarks..." 
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 h-28 resize-none shadow-sm focus:border-violet-500 outline-none text-sm font-medium" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isReturnModalOpen && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-xs font-bold text-fuchsia-600 uppercase tracking-wide">Return Date *</label><input type="date" value={returnForm.returnDate} onChange={(e) => setReturnForm(p => ({ ...p, returnDate: e.target.value }))} required className="w-full h-11 px-4 rounded-lg border-2 border-fuchsia-100 focus:border-fuchsia-500 text-sm font-medium" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Issue Quantity</label><div className="h-11 flex items-center bg-slate-50/50 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-400 italic">{returnForm.issueQty || '0'}</div></div>
                    </div>
                    
                    {/* Row 1: Damage, Missing, Damage Rate */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-xs font-bold text-red-500 uppercase tracking-wide">Damage *</label><input type="number" onWheel={(e) => e.target.blur()} value={returnForm.damageItems} onChange={(e) => setReturnForm(p => ({ ...p, damageItems: e.target.value }))} required className="w-full h-11 px-4 rounded-lg border border-red-100 focus:border-red-500 text-sm font-medium text-red-700 bg-red-50/20" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-orange-500 uppercase tracking-wide">Missing *</label><input type="number" onWheel={(e) => e.target.blur()} value={returnForm.missingItems} onChange={(e) => setReturnForm(p => ({ ...p, missingItems: e.target.value }))} required className="w-full h-11 px-4 rounded-lg border border-orange-100 focus:border-orange-500 text-sm font-medium text-orange-700 bg-orange-50/20" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Damage Rate (₹)</label><div className="h-11 flex items-center bg-slate-50/50 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-400 italic">{returnForm.damageRate || '0'}</div></div>
                    </div>

                    {/* Row 2: Return Qty, Renting Rate, Total Cost */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-xs font-bold text-fuchsia-400 uppercase tracking-wide">Return Qty (Calc)</label><div className="h-11 flex items-center bg-fuchsia-50/10 px-4 rounded-lg border border-fuchsia-100 text-sm font-bold text-fuchsia-400 italic">{returnForm.returnData || '0'}</div></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Renting Rate (₹)</label><div className="h-11 flex items-center bg-slate-50/50 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-400 italic">{returnForm.rentingRate || '0'}</div></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost (₹)</label><div className="h-11 flex items-center bg-emerald-50 px-4 rounded-lg border border-emerald-200 text-sm font-black text-emerald-700 shadow-inner-sm">₹{returnForm.totalCost || '0.00'}</div></div>
                    </div>

                    {/* Shared Image/Remarks for Return */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Image Attachment</label>
                        <div className="h-11"><input type="file" id="return-upload" onChange={handleImageChange} className="hidden" accept="image/*" /><label htmlFor="return-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-fuchsia-400 bg-white cursor-pointer"><div className="flex items-center gap-3 truncate"><UploadCloud className="h-4 w-4 text-slate-300" /><span>{selectedImage ? "New File" : "Upload Image"}</span></div><div className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div></label></div>
                        {imagePreview && <div className="mt-2 p-2 bg-white border border-slate-100 rounded-xl shadow-sm"><div className="relative group rounded-lg overflow-hidden bg-slate-50 h-48"><img src={imagePreview} alt="Preview" className="w-full h-full object-contain" /><button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg transition-all"><X className="h-3.5 w-3.5" /></button></div></div>}
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks</label><textarea value={returnForm.remarks} onChange={(e) => setReturnForm(p => ({ ...p, remarks: e.target.value }))} placeholder="..." rows="3" className="w-full px-4 py-2 rounded-lg border border-slate-200 h-28 resize-none shadow-sm focus:border-fuchsia-500 outline-none" /></div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => { setIsIssueModalOpen(false); setIsReturnModalOpen(false); setIsEditing(false); }} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || (isIssueModalOpen && validationState.isOver)} 
                    className={`min-w-[140px] px-10 py-2.5 rounded-xl text-white text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${isIssueModalOpen ? 'bg-violet-600' : 'bg-fuchsia-600'} hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Processing...</span></> : (isIssueModalOpen ? 'Issue Items' : 'Return Items')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </AdminLayout>
  );
};

export default Inventory;
