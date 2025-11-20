"use client";
import { useState, useEffect } from "react";
import { FileImage, Calendar, Plus, ShoppingCart, Edit, Search } from "lucide-react";

export default function InventoryForm() {
  const [activeTab, setActiveTab] = useState('addStock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: []
  });
  
  const [masterData, setMasterData] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  const [departmentInputValue, setDepartmentInputValue] = useState('');
  const [itemInputValue, setItemInputValue] = useState('');
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Form data for Add Stock
  const [addStockForm, setAddStockForm] = useState({
    inventoryType: '',
    department: '',
    itemsName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: ''
  });

  // Form data for Purchase
  const [purchaseForm, setPurchaseForm] = useState({
    inventoryType: '',
    inventoryNo: '',
    department: '',
    itemsName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    remarks: '',
    uploadFile: ''
  });

  // Form data for Issue
  const [issueForm, setIssueForm] = useState({
    inventoryType: '',
    inventoryNo: '',
    department: '',
    itemsName: '',
    openingBalance: '',
    perUnit: '',
    unit: '',
    foodName: '',
    eventDate: '',
    partyName: '',
    issueData: '',
    returnData: '',
    damageItems: '',
    missingItems: '',
    remarks: '',
    uploadFile: ''
  });

  const scriptUrl = "https://script.google.com/macros/s/AKfycbz_705CZWY7WafvEwM309BuWKOOYi24B9tlCuwUaLBvQSy9PzD7nkojRUcRajaBCchv/exec";
  const folderId = "113JJSny0edSxkwl9MpjTmNJo0uZuHqVn";

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  function getDisplayableImageUrl(url) {
    if (!url) return null;
    
    try {
      const directMatch = url.match(/file\/d\/([a-zA-Z0-9\-_]+)/);
      if (directMatch && directMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w200`;
      }
      
      const ucMatch = url.match(/[?&]id=([a-zA-Z0-9\-_]+)/);
      if (ucMatch && ucMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
      }
      
      const openMatch = url.match(/open\?id=([a-zA-Z0-9\-_]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w200`;
      }
      
      if (url.includes('thumbnail?id=')) {
        return url;
      }
      
      const anyIdMatch = url.match(/([a-zA-Z0-9\-_]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w200`;
      }
      
      const cacheBuster = Date.now();
      return url.includes('?') ? `${url}&cb=${cacheBuster}` : `${url}?cb=${cacheBuster}`;
    } catch (e) {
      console.error('Error processing image URL:', url, e);
      return url;
    }
  }

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const response = await fetch(`${scriptUrl}?action=fetch&sheet=Master Drop-Down`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 1) {
          const rows = result.data.slice(1);
          setMasterData(rows);
          
          const inventoryTypes = [...new Set(rows.map(row => row[0]).filter(Boolean))];
          const departments = [...new Set(rows.map(row => row[1]).filter(Boolean))];
          const units = [...new Set(rows.map(row => row[2]).filter(Boolean))];
          
          setDropdownOptions({
            inventoryTypeOptions: inventoryTypes,
            departmentOptions: departments,
            unitOptions: units
          });
        }

        const inventoryResponse = await fetch(`${scriptUrl}?action=fetch&sheet=INVENTORY`);
        const inventoryResult = await inventoryResponse.json();

        if (inventoryResult.success && inventoryResult.data) {
          const items = inventoryResult.data.slice(1).map(row => ({
            inventoryNo: row[2],
            inventoryType: row[3],
            department: row[4],
            itemsName: row[5],
            openingBalance: row[7],
            perUnit: row[17],
            unit: row[16],
            eventDate: row[19],
            uploadFile: row[15],
            remarks: row[20]
          }));
          setInventoryItems(items);
        }

      } catch (error) {
        console.error('Error fetching dropdown options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    if (addStockForm.inventoryType && masterData.length > 0) {
      const matchingRows = masterData.filter(row => {
        const columnD = row[3];
        return columnD === addStockForm.inventoryType;
      });
      
      const departments = [...new Set(matchingRows.map(row => row[1]).filter(Boolean))];
      setFilteredDepartments(departments);
      
      if (addStockForm.department && !departments.includes(addStockForm.department)) {
        setAddStockForm(prev => ({ ...prev, department: '', itemsName: '' }));
        setDepartmentInputValue('');
      }
    } else {
      setFilteredDepartments(dropdownOptions.departmentOptions);
    }
  }, [addStockForm.inventoryType, masterData, dropdownOptions.departmentOptions]);

  useEffect(() => {
    if (addStockForm.department && masterData.length > 0) {
      const matchingRows = masterData.filter(row => {
        const columnB = row[1];
        return columnB === addStockForm.department;
      });
      
      const items = [...new Set(matchingRows.map(row => row[4]).filter(Boolean))];
      setFilteredItems(items);
      
      if (addStockForm.itemsName && !items.includes(addStockForm.itemsName)) {
        setAddStockForm(prev => ({ ...prev, itemsName: '' }));
        setItemInputValue('');
      }
    } else {
      setFilteredItems([]);
      if (addStockForm.itemsName) {
        setAddStockForm(prev => ({ ...prev, itemsName: '' }));
        setItemInputValue('');
      }
    }
  }, [addStockForm.department, masterData]);

  const handleAddStockChange = (e) => {
    const { name, value } = e.target;
    setAddStockForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDepartment = async (newDepartment) => {
    if (!newDepartment.trim()) return;
    
    setIsAddingDepartment(true);
    try {
      const rowData = [
        addStockForm.inventoryType,
        newDepartment.trim(),
        '',
        addStockForm.inventoryType,
        ''
      ];

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addToMaster',
          sheetName: 'Master Drop-Down',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (result.success) {
        const updatedMasterData = [...masterData, rowData];
        setMasterData(updatedMasterData);
        
        const matchingRows = updatedMasterData.filter(row => row[3] === addStockForm.inventoryType);
        const departments = [...new Set(matchingRows.map(row => row[1]).filter(Boolean))];
        setFilteredDepartments(departments);
        
        setAddStockForm(prev => ({ ...prev, department: newDepartment.trim() }));
        setDepartmentInputValue(newDepartment.trim());
        showToast(`Department "${newDepartment}" added successfully!`);
      } else {
        throw new Error(result.error || 'Failed to add department');
      }
    } catch (error) {
      console.error('Error adding department:', error);
      showToast('Failed to add department. Please try again.', 'error');
    } finally {
      setIsAddingDepartment(false);
      setShowAddDepartment(false);
    }
  };

  const handleAddItem = async (newItem) => {
    if (!newItem.trim() || !addStockForm.department) return;
    
    setIsAddingItem(true);
    try {
      const rowData = [
        addStockForm.inventoryType,
        addStockForm.department,
        '',
        addStockForm.inventoryType,
        newItem.trim()
      ];

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addToMaster',
          sheetName: 'Master Drop-Down',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (result.success) {
        const updatedMasterData = [...masterData, rowData];
        setMasterData(updatedMasterData);
        
        const matchingRows = updatedMasterData.filter(row => row[1] === addStockForm.department);
        const items = [...new Set(matchingRows.map(row => row[4]).filter(Boolean))];
        setFilteredItems(items);
        
        setAddStockForm(prev => ({ ...prev, itemsName: newItem.trim() }));
        setItemInputValue(newItem.trim());
        showToast(`Item "${newItem}" added successfully!`);
      } else {
        throw new Error(result.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showToast('Failed to add item. Please try again.', 'error');
    } finally {
      setIsAddingItem(false);
      setShowAddItem(false);
    }
  };

  const getFilteredInventoryItems = (inventoryType) => {
    return inventoryItems.filter(item => item.inventoryType === inventoryType);
  };

  const getUniqueItemNames = (inventoryType) => {
    const items = inventoryItems.filter(item => item.inventoryType === inventoryType);
    const uniqueItems = [...new Set(items.map(item => item.itemsName))];
    return uniqueItems.filter(Boolean);
  };

  const handleItemNameSelection = (itemName, formType) => {
    const selectedItem = inventoryItems.find(item => 
      item.itemsName === itemName && 
      item.inventoryType === (formType === 'purchase' ? purchaseForm.inventoryType : issueForm.inventoryType)
    );
    
    if (selectedItem) {
      if (formType === 'purchase') {
        setPurchaseForm({
          inventoryNo: selectedItem.inventoryNo,
          inventoryType: selectedItem.inventoryType,
          department: selectedItem.department,
          itemsName: selectedItem.itemsName,
          openingBalance: " ",
          perUnit: selectedItem.perUnit,
          unit: selectedItem.unit,
          remarks: selectedItem.remarks,
          uploadFile: selectedItem.uploadFile
        });
      } else if (formType === 'issue') {
        setIssueForm({
          inventoryNo: selectedItem.inventoryNo,
          inventoryType: selectedItem.inventoryType,
          department: selectedItem.department,
          itemsName: selectedItem.itemsName,
          openingBalance: selectedItem.openingBalance,
          perUnit: selectedItem.perUnit,
          unit: selectedItem.unit,
          partyName: '',
          foodName: '',
          eventDate: selectedItem.eventDate || '',
          remarks: selectedItem.remarks,
          uploadFile: selectedItem.uploadFile,
          issueData: '',
          returnData: '',
          damageItems: '',
          missingItems: ''
        });
      }
    }
  };

  const compressImage = (file, maxSizeKB = 500) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          while (compressedDataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve({ file: compressedFile, dataUrl: compressedDataUrl });
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = (error) => reject(error);
      };
      
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setImageUploading(true);
        
        const { file: compressedFile, dataUrl } = await compressImage(file, 500);
        
        console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
        console.log('Compressed size:', (compressedFile.size / 1024).toFixed(2), 'KB');
        
        setSelectedImage(compressedFile);
        setImagePreview(dataUrl);
        
      } catch (error) {
        console.error('Error compressing image:', error);
        showToast('Failed to compress image', 'error');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const uploadImageToDrive = async (file) => {
    setImageUploading(true);
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: base64Data,
          fileName: file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg',
          mimeType: 'image/jpeg',
          folderId: folderId
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      return result.fileUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload image', 'error');
      throw error;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let formData, imageUrl = '';
      let targetSheet = 'INVENTORY';

      if (formType === 'addStock') {
        formData = addStockForm;
        targetSheet = 'INVENTORY History';
        if (selectedImage) {
          imageUrl = await uploadImageToDrive(selectedImage);
        }
      } else if (formType === 'purchase') {
        formData = purchaseForm;
        imageUrl = formData.uploadFile;
        targetSheet = "INVENTORY History";
      } else if (formType === 'issue') {
        formData = issueForm;
        imageUrl = formData.uploadFile;
        targetSheet = 'INVENTORY History';
      }

      let inventoryNo = formData.inventoryNo;
      if (formType === 'addStock') {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'generateInventoryNo',
            inventoryType: formData.inventoryType
          })
        });
        
        const result = await response.json();
        if (result.success) {
          inventoryNo = result.inventoryNo;
        }
      }

      const rowData = [
        new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        '',
        inventoryNo || '',
        formData.inventoryType,
        formData.department || '',
        formData.itemsName || '',
        '',
        formData.openingBalance || 0,
        0,
        formData.issueData || 0,
        formData.returnData || 0,
        formData.damageItems || 0,
        formData.missingItems || 0,
        0,
        0,
        imageUrl || 'No Image',
        formData.unit || '',
        formData.perUnit || 0,
        formData.partyName || '',
        formData.eventDate || '',
        formData.remarks || '',
        formType === 'addStock' ? 'add stock' : 
          formType === 'purchase' ? 'Purchase' : 
          formType === 'issue' ? 'Inventory Issue' : '',
        formType === 'issue' ? (formData.foodName || '') : (formData.foodName || '')
      ];

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: targetSheet,
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      showToast("Data saved successfully!");
      handleCancel(formType);
      
      const inventoryResponse = await fetch(`${scriptUrl}?action=fetch&sheet=INVENTORY`);
      const inventoryResult = await inventoryResponse.json();
      
      if (inventoryResult.success && inventoryResult.data) {
        const items = inventoryResult.data.slice(1).map(row => ({
          inventoryNo: row[2],
          inventoryType: row[3],
          department: row[4],
          itemsName: row[5],
          openingBalance: row[7],
          perUnit: row[17],
          unit: row[16],
          eventDate: row[19],
          uploadFile: row[15],
          remarks: row[20]
        }));
        setInventoryItems(items);
      }
      
    } catch (error) {
      console.error('Error saving data:', error);
      const errorMessage = error.message || 'Failed to save data. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (formType) => {
    if (formType === 'addStock') {
      setAddStockForm({
        inventoryType: '',
        department: '',
        itemsName: '',
        openingBalance: '',
        perUnit: '',
        unit: '',
        foodName: '',
        remarks: ''
      });
      setDepartmentInputValue('');
      setItemInputValue('');
      setSelectedImage(null);
      setImagePreview(null);
    } else if (formType === 'purchase') {
      setPurchaseForm({
        inventoryType: '',
        inventoryNo: '',
        department: '',
        itemsName: '',
        openingBalance: '',
        perUnit: '',
        unit: '',
        remarks: '',
        uploadFile: ''
      });
    } else if (formType === 'issue') {
      setIssueForm({
        inventoryType: '',
        inventoryNo: '',
        department: '',
        itemsName: '',
        openingBalance: '',
        perUnit: '',
        unit: '',
        foodName: '',
        eventDate: '',
        partyName: '',
        issueData: '',
        returnData: '',
        damageItems: '',
        missingItems: '',
        remarks: '',
        uploadFile: ''
      });
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto mb-8">
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('addStock')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border-r ${
                activeTab === 'addStock'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Stock
            </button>
            <button
              onClick={() => setActiveTab('purchase')}
              className={`px-4 py-2 text-sm font-medium border-r ${
                activeTab === 'purchase'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              Purchase
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                activeTab === 'issue'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Edit className="h-4 w-4 inline mr-1" />
              Inventory Issue
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100">
            <center>
              <h2 className="text-lg font-semibold text-purple-700">
                {activeTab === 'addStock' && 'Add Stock Form'}
                {activeTab === 'purchase' && 'Purchase Form'}
                {activeTab === 'issue' && 'Inventory Issue Form'}
              </h2>
            </center>
          </div>

          <form 
            onSubmit={(e) => handleSubmit(e, activeTab)} 
            className="p-4 space-y-4"
          >
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Stock Form */}
            {activeTab === 'addStock' && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Inventory Type *</label>
                    <select
                      name="inventoryType"
                      value={addStockForm.inventoryType}
                      onChange={handleAddStockChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Inventory Type</option>
                      {dropdownOptions.inventoryTypeOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="department" className="block text-xs font-medium text-purple-700">Department *</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={departmentInputValue}
                        onChange={(e) => {
                          setDepartmentInputValue(e.target.value);
                          setAddStockForm(prev => ({ ...prev, department: e.target.value }));
                        }}
                        onFocus={(e) => {
                          if (addStockForm.inventoryType) {
                            e.target.nextElementSibling.style.display = 'block';
                          }
                        }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'none';
                            }
                          }, 200);
                        }}
                        placeholder={addStockForm.inventoryType ? "Search or type new department..." : "Select Inventory Type First"}
                        disabled={!addStockForm.inventoryType}
                        required
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      
                      {addStockForm.inventoryType && (
                        <div 
                          className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-md shadow-lg max-h-48 overflow-y-auto" 
                          style={{ display: 'none' }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {filteredDepartments
                            .filter(dept => dept.toLowerCase().includes(departmentInputValue.toLowerCase()))
                            .map((option, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAddStockForm(prev => ({ ...prev, department: option, itemsName: '' }));
                                setDepartmentInputValue(option);
                                setItemInputValue('');
                                const inputField = e.target.closest('.relative').querySelector('input');
                                const dropdown = e.target.parentElement;
                                if (dropdown) dropdown.style.display = 'none';
                                if (inputField) inputField.blur();
                              }}
                            >
                              {option}
                            </div>
                          ))}
                          
                          {departmentInputValue && !filteredDepartments.includes(departmentInputValue) && departmentInputValue.trim() !== '' && (
                            <div
                              className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm border-t border-green-200 text-green-600 font-medium flex items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddDepartment(departmentInputValue);
                                e.target.parentElement.style.display = 'none';
                              }}
                            >
                              <span className="mr-2">+</span>
                              {isAddingDepartment ? 'Adding...' : `Add "${departmentInputValue}"`}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="itemsName" className="block text-xs font-medium text-purple-700">Items Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="itemsName"
                        name="itemsName"
                        value={itemInputValue}
                        onChange={(e) => {
                          setItemInputValue(e.target.value);
                          setAddStockForm(prev => ({ ...prev, itemsName: e.target.value }));
                        }}
                        onFocus={(e) => {
                          if (addStockForm.department) {
                            e.target.nextElementSibling.style.display = 'block';
                          }
                        }}
                        onBlur={(e) => {
                          setTimeout(() => {
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'none';
                            }
                          }, 200);
                        }}
                        placeholder={addStockForm.department ? "Search or type new item..." : "Select department first"}
                        disabled={!addStockForm.department}
                        required
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed pr-8"
                      />
                      
                      {addStockForm.department && (
                        <div 
                          className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-md shadow-lg max-h-48 overflow-y-auto" 
                          style={{ display: 'none' }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {filteredItems
                            .filter(item => item.toLowerCase().includes(itemInputValue.toLowerCase()))
                            .map((option, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAddStockForm(prev => ({ ...prev, itemsName: option }));
                                setItemInputValue(option);
                                const inputField = e.target.closest('.relative').querySelector('input');
                                const dropdown = e.target.parentElement;
                                if (dropdown) dropdown.style.display = 'none';
                                if (inputField) inputField.blur();
                              }}
                            >
                              {option}
                            </div>
                          ))}
                          
                          {itemInputValue && addStockForm.department && !filteredItems.includes(itemInputValue) && itemInputValue.trim() !== '' && (
                            <div
                              className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm border-t border-green-200 text-green-600 font-medium flex items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddItem(itemInputValue);
                                e.target.parentElement.style.display = 'none';
                              }}
                            >
                              <span className="mr-2">+</span>
                              {isAddingItem ? 'Adding...' : `Add "${itemInputValue}"`}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Opening Balance *</label>
                    <input
                      type="number"
                      name="openingBalance"
                      value={addStockForm.openingBalance}
                      onChange={handleAddStockChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Per Unit Price *</label>
                    <input
                      type="number"
                      name="perUnit"
                      value={addStockForm.perUnit}
                      onChange={handleAddStockChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Unit *</label>
                    <select
                      name="unit"
                      value={addStockForm.unit}
                      onChange={handleAddStockChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Unit</option>
                      {dropdownOptions.unitOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-purple-700">Upload Image</label>
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-3">
                    <label htmlFor="uploadFile" className="cursor-pointer">
                      <div className="text-center">
                        <FileImage className="mx-auto h-8 w-8 text-purple-400" />
                      </div>
                      <div className="mt-2">
                        <span className="block text-xs font-medium text-purple-600">
                          {selectedImage ? selectedImage.name : 'Click to upload an image'}
                        </span>
                      </div>
                      <input
                        id="uploadFile"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="mt-3">
                      <img src={imagePreview} alt="Preview" className="mx-auto max-h-32 rounded border" />
                    </div>
                  )}
                  {imageUploading && (
                    <div className="mt-2 text-xs text-purple-600">Uploading image...</div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-purple-700">Remarks</label>
                  <textarea
                    name="remarks"
                    value={addStockForm.remarks}
                    onChange={handleAddStockChange}
                    rows="3"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Add any additional remarks or notes..."
                  />
                </div>
              </div>
            )}

            {/* Purchase Form */}
            {activeTab === 'purchase' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-purple-700">Inventory Type *</label>
                  <select
                    name="inventoryType"
                    value={purchaseForm.inventoryType}
                    onChange={(e) => {
                      setPurchaseForm(prev => ({
                        ...prev,
                        inventoryType: e.target.value,
                        inventoryNo: '',
                        department: '',
                        itemsName: '',
                        openingBalance: '',
                        perUnit: '',
                        unit: '',
                        remarks: '',
                        uploadFile: ''
                      }));
                    }}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Inventory Type</option>
                    {dropdownOptions.inventoryTypeOptions.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {purchaseForm.inventoryType && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Item Name *</label>
                    <select
                      name="itemsName"
                      value={purchaseForm.itemsName}
                      onChange={(e) => handleItemNameSelection(e.target.value, 'purchase')}
                      required
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Item Name</option>
                      {getUniqueItemNames(purchaseForm.inventoryType).map((item, index) => (
                        <option key={index} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {purchaseForm.itemsName && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Department</label>
                        <input
                          type="text"
                          value={purchaseForm.department}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Inventory Number</label>
                        <input
                          type="text"
                          value={purchaseForm.inventoryNo}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Opening Balance *</label>
                        <input
                          type="number"
                          name="openingBalance"
                          value={purchaseForm.openingBalance || ""}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                          min="0"
                          step="0.01"
                          required
                          placeholder="Enter opening balance"
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Per Unit Price</label>
                        <input
                          type="number"
                          value={purchaseForm.perUnit}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Unit</label>
                        <input
                          type="text"
                          value={purchaseForm.unit}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {purchaseForm.uploadFile && purchaseForm.uploadFile !== 'No Image' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Existing Image</label>
                        <div className="border border-purple-200 rounded-lg p-2">
                          <div className="flex items-center justify-center">
                            <img 
                              src={getDisplayableImageUrl(purchaseForm.uploadFile)} 
                              alt="Existing Image" 
                              className="max-h-40 max-w-full object-contain cursor-pointer border border-gray-200 rounded"
                              onClick={() => window.open(purchaseForm.uploadFile, '_blank')}
                              onError={(e) => {
                                console.log('Image failed to load:', purchaseForm.uploadFile);
                                if (e.target.src !== purchaseForm.uploadFile) {
                                  console.log('Trying original URL:', purchaseForm.uploadFile);
                                  e.target.src = purchaseForm.uploadFile;
                                } else {
                                  console.log('Both thumbnail and original URL failed');
                                  e.target.style.display = 'none';
                                  const fallbackDiv = e.target.nextElementSibling;
                                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                                }
                              }}
                              onLoad={(e) => {
                                console.log('Image loaded successfully:', e.target.src);
                              }}
                              style={{ minHeight: '40px', minWidth: '40px' }}
                            />
                            <div className="hidden items-center justify-center w-16 h-16 bg-gray-100 rounded border border-gray-200 cursor-pointer" onClick={() => window.open(purchaseForm.uploadFile, '_blank')}>
                              <FileImage className="h-6 w-6 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-purple-700">Remarks</label>
                      <textarea
                        value={purchaseForm.remarks}
                        readOnly
                        disabled
                        tabIndex={-1}
                        rows="3"
                        className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Issue Form */}
            {activeTab === 'issue' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-purple-700">Inventory Type *</label>
                  <select
                    name="inventoryType"
                    value={issueForm.inventoryType}
                    onChange={(e) => {
                      setIssueForm(prev => ({
                        ...prev,
                        inventoryType: e.target.value,
                        inventoryNo: '',
                        department: '',
                        itemsName: '',
                        openingBalance: '',
                        perUnit: '',
                        unit: '',
                        foodName: '',
                        eventDate: '',
                        partyName: '',
                        issueData: '',
                        returnData: '',
                        damageItems: '',
                        missingItems: '',
                        remarks: '',
                        uploadFile: ''
                      }));
                    }}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Inventory Type</option>
                    {dropdownOptions.inventoryTypeOptions.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {issueForm.inventoryType && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-purple-700">Item Name *</label>
                    <select
                      name="itemsName"
                      value={issueForm.itemsName}
                      onChange={(e) => handleItemNameSelection(e.target.value, 'issue')}
                      required
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Item Name</option>
                      {getUniqueItemNames(issueForm.inventoryType).map((item, index) => (
                        <option key={index} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {issueForm.itemsName && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Department</label>
                        <input
                          type="text"
                          value={issueForm.department}  
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Inventory Number</label>
                        <input
                          type="text"
                          value={issueForm.inventoryNo}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Opening Balance</label>
                        <input
                          type="number"
                          value={issueForm.openingBalance}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Per Unit Price</label>
                        <input
                          type="number"
                          value={issueForm.perUnit}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Unit</label>
                        <input
                          type="text"
                          value={issueForm.unit}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full rounded-md border border-gray-300 p-1.5 text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Food Name</label>
                        <input
                          type="text"
                          name="foodName"
                          value={issueForm.foodName}
                          onChange={(e) => setIssueForm(prev => ({ ...prev, foodName: e.target.value }))}
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Enter food name"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Event Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            name="eventDate"
                            value={issueForm.eventDate}
                            onChange={(e) => setIssueForm(prev => ({...prev, eventDate: e.target.value}))}
                            className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <Calendar className="absolute right-2 top-2 h-4 w-4 text-purple-400 pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Party Name *</label>
                        <input
                          type="text"
                          name="partyName"
                          value={issueForm.partyName}
                          onChange={(e) => setIssueForm(prev => ({...prev, partyName: e.target.value}))}
                          required
                          placeholder="Enter party name"
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Issue Data *</label>
                        <input
                          type="number"
                          name="issueData"
                          value={issueForm.issueData}
                          onChange={(e) => setIssueForm(prev => ({ ...prev, issueData: e.target.value }))}
                          min="0"
                          step="0.01"
                          required
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Return Data</label>
                        <input
                          type="number"
                          name="returnData"
                          value={issueForm.returnData}
                          onChange={(e) => setIssueForm(prev => ({ ...prev, returnData: e.target.value }))}
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Damage Items</label>
                        <input
                          type="number"
                          name="damageItems"
                          value={issueForm.damageItems}
                          onChange={(e) => setIssueForm(prev => ({ ...prev, damageItems: e.target.value }))}
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Missing Items</label>
                        <input
                          type="number"
                          name="missingItems"
                          value={issueForm.missingItems}
                          onChange={(e) => setIssueForm(prev => ({ ...prev, missingItems: e.target.value }))}
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {issueForm.uploadFile && issueForm.uploadFile !== 'No Image' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-purple-700">Existing Image</label>
                        <div className="border border-purple-200 rounded-lg p-2">
                          <div className="flex items-center justify-center">
                            <img 
                              src={getDisplayableImageUrl(issueForm.uploadFile)} 
                              alt="Existing Image" 
                              className="max-h-40 max-w-full object-contain cursor-pointer border border-gray-200 rounded"
                              onClick={() => window.open(issueForm.uploadFile, '_blank')}
                              onError={(e) => {
                                console.log('Image failed to load:', issueForm.uploadFile);
                                if (e.target.src !== issueForm.uploadFile) {
                                  e.target.src = issueForm.uploadFile;
                                } else {
                                  e.target.style.display = 'none';
                                  const fallbackDiv = e.target.nextElementSibling;
                                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                                }
                              }}
                              style={{ minHeight: '40px', minWidth: '40px' }}
                            />
                            <div className="hidden items-center justify-center w-16 h-16 bg-gray-100 rounded border border-gray-200 cursor-pointer" onClick={() => window.open(issueForm.uploadFile, '_blank')}>
                              <FileImage className="h-6 w-6 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-purple-700">Remarks</label>
                      <textarea
                        name="remarks"
                        value={issueForm.remarks}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, remarks: e.target.value }))}
                        rows="3"
                        placeholder="Add any remarks or notes..."
                        className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-t border-purple-100 mt-6">
              <button
                type="button"
                onClick={() => handleCancel(activeTab)}
                className="rounded-md border border-purple-200 py-2 px-4 text-sm text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || imageUploading}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-sm text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}