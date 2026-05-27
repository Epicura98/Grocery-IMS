"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Search,
  Loader2,
  Package,
  Tag,
  ShoppingCart,
  ClipboardList,
  FileText,
  LayoutGrid,
  Filter,
  ArrowUpRight,
  Database,
  History,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreVertical,
  Hash,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  UploadCloud,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Settings2
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import { formatDate, compressImage, parseRowDate, formatIndianAmount, formatDateTime, cleanText, normalizeForMatch } from "../utils/helpers";
import { fetchSheetDataInBackground } from "../utils/api";

export default function Stock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showFullTotal, setShowFullTotal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('purchase'); // 'purchase' or 'repurchase'

  // Data State
  const [masterData, setMasterData] = useState([]);
  const [stockRows, setStockRows] = useState([]); // Standard Purchase items
  const [rePurchaseRows, setRePurchaseRows] = useState([]); // Re-Purchase items
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: []
  });

  // Edit State
  const [editDataMap, setEditDataMap] = useState({}); // { [serial]: rowArray }
  const [selectedSerials, setSelectedSerials] = useState(new Set());

  // Table Filters State
  const [filterType, setFilterType] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    type: true,
    dept: true,
    item: true,
    vendor: true,
    balance: true,
    unit: true,
    image: true,
    perUnit: true,
    costPrice: true,
    remarks: true
  });

  const columnConfig = [
    { key: 'date', label: 'Date', index: 0 },
    { key: 'type', label: 'Type', index: 3 },
    { key: 'dept', label: 'Department', index: 4 },
    { key: 'item', label: 'Item Name', index: 5 },
    { key: 'vendor', label: 'Vendor Name', index: 6 },
    { key: 'balance', label: 'Opening Balance', index: 7 },
    { key: 'unit', label: 'Unit', index: 8 },
    { key: 'perUnit', label: 'Per Unit (₹)', index: 9 },
    { key: 'costPrice', label: 'Cost Price (₹)', index: 12 },
    { key: 'image', label: 'Image', index: 10 },
    { key: 'remarks', label: 'Remarks', index: 11 }
  ];

  // Filter Options (derived from data)
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showPurchaseItemDropdown, setShowPurchaseItemDropdown] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Form State
  const [form, setForm] = useState({
    inventoryType: '',
    department: '',
    itemsName: '',
    vendorName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    rentalPrice: ''
  });

  const [purchaseForm, setPurchaseForm] = useState({
    inventoryType: '',
    department: '',
    itemsName: '',
    vendorName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    inventoryNo: '',
    imageUrl: ''
  });

  const scriptUrl = import.meta.env.VITE_SCRIPT_URL;
  const folderId = import.meta.env.VITE_STOCK_FOLDER_ID;
  const spreadsheetId = import.meta.env.VITE_SHEET_ID;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  function getDisplayableImageUrl(url) {
    if (!url) return null;
    try {
      const directMatch = url.match(/file\/d\/([a-zA-Z0-9\-_]+)/);
      if (directMatch && directMatch[1]) return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w200`;
      const ucMatch = url.match(/[?&]id=([a-zA-Z0-9\-_]+)/);
      if (ucMatch && ucMatch[1]) return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
      const openMatch = url.match(/open\?id=([a-zA-Z0-9\-_]+)/);
      if (openMatch && openMatch[1]) return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w200`;
      const anyIdMatch = url.match(/([a-zA-Z0-9\-_]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w200`;
      return url;
    } catch { return url; }
  }

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

  const handleInlineEdit = (sn, index, value) => {
    setEditDataMap(prev => {
      const row = [...prev[sn]];
      row[index] = value;
      // Recalculate Cost Price (Index 12) = Opening Bal (7) * Per Unit (9)
      if (index === 7 || index === 9) {
        row[12] = (parseFloat(row[7] || 0) * parseFloat(row[9] || 0)).toFixed(2);
      }
      return { ...prev, [sn]: row };
    });
  };
  const changedRowsCount = useMemo(() => {
    const currentRows = activeTab === 'purchase' ? stockRows : rePurchaseRows;
    return Object.keys(editDataMap).filter(sn => {
      const editRow = editDataMap[sn];
      const originalRow = currentRows.find(r => r[1] === sn);
      if (!originalRow) return false;
      return JSON.stringify(editRow) !== JSON.stringify(originalRow);
    }).length;
  }, [editDataMap, stockRows, rePurchaseRows, activeTab]);

  const handleBatchSubmit = async () => {
    setIsSubmitting(true);
    try {
      const rowsToUpdate = Object.values(editDataMap).map(row => {
        const newRow = row.map(cell => typeof cell === 'string' ? cleanText(cell) : cell);
        newRow[0] = formatDateTime(newRow[0]);
        return newRow;
      });
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'batchUpdate',
          sheetName: activeTab === 'purchase' ? 'Add-Stock' : 'Re-Purchase',
          spreadsheetId: spreadsheetId,
          rowsData: JSON.stringify(rowsToUpdate)
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast(`${rowsToUpdate.length} record(s) updated successfully`);
        setEditDataMap({});
        setSelectedSerials(new Set());
        fetchStockData();
      } else throw new Error(result.error);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSerials.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedSerials.size} selected record(s)?`)) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const serialsArray = Array.from(selectedSerials);
    const targetSheet = activeTab === 'purchase' ? 'Add-Stock' : 'Re-Purchase';

    try {
      for (const serial of serialsArray) {
        try {
          const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              action: 'delete',
              sheetName: targetSheet,
              spreadsheetId: spreadsheetId,
              serialNumber: serial
            })
          });
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            console.error(`Failed to delete serial ${serial}:`, result.error);
            failCount++;
          }
        } catch (err) {
          console.error(`Error deleting serial ${serial}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Successfully deleted ${successCount} record(s)`);
      }
      if (failCount > 0) {
        showToast(`Failed to delete ${failCount} record(s)`, 'error');
      }

      // Clear selection and refresh stock data
      setSelectedSerials(new Set());
      setEditDataMap({});
      fetchStockData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchStockData = async () => {
    setIsTableLoading(true);
    // Fetch Add-Stock in background
    fetchSheetDataInBackground(scriptUrl, 'Add-Stock', spreadsheetId, (data, isComplete) => {
      const validRows = data.filter(row => row[5] && row[5].toString().trim() !== "");
      setStockRows(validRows.reverse());
      if (isComplete && activeTab === 'purchase') setIsTableLoading(false);
      if (validRows.length > 0 && activeTab === 'purchase') setIsTableLoading(false);
    });

    // Fetch Re-Purchase in background
    fetchSheetDataInBackground(scriptUrl, 'Re-Purchase', spreadsheetId, (data, isComplete) => {
      const validRows = data.filter(row => row[5] && row[5].toString().trim() !== "");
      setRePurchaseRows(validRows.reverse());
      if (isComplete && activeTab === 'repurchase') setIsTableLoading(false);
      if (validRows.length > 0 && activeTab === 'repurchase') setIsTableLoading(false);
    });
  };

  useEffect(() => {
    const loadAllData = async () => {
      setIsTableLoading(true);
      try {
        const dropdownRes = await fetch(`${scriptUrl}?action=fetch&sheet=Master-Dropdown&spreadsheetId=${spreadsheetId}`).then(r => r.json());

        if (dropdownRes.success && dropdownRes.data) {
          const rows = dropdownRes.data.slice(1);
          setMasterData(rows);
          setDropdownOptions({
            inventoryTypeOptions: [...new Set(rows.map(row => row[3]).filter(Boolean))],
            departmentOptions: [...new Set(rows.map(row => row[2]).filter(Boolean))],
            unitOptions: [...new Set(rows.map(row => row[4]).filter(Boolean))]
          });
        }

        // Load histories in background
        fetchStockData();
      } catch (err) {
        console.error("Fetch error:", err);
        showToast("Failed to load data", "error");
      }
    };
    loadAllData();
  }, []);

  const historyToDisplay = useMemo(() => {
    return activeTab === 'purchase' ? stockRows : rePurchaseRows;
  }, [activeTab, stockRows, rePurchaseRows]);

  const typeOptions = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    const filtered = historyToDisplay.filter(row => {
      const matchesSearch = !s || row.some(cell => cell && normalizeForMatch(cell).includes(s));
      const matchesDept = !filterDept || row[4] === filterDept;
      const matchesItem = !filterItem || row[5] === filterItem;
      return matchesSearch && matchesDept && matchesItem;
    });
    return [...new Set(filtered.map(row => row[3]).filter(Boolean))].sort();
  }, [historyToDisplay, searchTerm, filterDept, filterItem]);

  const itemOptions = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    const filtered = historyToDisplay.filter(row => {
      const matchesSearch = !s || row.some(cell => cell && normalizeForMatch(cell).includes(s));
      const matchesType = !filterType || row[3] === filterType;
      const matchesDept = !filterDept || row[4] === filterDept;
      return matchesSearch && matchesType && matchesDept;
    });
    return [...new Set(filtered.map(row => row[5]).filter(Boolean))].sort();
  }, [historyToDisplay, searchTerm, filterType, filterDept]);

  const filteredStockRows = useMemo(() => {
    const s = normalizeForMatch(searchTerm);
    return historyToDisplay.filter(row => {
      const matchesSearch = !s || 
        row.some(cell => cell && normalizeForMatch(cell).includes(s));
        
      const matchesType = !filterType || row[3] === filterType;
      const matchesDept = !filterDept || row[4] === filterDept;
      const matchesItem = !filterItem || row[5] === filterItem;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const rowDate = parseRowDate(row[0]);
        if (!rowDate || isNaN(rowDate)) return true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          if (rowDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end) matchesDate = false;
        }
      }
      
      return matchesSearch && matchesType && matchesDept && matchesItem && matchesDate;
    });
  }, [historyToDisplay, searchTerm, filterType, filterDept, filterItem, startDate, endDate]);

  const totalStockCost = useMemo(() => {
    return filteredStockRows.reduce((sum, row) => {
      const val = parseFloat(row[12] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredStockRows]);

  const isDuplicateItem = useMemo(() => {
    if (!form.itemsName.trim()) return false;
    const normalizedNew = normalizeForMatch(form.itemsName);
    return stockRows.some(row => normalizeForMatch(row[5]) === normalizedNew);
  }, [form.itemsName, stockRows]);

  useEffect(() => {
    if (form.inventoryType && masterData.length > 0) {
      // Matching Type from Col A (index 0) based on selection fetched from Col D (index 3)
      const matchingRows = masterData.filter(row => row[0] === form.inventoryType);
      const uniqueDepts = [...new Set(matchingRows.map(row => row[2]).filter(Boolean))];
      setFilteredDepartments(uniqueDepts);
    } else {
      setFilteredDepartments(dropdownOptions.departmentOptions);
    }
  }, [form.inventoryType, masterData, dropdownOptions.departmentOptions]);

  useEffect(() => {
    if (form.inventoryType && form.department && masterData.length > 0) {
      // Matching Type from Col A (index 0) and Dept from Col C (index 2)
      const matchingRows = masterData.filter(row =>
        row[0] === form.inventoryType && row[2] === form.department
      );
      const uniqueItems = [...new Set(matchingRows.map(row => row[1]).filter(Boolean))];
      setFilteredItems(uniqueItems);
    } else {
      setFilteredItems([]);
    }
  }, [form.inventoryType, form.department, masterData]);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

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

  // Synchronous price lookup for smoother UI
  useEffect(() => {
    if (form.itemsName && masterData.length > 0) {
      const normalizedItem = String(form.itemsName).trim().toLowerCase();
      const normalizedType = String(form.inventoryType || '').trim().toLowerCase();
      const normalizedDept = String(form.department || '').trim().toLowerCase();

      const match = masterData.find(row => 
        String(row[1] || '').trim().toLowerCase() === normalizedItem &&
        String(row[0] || '').trim().toLowerCase() === normalizedType &&
        String(row[2] || '').trim().toLowerCase() === normalizedDept
      ) || masterData.find(row => 
        String(row[1] || '').trim().toLowerCase() === normalizedItem
      );

      if (match) {
        setForm(prev => ({ 
          ...prev, 
          rentalPrice: (match[5] !== undefined && match[5] !== null && match[5] !== "") ? String(match[5]) : prev.rentalPrice,
          perUnit: (match[6] !== undefined && match[6] !== null && match[6] !== "") ? String(match[6]) : prev.perUnit 
        }));
      }
    }
  }, [form.itemsName, form.inventoryType, form.department, masterData]);

  useEffect(() => {
    if (purchaseForm.itemsName && masterData.length > 0) {
      const normalizedItem = String(purchaseForm.itemsName).trim().toLowerCase();
      const normalizedType = String(purchaseForm.inventoryType || '').trim().toLowerCase();
      const normalizedDept = String(purchaseForm.department || '').trim().toLowerCase();

      const match = masterData.find(row => 
        String(row[1] || '').trim().toLowerCase() === normalizedItem &&
        String(row[0] || '').trim().toLowerCase() === normalizedType &&
        String(row[2] || '').trim().toLowerCase() === normalizedDept
      ) || masterData.find(row => 
        String(row[1] || '').trim().toLowerCase() === normalizedItem
      );

      if (match) {
        setPurchaseForm(prev => ({ 
          ...prev, 
          perUnit: (match[6] !== undefined && match[6] !== null && match[6] !== "") ? String(match[6]) : prev.perUnit 
        }));
      }
    }
  }, [purchaseForm.itemsName, purchaseForm.inventoryType, purchaseForm.department, masterData]);

  const handleAddItem = async (customValue) => {
    const valueToAdd = customValue?.trim();
    if (!valueToAdd || !form.department || !form.inventoryType) return;

    setIsAddingItem(true);
    try {
      const rowData = [form.inventoryType, valueToAdd, form.department, "", form.unit, form.rentalPrice || "0", form.perUnit || "0", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addToMaster',
          sheet: 'Master-Dropdown',
          sheetName: 'Master-Dropdown',
          spreadsheetId: spreadsheetId,
          rowData: JSON.stringify(rowData)
        })
      });
      const result = await response.json();
      if (result.success) {
        setMasterData(prev => [...prev, rowData]);
        setForm(prev => ({ ...prev, itemsName: valueToAdd }));
        setShowItemDropdown(false);
        showToast('New item added to master list');
      }
    } catch {
      showToast('Failed to add item', 'error');
    } finally {
      setIsAddingItem(false);
    }
  };

  const updateMasterPrice = async (itemName, damagePrice, rentalPrice) => {
    try {
      const masterRow = masterData.find(row => row[1] === itemName);
      if (!masterRow) return;

      const updatedRow = [...masterRow];
      updatedRow[5] = rentalPrice || masterRow[5] || "0";
      updatedRow[6] = damagePrice || masterRow[6] || "0";
      
      // Ensure row has 22 elements and index 21 is empty
      while (updatedRow.length < 22) updatedRow.push("");
      updatedRow[21] = "";

      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'update',
          sheetName: 'Master-Dropdown',
          spreadsheetId: spreadsheetId,
          rowData: JSON.stringify(updatedRow)
        })
      });
    } catch (err) {
      console.error('Master price sync failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const [imageUrl, invResult] = await Promise.all([
        selectedImage ? uploadToDrive(selectedImage) : Promise.resolve('No Image'),
        fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'generateInventoryNo',
            inventoryType: form.inventoryType,
            spreadsheetId: spreadsheetId
          })
        }).then(res => res.json())
      ]);

      const inventoryNo = invResult.success ? invResult.invNo : `INV-${Date.now()}`;
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const finalRowData = [
        timestamp, '', inventoryNo, cleanText(form.inventoryType), cleanText(form.department), cleanText(form.itemsName),
        cleanText(form.vendorName), form.openingBalance || 0, cleanText(form.unit), form.perUnit || 0, imageUrl, cleanText(form.remarks),
        (Number(form.openingBalance || 0) * Number(form.perUnit || 0)).toFixed(2),
        '', '', '', '', '', '', '', '', ''
      ];

      const saveRes = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheet: 'Add-Stock',
          sheetName: 'Add-Stock',
          spreadsheetId: spreadsheetId,
          rowData: JSON.stringify(finalRowData)
        })
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) throw new Error(saveResult.error);

      // Sync prices to Master-Dropdown
      await updateMasterPrice(form.itemsName, form.perUnit, form.rentalPrice);

      showToast('Stock registered successfully');
      setForm({ inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsModalOpen(false);
      fetchStockData();
    } catch {
      showToast('Failed to save record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalImageUrl = selectedImage ? await uploadToDrive(selectedImage) : (purchaseForm.imageUrl || 'No Image');
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const finalRowData = [
        timestamp, '', purchaseForm.inventoryNo, cleanText(purchaseForm.inventoryType), cleanText(purchaseForm.department), cleanText(purchaseForm.itemsName),
        cleanText(purchaseForm.vendorName), purchaseForm.openingBalance || 0, cleanText(purchaseForm.unit), purchaseForm.perUnit || 0, finalImageUrl, cleanText(purchaseForm.remarks),
        (Number(purchaseForm.openingBalance || 0) * Number(purchaseForm.perUnit || 0)).toFixed(2),
        '', '', '', '', '', '', '', '', ''
      ];

      const saveRes = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheet: 'Re-Purchase',
          sheetName: 'Re-Purchase',
          spreadsheetId: spreadsheetId,
          rowData: JSON.stringify(finalRowData)
        })
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) throw new Error(saveResult.error);

      // Sync prices to Master-Dropdown
      await updateMasterPrice(purchaseForm.itemsName, purchaseForm.perUnit);

      showToast('Re-Purchase recorded successfully');
      setPurchaseForm({ inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '', inventoryNo: '', imageUrl: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsPurchaseModalOpen(false);
      fetchStockData();
    } catch {
      showToast('Failed to record purchase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-42px)] bg-[#f0f2f8] font-sans flex flex-col overflow-hidden">

        {/* Toast */}
        {toast.show && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-3xl shadow-2xl transition-all duration-300 transform animate-in slide-in-from-right-8 z-[100] ${toast.type === "success"
            ? "bg-violet-600 text-white shadow-violet-200"
            : "bg-red-600 text-white shadow-red-200"
            }`}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
            </div>
          </div>
        )}

        {/* ── Page-level top bar ── */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Stock Management</h1>
          </div>

          <div className="flex items-center gap-4">
            {selectedSerials.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isSubmitting}
                className="h-10 px-6 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg animate-in fade-in zoom-in-95 bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100/50 active:scale-95 disabled:opacity-55"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete ({selectedSerials.size})
              </button>
            )}
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
            <div 
              onClick={() => setShowFullTotal(!showFullTotal)}
              className="flex items-center h-10 px-4 bg-emerald-600 text-white rounded-lg shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 cursor-pointer hover:bg-emerald-700 transition-all select-none"
              title={showFullTotal ? "Click to see short format" : "Click to see exact amount"}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mr-3">{activeTab === 'purchase' ? 'Purchase Total:' : 'Re-Purchase Total:'}</span>
              <span className="text-sm font-bold text-white">
                ₹{showFullTotal 
                   ? totalStockCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                   : formatIndianAmount(totalStockCost)
                 }
              </span>
            </div>
            <button
              onClick={() => { setIsModalOpen(true); setImagePreview(null); setSelectedImage(null); }}
              className="h-10 px-5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-violet-100"
            >
              <PlusCircle className="h-4 w-4" />
              Add Stock
            </button>
            <button
              onClick={() => { setIsPurchaseModalOpen(true); setImagePreview(null); setSelectedImage(null); }}
              className="h-10 px-5 bg-white border border-violet-200 text-violet-600 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-violet-50 transition-all active:scale-95 shadow-sm"
            >
              <ShoppingCart className="h-4 w-4 text-violet-400" />
              Re-Purchase
            </button>
          </div>
        </div>

        {/* ── White card wrapping title + filters + table ── */}
        <div className="mx-6 mb-6 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0 overflow-visible relative">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/50 rounded-t-xl">
            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl shadow-inner-sm">
              <button 
                onClick={() => setActiveTab('purchase')} 
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'purchase' ? 'bg-white text-violet-600 shadow-xl shadow-violet-100/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Purchase History
              </button>
              <button 
                onClick={() => setActiveTab('repurchase')} 
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'repurchase' ? 'bg-white text-violet-600 shadow-xl shadow-violet-100/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Re-Purchase History
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white w-48 transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-8 pl-2 pr-8 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 appearance-none cursor-pointer hover:border-violet-300 transition-all min-w-[80px]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                  >
                    <option value="">All Types</option>
                    {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>


                  <select
                    value={filterItem}
                    onChange={(e) => setFilterItem(e.target.value)}
                    className="h-8 pl-2 pr-8 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 appearance-none cursor-pointer hover:border-violet-300 transition-all min-w-[90px]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                  >
                    <option value="">All Items</option>
                    {itemOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>

                  <div className="relative border-l border-slate-200 ml-1 pl-1">
                    <button
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className={`h-8 px-3 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-all ${isDateMenuOpen || startDate || endDate ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}
                    >
                      <Calendar className={`h-3 w-3 ${isDateMenuOpen || startDate || endDate ? 'text-white' : 'text-slate-400'}`} />
                      <span>{startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'DATE'}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDateMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-[90]" 
                          onClick={() => setIsDateMenuOpen(false)}
                        />
                        <div className="absolute top-10 right-0 z-[100] w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Date Range</p>
                            {(startDate || endDate) && (
                              <button 
                                onClick={() => { setStartDate(""); setEndDate(""); }}
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
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
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
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
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

                  {(startDate || endDate || filterType || filterDept || filterItem) && (
                    <button
                      onClick={() => {
                        setFilterType(""); setFilterDept(""); setFilterItem(""); setStartDate(""); setEndDate("");
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
                <button
                  onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                  className={`h-8 px-3 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-all ${isColMenuOpen ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-slate-50 text-slate-600 hover:bg-white'}`}
                >
                  <Settings2 className={`h-3 w-3 ${isColMenuOpen ? 'text-white' : 'text-slate-400'}`} />
                  <span>COLUMNS</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isColMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isColMenuOpen && (
                  <div className="absolute top-12 right-0 z-[100] w-52 bg-white border border-slate-100 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</p>
                      <button onClick={() => setIsColMenuOpen(false)} className="text-slate-300 hover:text-slate-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-violet-100">
                      {columnConfig.map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold ${visibleColumns[col.key] ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <span>{col.label}</span>
                          {visibleColumns[col.key] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-center border-collapse border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="bg-violet-50 border-none shadow-sm">
                  <th className="px-4 py-4 w-12 text-center bg-violet-50">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      checked={filteredStockRows.length > 0 && selectedSerials.size === filteredStockRows.length}
                      onChange={() => handleSelectAll(filteredStockRows)}
                    />
                  </th>
                  {columnConfig.map(col => visibleColumns[col.key] && (
                    <th key={col.key} className="px-6 py-4 text-[10px] font-bold text-violet-600 whitespace-nowrap uppercase tracking-[0.15em] text-center bg-violet-50">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isTableLoading ? (
                  <tr>
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length + 1} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length + 1} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 text-slate-200" />
                        <p className="text-sm font-semibold text-slate-400">No records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStockRows.map((row, idx) => {
                    const sn = row[1];
                    const isSelected = selectedSerials.has(sn);
                    const currentData = editDataMap[sn] || row;

                    return (
                      <tr key={idx} className={`transition-colors duration-100 border-b border-slate-50 last:border-0 ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/70'}`}>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row)}
                          />
                        </td>
                        {columnConfig.map(col => visibleColumns[col.key] && (
                          <td key={col.key} className="px-4 py-3 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-center">
                            {col.key === 'balance' && isSelected ? (
                              <input 
                                type="number"
                                value={currentData[7]}
                                onChange={(e) => handleInlineEdit(sn, 7, e.target.value)}
                                className="w-20 px-2 py-1 bg-white border border-violet-200 rounded text-center text-xs font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                              />
                            ) : col.key === 'costPrice' ? (
                              <span className={`font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-700'}`}>
                                ₹{parseFloat(currentData[12] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : col.key === 'date' ? (
                              <span className="text-slate-500 font-medium">{formatDate(currentData[0])}</span>
                            ) : col.key === 'image' ? (
                              currentData[col.index] ? (
                                <div className="flex justify-center">
                                  <a href={currentData[col.index]} target="_blank" rel="noopener noreferrer" className="group relative">
                                    <img
                                      src={getDisplayableImageUrl(currentData[col.index])}
                                      alt="Preview"
                                      className="h-10 w-10 min-w-[40px] rounded-lg object-cover border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-200"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/40x40?text=IMG';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                      <ArrowUpRight className="h-3 w-3 text-white" />
                                    </div>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[10px]">No Image</span>
                              )
                            ) : col.key === 'item' ? (
                              <span className="font-bold text-slate-800">{currentData[col.index]}</span>
                            ) : col.key === 'perUnit' ? (
                              <span className="font-bold text-blue-600 whitespace-nowrap">₹{parseFloat(currentData[col.index] || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-600">{currentData[col.index]}</span>
                            )}
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

        {/* RE-PURCHASE MODAL */}
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-[2px]">
            <div
              className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200"
              onClick={() => !isSubmitting && setIsPurchaseModalOpen(false)}
            />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
              <div className="px-7 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Re-Purchase Item</h3>
                <button
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handlePurchaseSubmit} className="px-7 py-5 space-y-5 max-h-[72vh] overflow-y-auto pb-12 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type</label>
                    <div className="relative">
                      <select
                        value={purchaseForm.inventoryType}
                        onChange={(e) => {
                          setPurchaseForm({ ...purchaseForm, inventoryType: e.target.value, itemsName: '', inventoryNo: '' });
                          if (e.target.value) setShowPurchaseItemDropdown(true);
                        }}
                        required
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 appearance-none bg-white font-sans"
                      >
                        <option value="">Select type...</option>
                        {[...new Set(stockRows.map(row => row[3]).filter(Boolean))].sort().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={purchaseForm.itemsName}
                      onChange={(e) => {
                        setPurchaseForm(prev => ({ ...prev, itemsName: e.target.value }));
                        setShowPurchaseItemDropdown(true);
                      }}
                      onFocus={() => setShowPurchaseItemDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPurchaseItemDropdown(false), 200)}
                      required
                      placeholder={purchaseForm.inventoryType ? "Search items..." : "Select type first..."}
                      disabled={!purchaseForm.inventoryType}
                      className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 font-sans"
                    />
                    {showPurchaseItemDropdown && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto ring-1 ring-slate-900/5">
                        {stockRows
                          .filter(item => {
                            const rowType = String(item[3] || '').trim().toLowerCase();
                            const selectedType = String(purchaseForm.inventoryType || '').trim().toLowerCase();
                            const rowName = String(item[5] || '').toLowerCase();
                            const searchName = (purchaseForm.itemsName || '').toLowerCase();
                            return rowType === selectedType && rowName.includes(searchName);
                          })
                          .filter((item, index, self) => 
                            index === self.findIndex((t) => (t[2] === item[2] && t[5] === item[5]))
                          )
                          .map(item => (
                            <button
                              key={item[2] + item[5]}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const masterRow = masterData.find(row => 
                                  String(row[1] || '').trim().toLowerCase() === String(item[5]).trim().toLowerCase() &&
                                  String(row[0] || '').trim().toLowerCase() === String(item[3] || '').trim().toLowerCase() &&
                                  String(row[2] || '').trim().toLowerCase() === String(item[4] || '').trim().toLowerCase()
                                ) || masterData.find(row => 
                                  String(row[1] || '').trim().toLowerCase() === String(item[5]).trim().toLowerCase()
                                );
                                setPurchaseForm({
                                  ...purchaseForm,
                                  inventoryNo: item[2],
                                  department: item[4],
                                  itemsName: item[5],
                                  unit: item[8],
                                  perUnit: (masterRow && masterRow[6] !== undefined && masterRow[6] !== null && masterRow[6] !== "") ? String(masterRow[6]) : item[9],
                                  vendorName: item[6],
                                  imageUrl: item[10],
                                  openingBalance: '',
                                  remarks: ''
                                });
                                setImagePreview(getDisplayableImageUrl(item[10]));
                                setShowPurchaseItemDropdown(false);
                              }}
                              className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-sm font-semibold text-slate-700">{item[5]}</span>
                                <span className="text-[10px] font-bold text-slate-400 font-mono">{item[2]}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                <span>{item[4]}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                                <span>{item[8]}</span>
                              </div>
                            </button>
                          ))}
                        {stockRows.filter(item => String(item[3] || '').trim().toLowerCase() === String(purchaseForm.inventoryType || '').trim().toLowerCase()).length === 0 && (
                          <div className="px-5 py-4 text-xs text-slate-400 text-center italic bg-slate-50">No items found for this type</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

                <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                  {purchaseForm.inventoryNo && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.department}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory No</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.inventoryNo}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Type</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.unit}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Vendor</span>
                          <span className="text-sm font-semibold text-slate-700">{purchaseForm.vendorName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor Name</label>
                      <input
                        type="text"
                        value={purchaseForm.vendorName}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, vendorName: e.target.value }))}
                        required
                        placeholder="Update vendor..."
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-600 uppercase tracking-wide">Opening Bal</label>
                      <input
                        type="number"
                        onWheel={(e) => e.target.blur()} 
                        value={purchaseForm.openingBalance}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                        required
                        placeholder="Qty..."
                        className="w-full h-11 px-4 rounded-lg border border-violet-100 focus:border-violet-500 outline-none text-sm font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price (₹)</label>
                      <input
                        type="number"
                        onWheel={(e) => e.target.blur()} 
                        step="0.01"
                        value={purchaseForm.perUnit}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, perUnit: e.target.value }))}
                        required
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                      <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700">
                        ₹{(Number(purchaseForm.openingBalance || 0) * Number(purchaseForm.perUnit || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item-Image</label>
                      <div className="h-11">
                        <input type="file" id="purchase-upload" onChange={handleImageChange} className="hidden" accept="image/*" />
                        <label htmlFor="purchase-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer overflow-hidden bg-white">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <UploadCloud className="h-4 w-4 text-slate-300 shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 truncate">
                              {selectedImage ? "New File Selected" : (purchaseForm.imageUrl && purchaseForm.imageUrl !== 'No Image' ? "Keep Original" : "Attach Image")}
                            </span>
                          </div>
                          <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm animate-in zoom-in-95 duration-300">
                      <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 h-48">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 right-2">
                          <button 
                            type="button"
                            onClick={() => { setImagePreview(null); setSelectedImage(null); if (!selectedImage) setPurchaseForm(p => ({...p, imageUrl: 'No Image'})); }}
                            className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks</label>
                    <textarea
                      value={purchaseForm.remarks}
                      onChange={(e) => setPurchaseForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add purchase notes..."
                      rows="2"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 resize-none font-sans"
                    />
                  </div>
                </div>
              </form>

              <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all font-sans">Cancel</button>
                <button onClick={handlePurchaseSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 font-sans">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Processing..." : "Confirm Purchase"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD STOCK MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-[2px]">
            <div className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
              <div className="px-7 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Add Stock Item</h3>
                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all font-sans"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar font-sans">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inventory Type</label>
                  <div className="relative">
                    <select name="inventoryType" value={form.inventoryType} onChange={handleChange} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 appearance-none bg-white">
                      <option value="">Select inventory type</option>
                      {dropdownOptions.inventoryTypeOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                    <div className="relative">
                      <input type="text" placeholder="Enter department..." value={form.department} onChange={(e) => { setForm(prev => ({ ...prev, department: e.target.value })); setShowDeptDropdown(true); }} onFocus={() => setShowDeptDropdown(true)} onBlur={() => setTimeout(() => setShowDeptDropdown(false), 200)} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700" />
                      {showDeptDropdown && filteredDepartments.length > 0 && (
                        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 ring-1 ring-slate-900/5">
                          {filteredDepartments.filter(d => d.toLowerCase().includes(form.department.toLowerCase())).map(dept => (
                            <button key={dept} type="button" onMouseDown={() => { setForm(prev => ({ ...prev, department: dept })); setShowDeptDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">{dept}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
                    <div className="relative">
                      <input type="text" placeholder={form.department ? "Type item name..." : "Select department first"} value={form.itemsName} onChange={(e) => { setForm(prev => ({ ...prev, itemsName: e.target.value })); setShowItemDropdown(true); }} onFocus={() => setShowItemDropdown(true)} onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)} disabled={!form.department} required className={`w-full h-11 px-4 rounded-lg border ${isDuplicateItem ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} focus:border-violet-500 outline-none text-sm font-medium text-slate-700 disabled:bg-slate-50 transition-colors`} />
                      {isDuplicateItem && (
                        <div className="mt-1.5 flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          <XCircle className="h-3 w-3 text-red-500" />
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Item already in stock. Use Re-purchase form instead.</p>
                        </div>
                      )}
                      {showItemDropdown && (
                        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 ring-1 ring-slate-900/5">
                          {filteredItems.filter(i => i.toLowerCase().includes(form.itemsName.toLowerCase())).map(item => (
                            <button key={item} type="button" onMouseDown={() => { 
                              const normalizedItem = String(item).trim().toLowerCase();
                              const normalizedType = String(form.inventoryType || '').trim().toLowerCase();
                              const normalizedDept = String(form.department || '').trim().toLowerCase();

                              const masterRow = masterData.find(row => 
                                String(row[1] || '').trim().toLowerCase() === normalizedItem &&
                                String(row[0] || '').trim().toLowerCase() === normalizedType &&
                                String(row[2] || '').trim().toLowerCase() === normalizedDept
                              ) || masterData.find(row => 
                                String(row[1] || '').trim().toLowerCase() === normalizedItem
                              );

                              setForm(prev => ({ 
                                ...prev, 
                                itemsName: item,
                                rentalPrice: (masterRow && masterRow[5] !== undefined && masterRow[5] !== null && masterRow[5] !== "") ? String(masterRow[5]) : prev.rentalPrice,
                                perUnit: (masterRow && masterRow[6] !== undefined && masterRow[6] !== null && masterRow[6] !== "") ? String(masterRow[6]) : prev.perUnit
                              })); 
                              setShowItemDropdown(false); 
                            }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">{item}</button>
                          ))}
                          {form.itemsName && !filteredItems.includes(form.itemsName) && (
                            <button type="button" onMouseDown={() => handleAddItem(form.itemsName)} disabled={isAddingItem} className="w-full mt-1.5 p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs font-bold font-sans"><span>Register "{form.itemsName}"</span><PlusCircle className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor Name</label>
                    <input type="text" name="vendorName" value={form.vendorName} onChange={handleChange} required placeholder="Enter vendor name" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
                    <div className="relative">
                      <select name="unit" value={form.unit} onChange={handleChange} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 appearance-none bg-white">
                        <option value="">Select unit</option>
                        {dropdownOptions.unitOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Opening Balance</label>
                    <input type="number" onWheel={(e) => e.target.blur()} name="openingBalance" value={form.openingBalance} onChange={handleChange} required placeholder="e.g. 100" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price (₹)</label>
                    <input type="number" step="0.01" onWheel={(e) => e.target.blur()} name="perUnit" value={form.perUnit} onChange={handleChange} required placeholder="e.g. 25" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                    <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700">₹{(Number(form.openingBalance || 0) * Number(form.perUnit || 0)).toFixed(2)}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Rental Price (₹)</label>
                    <input type="number" step="0.01" onWheel={(e) => e.target.blur()} name="rentalPrice" value={form.rentalPrice} onChange={handleChange} required placeholder="Enter rental price" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Attachment (Image)</label>
                  <div className="h-11">
                    <input type="file" id="modal-upload" onChange={handleImageChange} className="hidden" accept="image/*" />
                    <label htmlFor="modal-upload" className="flex items-center justify-between px-3 h-full rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer bg-white">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <UploadCloud className="h-4 w-4 text-slate-300 shrink-0" />
                        <span className="text-xs font-semibold text-slate-500 truncate">{selectedImage ? "New File Selected" : "Click to upload image"}</span>
                      </div>
                      <div className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Browse</div>
                    </label>
                  </div>
                </div>
                {imagePreview && (
                  <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 h-48">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      <div className="absolute top-2 right-2"><button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"><X className="h-3.5 w-3.5" /></button></div>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (Optional)</label>
                  <textarea name="remarks" value={form.remarks} onChange={handleChange} placeholder="Add any notes..." rows="2" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 resize-none font-sans" />
                </div>
              </form>
              <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all font-sans">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 font-sans font-sans">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Add Stock"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </AdminLayout>
  );
}