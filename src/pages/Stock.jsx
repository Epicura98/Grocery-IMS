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
import { formatDate, compressImage, parseRowDate } from "../utils/helpers";

export default function Stock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  // Data State
  const [masterData, setMasterData] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: []
  });

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
    remarks: ''
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
    } catch (e) { return url; }
  }

  const fetchStockData = async () => {
    setIsTableLoading(true);
    try {
      const response = await fetch(`${scriptUrl}?action=fetch&sheet=Add-Stock&sheetName=Add-Stock&spreadsheetId=${spreadsheetId}`);
      const result = await response.json();
      if (result.success && result.data) {
        const validRows = result.data.slice(1).filter(row => row[5] && row[5].toString().trim() !== "");
        setStockRows(validRows.reverse());
      }
    } catch (err) {
      console.error('Fetch stock error:', err);
      showToast('Failed to load stock data', 'error');
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setIsTableLoading(true);
      try {
        const [dropdownRes, stockRes] = await Promise.all([
          fetch(`${scriptUrl}?action=fetch&sheet=Master-Dropdown&spreadsheetId=${spreadsheetId}`).then(r => r.json()),
          fetch(`${scriptUrl}?action=fetch&sheet=Add-Stock&sheetName=Add-Stock&spreadsheetId=${spreadsheetId}`).then(r => r.json())
        ]);

        if (dropdownRes.success && dropdownRes.data) {
          const rows = dropdownRes.data.slice(1);
          setMasterData(rows);
          setDropdownOptions({
            inventoryTypeOptions: [...new Set(rows.map(row => row[0]).filter(Boolean))],
            departmentOptions: [...new Set(rows.map(row => row[1]).filter(Boolean))],
            unitOptions: [...new Set(rows.map(row => row[4]).filter(Boolean))]
          });
        }

        if (stockRes.success && stockRes.data) {
          const validRows = stockRes.data.slice(1).filter(row => row[5] && row[5].toString().trim() !== "");
          setStockRows(validRows.reverse());
        }
      } catch (err) {
        console.error("Fetch error:", err);
        showToast("Failed to load data", "error");
      } finally {
        setIsLoading(false);
        setIsTableLoading(false);
      }
    };
    loadAllData();
  }, []);

  const typeOptions = useMemo(() => {
    const filtered = stockRows.filter(row => {
      const matchesSearch = !searchTerm.trim() || row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept = !filterDept || row[4] === filterDept;
      const matchesItem = !filterItem || row[5] === filterItem;
      return matchesSearch && matchesDept && matchesItem;
    });
    return [...new Set(filtered.map(row => row[3]).filter(Boolean))].sort();
  }, [stockRows, searchTerm, filterDept, filterItem]);

  const deptOptions = useMemo(() => {
    const filtered = stockRows.filter(row => {
      const matchesSearch = !searchTerm.trim() || row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = !filterType || row[3] === filterType;
      const matchesItem = !filterItem || row[5] === filterItem;
      return matchesSearch && matchesType && matchesItem;
    });
    return [...new Set(filtered.map(row => row[4]).filter(Boolean))].sort();
  }, [stockRows, searchTerm, filterType, filterItem]);

  const itemOptions = useMemo(() => {
    const filtered = stockRows.filter(row => {
      const matchesSearch = !searchTerm.trim() || row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = !filterType || row[3] === filterType;
      const matchesDept = !filterDept || row[4] === filterDept;
      return matchesSearch && matchesType && matchesDept;
    });
    return [...new Set(filtered.map(row => row[5]).filter(Boolean))].sort();
  }, [stockRows, searchTerm, filterType, filterDept]);

  const filteredStockRows = useMemo(() => {
    return stockRows.filter(row => {
      const matchesSearch = !searchTerm.trim() || 
        row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()));
        
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
  }, [stockRows, searchTerm, filterType, filterDept, filterItem, startDate, endDate]);

  const totalStockCost = useMemo(() => {
    return filteredStockRows.reduce((sum, row) => {
      const val = parseFloat(row[12] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredStockRows]);

  useEffect(() => {
    if (form.inventoryType && masterData.length > 0) {
      const matchingRows = masterData.filter(row => row[0] === form.inventoryType);
      const uniqueDepts = [...new Set(matchingRows.map(row => row[1]).filter(Boolean))];
      setFilteredDepartments(uniqueDepts);
    } else {
      setFilteredDepartments(dropdownOptions.departmentOptions);
    }
  }, [form.inventoryType, masterData, dropdownOptions.departmentOptions]);

  useEffect(() => {
    if (form.inventoryType && form.department && masterData.length > 0) {
      const matchingRows = masterData.filter(row =>
        row[0] === form.inventoryType && row[1] === form.department
      );
      const uniqueItems = [...new Set(matchingRows.map(row => row[2]).filter(Boolean))];
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

  const handleAddItem = async (customValue) => {
    const valueToAdd = customValue?.trim();
    if (!valueToAdd || !form.department || !form.inventoryType) return;

    setIsAddingItem(true);
    try {
      const rowData = [form.inventoryType, form.department, valueToAdd, "", form.unit];
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
    } catch (err) {
      showToast('Failed to add item', 'error');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);
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
        timestamp, '', inventoryNo, form.inventoryType, form.department, form.itemsName,
        form.vendorName, form.openingBalance || 0, form.unit, form.perUnit || 0, imageUrl, form.remarks,
        (Number(form.openingBalance || 0) * Number(form.perUnit || 0)).toFixed(2)
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

      showToast('Stock registered successfully');
      setForm({ inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsModalOpen(false);
      fetchStockData();
    } catch (err) {
      setError(err.message);
      showToast('Failed to save record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const finalImageUrl = selectedImage ? await uploadToDrive(selectedImage) : (purchaseForm.imageUrl || 'No Image');
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const finalRowData = [
        timestamp, '', purchaseForm.inventoryNo, purchaseForm.inventoryType, purchaseForm.department, purchaseForm.itemsName,
        purchaseForm.vendorName, purchaseForm.openingBalance || 0, purchaseForm.unit, purchaseForm.perUnit || 0, finalImageUrl, purchaseForm.remarks,
        (Number(purchaseForm.openingBalance || 0) * Number(purchaseForm.perUnit || 0)).toFixed(2)
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

      showToast('Re-Purchase recorded successfully');
      setPurchaseForm({ inventoryType: '', department: '', itemsName: '', vendorName: '', openingBalance: '', perUnit: '', unit: '', remarks: '', inventoryNo: '', imageUrl: '' });
      setImagePreview(null);
      setSelectedImage(null);
      setIsPurchaseModalOpen(false);
      fetchStockData();
    } catch (err) {
      setError(err.message);
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
            <div className="flex items-center h-10 px-4 bg-emerald-600 text-white rounded-lg shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mr-3">Overall Sum:</span>
              <span className="text-sm font-bold text-white">₹{totalStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Stock History</h2>

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
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={columnConfig.filter(c => visibleColumns[c.key]).length} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 text-slate-200" />
                        <p className="text-sm font-semibold text-slate-400">No records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStockRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors duration-100 border-b border-slate-50 last:border-0">
                      {columnConfig.map(col => visibleColumns[col.key] && (
                        <td key={col.key} className="px-4 py-3 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-center">
                          {col.key === 'date' ? (
                            <span className="text-slate-500 font-medium">{formatDate(row[0])}</span>
                          ) : col.key === 'image' ? (
                            row[col.index] ? (
                              <div className="flex justify-center">
                                <a href={row[col.index]} target="_blank" rel="noopener noreferrer" className="group relative">
                                  <img
                                    src={getDisplayableImageUrl(row[col.index])}
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
                          ) : col.key === 'serial' ? (
                            <span className="text-slate-500 font-medium">{row[col.index]}</span>
                          ) : col.key === 'perUnit' ? (
                            <span className="font-bold text-blue-600 whitespace-nowrap">₹{parseFloat(row[col.index] || 0).toFixed(2)}</span>
                          ) : col.key === 'costPrice' ? (
                            <span className="font-bold text-emerald-600 whitespace-nowrap">₹{parseFloat(row[col.index] || 0).toFixed(2)}</span>
                          ) : col.key === 'item' ? (
                            <span className="font-bold text-slate-800">{row[col.index]}</span>
                          ) : (
                            <span className="text-slate-600">{row[col.index]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
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
                      {dropdownOptions.inventoryTypeOptions.map(opt => (
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
                                setPurchaseForm({
                                  ...purchaseForm,
                                  inventoryNo: item[2],
                                  department: item[4],
                                  itemsName: item[5],
                                  unit: item[8],
                                  perUnit: item[9],
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

                  <div className="grid grid-cols-3 gap-4">
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
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Per Unit Price</label>
                      <input
                        type="number"
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
                      <label className="text-xs font-bold text-violet-600 uppercase tracking-wide">Opening Balance</label>
                      <input
                        type="number"
                        value={purchaseForm.openingBalance}
                        onChange={(e) => setPurchaseForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                        required
                        placeholder="Enter quantity..."
                        className="w-full h-11 px-4 rounded-lg border border-violet-100 focus:border-violet-500 outline-none text-sm font-bold text-slate-700"
                      />
                    </div>
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
                      <input type="text" placeholder={form.department ? "Type item name..." : "Select department first"} value={form.itemsName} onChange={(e) => { setForm(prev => ({ ...prev, itemsName: e.target.value })); setShowItemDropdown(true); }} onFocus={() => setShowItemDropdown(true)} onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)} disabled={!form.department} required className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 disabled:bg-slate-50" />
                      {showItemDropdown && (
                        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 ring-1 ring-slate-900/5">
                          {filteredItems.filter(i => i.toLowerCase().includes(form.itemsName.toLowerCase())).map(item => (
                            <button key={item} type="button" onMouseDown={() => { setForm(prev => ({ ...prev, itemsName: item })); setShowItemDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">{item}</button>
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Opening Balance</label>
                    <input type="number" name="openingBalance" value={form.openingBalance} onChange={handleChange} required placeholder="e.g. 100" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Price Per Unit</label>
                    <input type="number" name="perUnit" value={form.perUnit} onChange={handleChange} required placeholder="e.g. 25" className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-violet-500 outline-none text-sm font-medium text-slate-700 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Cost</label>
                    <div className="w-full h-11 px-4 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center text-sm font-bold text-emerald-700">₹{(Number(form.openingBalance || 0) * Number(form.perUnit || 0)).toFixed(2)}</div>
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