"use client"

import { useState, useEffect } from "react"

import {
  BarChart3,
  CheckCircle2,
  Package,
  AlertTriangle,
  Filter,
  TrendingUp,
  TrendingDown,
  Archive,
  RefreshCw,
  DollarSign,
  Building2,
} from "lucide-react"

import AdminLayout from "../../components/layout/AdminLayout.jsx"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [filterInventoryType, setFilterInventoryType] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // State for Inventory data
  const [inventoryData, setInventoryData] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    damageItems: 0,
    missingItems: 0,
    departmentData: [],
    inventoryTypeData: [],
    allRecords: [],
    loading: true,
    error: null,
  })

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null
    const cell = row.c[index]
    return cell && "v" in cell ? cell.v : null
  }

  // Check if value is not null or empty
  const isNotNull = (value) => {
    return value !== null && value !== undefined && value !== "" && value !== 0
  }

  // Calculate closing balance
  const calculateClosingBalance = (opening, purchase, issue, returnData, damage, missing) => {
    const openingBal = parseFloat(opening) || 0
    const purchaseData = parseFloat(purchase) || 0
    const issueData = parseFloat(issue) || 0
    const returnDataVal = parseFloat(returnData) || 0
    const damageVal = parseFloat(damage) || 0
    const missingVal = parseFloat(missing) || 0
    
    return openingBal + purchaseData - issueData + returnDataVal - damageVal - missingVal
  }

  // Fetch Inventory data from Google Sheets
  const fetchInventoryData = async () => {
    try {
      setInventoryData((prev) => ({ ...prev, loading: true, error: null }))
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4/gviz/tq?tqx=out:json&sheet=Inventory`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch Inventory sheet data: ${response.status}`)
      }

      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)

      console.log("Fetched Inventory data:", {
        totalRows: data.table.rows.length,
        firstFewRows: data.table.rows.slice(2).map((row, idx) => ({
          rowIndex: idx,
          rowData: row.c ? row.c.map((cell) => cell?.v) : row,
        })),
      })

      // Initialize counters
      let totalItems = 0
      let totalValue = 0
      let lowStockItems = 0
      let totalDamageItems = 0
      let totalMissingItems = 0

      // Department tracking (5 departments as requested)
      const departmentCount = {
        Kitchen: 0,
        Housekeeping: 0,
        Maintenance: 0,
        Admin: 0,
        Events: 0,
      }

      // Inventory type tracking
      const inventoryTypeCount = {
        Crockery: 0,
        Disposal: 0,
        Decor: 0,
        Grocery: 0,
        Dresses: 0,
      }

      const allRecords = []

      // Process rows starting from row 3 (slice from index 2)
      data.table.rows.slice(2).forEach((row, index) => {
        const rowIndex = index + 3 // Adjust for original row index

        // Column mapping based on your form fields:
        // A: Inventory Type, B: Department, C: Items Name, D: Receive Date
        // E: Opening Balance, F: Purchase Data, G: Per Unit, H: Issue Data
        // I: Return Data, J: Damage Items, K: Missing Items, L: Unit
        // M: Party Name, N: Event Date, O: Food Name, P: Remarks

        const inventoryType = getCellValue(row, 0) // Column A
        const department = getCellValue(row, 1) // Column B
        const itemsName = getCellValue(row, 2) // Column C
        const receiveDate = getCellValue(row, 3) // Column D
        const openingBalance = getCellValue(row, 4) // Column E
        const purchaseData = getCellValue(row, 5) // Column F
        const perUnit = getCellValue(row, 6) // Column G
        const issueData = getCellValue(row, 7) // Column H
        const returnData = getCellValue(row, 8) // Column I
        const damageItems = getCellValue(row, 9) // Column J
        const missingItems = getCellValue(row, 10) // Column K
        const unit = getCellValue(row, 11) // Column L
        const partyName = getCellValue(row, 12) // Column M
        const eventDate = getCellValue(row, 13) // Column N
        const foodName = getCellValue(row, 14) // Column O
        const remarks = getCellValue(row, 15) // Column P

        // Only process rows with items name
        if (isNotNull(itemsName)) {
          totalItems++

          // Calculate closing balance
          const closingBalance = calculateClosingBalance(
            openingBalance, purchaseData, issueData, returnData, damageItems, missingItems
          )

          // Calculate total balance (closing balance * per unit price)
          const unitPrice = parseFloat(perUnit) || 0
          const totalBalance = closingBalance * unitPrice
          totalValue += totalBalance

          // Count damage and missing items
          const damageCount = parseFloat(damageItems) || 0
          const missingCount = parseFloat(missingItems) || 0
          totalDamageItems += damageCount
          totalMissingItems += missingCount

          // Check for low stock (closing balance < 10)
          if (closingBalance < 10) {
            lowStockItems++
          }

          // Department tracking
          if (department && typeof department === "string") {
            const dept = department.trim()
            if (departmentCount.hasOwnProperty(dept)) {
              departmentCount[dept]++
            }
          }

          // Inventory type tracking
          if (inventoryType && typeof inventoryType === "string") {
            const type = inventoryType.trim()
            if (inventoryTypeCount.hasOwnProperty(type)) {
              inventoryTypeCount[type]++
            }
          }

          // Store record for filtering/searching
          allRecords.push({
            id: rowIndex,
            inventoryType: inventoryType || "Unknown",
            department: department || "Unknown",
            itemsName: itemsName,
            receiveDate: receiveDate,
            openingBalance: parseFloat(openingBalance) || 0,
            purchaseData: parseFloat(purchaseData) || 0,
            perUnit: parseFloat(perUnit) || 0,
            issueData: parseFloat(issueData) || 0,
            returnData: parseFloat(returnData) || 0,
            damageItems: damageCount,
            missingItems: missingCount,
            closingBalance: closingBalance,
            totalBalance: totalBalance,
            unit: unit || "PCS",
            partyName: partyName,
            eventDate: eventDate,
            foodName: foodName,
            remarks: remarks,
            stockStatus: closingBalance < 10 ? "Low Stock" : closingBalance < 50 ? "Medium Stock" : "Good Stock"
          })
        }
      })

      // Convert department data to chart data
      const departmentData = Object.entries(departmentCount)
        .filter(([dept, count]) => count > 0)
        .map(([dept, count]) => ({
          name: dept,
          value: count,
          color: dept === "Kitchen" ? "#8b5cf6" : 
                 dept === "Housekeeping" ? "#06b6d4" : 
                 dept === "Maintenance" ? "#f59e0b" : 
                 dept === "Admin" ? "#ef4444" : "#10b981",
        }))

      // Convert inventory type data to chart data
      const inventoryTypeData = Object.entries(inventoryTypeCount)
        .filter(([type, count]) => count > 0)
        .map(([type, count]) => ({
          name: type,
          value: count,
          color: type === "Crockery" ? "#8b5cf6" : 
                 type === "Disposal" ? "#06b6d4" : 
                 type === "Decor" ? "#f59e0b" : 
                 type === "Grocery" ? "#ef4444" : "#10b981",
        }))

      setInventoryData({
        totalItems,
        totalValue,
        lowStockItems,
        damageItems: totalDamageItems,
        missingItems: totalMissingItems,
        departmentData,
        inventoryTypeData,
        allRecords,
        loading: false,
        error: null,
      })

      console.log("Inventory Data Summary:", {
        totalItems,
        totalValue,
        lowStockItems,
        totalDamageItems,
        totalMissingItems,
        departmentData,
        inventoryTypeData,
      })
    } catch (error) {
      console.error("Error fetching Inventory data:", error)
      setInventoryData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    }
  }

  useEffect(() => {
    fetchInventoryData()
  }, [])

  // Filter records based on search and filters
  const filteredRecords = inventoryData.allRecords.filter((record) => {
    // Filter by department
    if (filterDepartment !== "all" && record.department !== filterDepartment) return false
    
    // Filter by inventory type
    if (filterInventoryType !== "all" && record.inventoryType !== filterInventoryType) return false

    // Filter by search query
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      if (record.itemsName && record.itemsName.toLowerCase().includes(query)) return true
      if (record.department && record.department.toLowerCase().includes(query)) return true
      if (record.inventoryType && record.inventoryType.toLowerCase().includes(query)) return true
      if (record.partyName && record.partyName.toLowerCase().includes(query)) return true
      if (record.foodName && record.foodName.toLowerCase().includes(query)) return true
      return false
    }

    return true
  })

  // Department Chart Component
  const DepartmentChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={inventoryData.departmentData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {inventoryData.departmentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Inventory Types Chart
  const InventoryTypesChart = () => {
    const chartData = inventoryData.inventoryTypeData

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Records Table Component
  const RecordsTable = () => {
    return (
      <div className="rounded-xl border border-purple-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-100">
            <thead className="bg-gradient-to-r from-purple-50 to-violet-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Items Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Inventory Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Closing Balance
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-purple-50">
              {filteredRecords.slice(0, 100).map((record) => (
                <tr key={record.id} className="hover:bg-purple-25 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.itemsName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.inventoryType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {record.closingBalance} {record.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        record.stockStatus === "Good Stock"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : record.stockStatus === "Medium Stock"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {record.stockStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ₹{record.totalBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > 100 && (
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-t border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Showing first 100 of {filteredRecords.length} records</p>
          </div>
        )}
      </div>
    )
  }

  if (inventoryData.loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin mx-auto"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              ></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-purple-700">Loading Inventory Dashboard</h3>
              <p className="text-purple-600">Fetching latest data from Google Sheets...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (inventoryData.error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-700">Error Loading Data</h3>
              <p className="text-red-600 text-sm">{inventoryData.error}</p>
            </div>
            <button
              onClick={fetchInventoryData}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-purple-700">Inventory Dashboard</h1>
          <p className="text-purple-600">Monitor and manage your inventory across all departments</p>
        </div>

        {/* Main Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">Total Items</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-blue-700">{inventoryData.totalItems}</p>
                <p className="text-sm text-blue-600">Items in inventory</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">Total Value</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-emerald-700">₹{inventoryData.totalValue.toFixed(0)}</p>
                <p className="text-sm text-emerald-600">Inventory worth</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <TrendingDown className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-600">Low Stock</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-amber-700">{inventoryData.lowStockItems}</p>
                <p className="text-sm text-amber-600">Items need reorder</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">Damage Items</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-red-700">{inventoryData.damageItems}</p>
                <p className="text-sm text-red-600">Items damaged</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Archive className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">Missing Items</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-purple-700">{inventoryData.missingItems}</p>
                <p className="text-sm text-purple-600">Items missing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex space-x-1 bg-purple-100 p-1 rounded-xl">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "analytics", label: "Analytics", icon: CheckCircle2 },
              { id: "records", label: "Records", icon: Package },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 font-medium ${
                  activeTab === tab.id
                    ? "bg-white text-purple-700 shadow-md"
                    : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-7">
                <div className="lg:col-span-4 rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                    <h3 className="text-lg font-semibold text-purple-700">Inventory by Type</h3>
                    <p className="text-purple-600 text-sm mt-1">Distribution of items by category</p>
                  </div>
                  <div className="p-6">
                    <InventoryTypesChart />
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                    <h3 className="text-lg font-semibold text-purple-700">Department Distribution</h3>
                    <p className="text-purple-600 text-sm mt-1">Items across departments</p>
                  </div>
                  <div className="p-6">
                    <DepartmentChart />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-700">Inventory Analytics</h3>
                <p className="text-purple-600 text-sm mt-1">Detailed performance metrics and insights</p>
              </div>
              <div className="p-6">
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                      <div className="text-sm font-semibold text-purple-700">Stock Health Rate</div>
                      <div className="text-2xl font-bold text-purple-800">
                        {inventoryData.totalItems > 0
                          ? (((inventoryData.totalItems - inventoryData.lowStockItems) / inventoryData.totalItems) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                      <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${inventoryData.totalItems > 0 ? ((inventoryData.totalItems - inventoryData.lowStockItems) / inventoryData.totalItems) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                      <div className="text-sm font-semibold text-blue-700">Average Item Value</div>
                      <div className="text-2xl font-bold text-blue-800">
                        ₹{inventoryData.totalItems > 0 ? (inventoryData.totalValue / inventoryData.totalItems).toFixed(0) : 0}
                      </div>
                      <div className="text-xs text-blue-600">Per item average</div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                      <div className="text-sm font-semibold text-green-700">Damage Loss Rate</div>
                      <div className="text-2xl font-bold text-green-800">
                        {inventoryData.totalItems > 0 ? ((inventoryData.damageItems / inventoryData.totalItems) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="w-full h-3 bg-green-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${inventoryData.totalItems > 0 ? (inventoryData.damageItems / inventoryData.totalItems) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-6">
                    <h4 className="text-lg font-semibold text-purple-700 mb-6">Inventory Summary</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Total Items in Stock", value: inventoryData.totalItems, color: "purple" },
                        { label: "Total Inventory Value", value: `₹${inventoryData.totalValue.toFixed(0)}`, color: "emerald" },
                        { label: "Low Stock Alerts", value: inventoryData.lowStockItems, color: "amber" },
                        { label: "Damaged Items", value: inventoryData.damageItems, color: "red" },
                        { label: "Missing Items", value: inventoryData.missingItems, color: "pink" },
                        { label: "Active Departments", value: inventoryData.departmentData.length, color: "blue" },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-white rounded-lg border border-purple-100"
                        >
                          <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                          <span className={`font-bold text-${item.color}-700`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Department Performance */}
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                    <h4 className="text-lg font-semibold text-blue-700 mb-6">Department Performance</h4>
                    <div className="space-y-4">
                      {inventoryData.departmentData.map((dept, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${dept.color}20` }}>
                              <Building2 className="h-4 w-4" style={{ color: dept.color }} />
                            </div>
                            <span className="font-medium text-gray-700">{dept.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{dept.value} items</div>
                            <div className="text-xs text-gray-500">
                              {inventoryData.totalItems > 0 ? ((dept.value / inventoryData.totalItems) * 100).toFixed(1) : 0}% of total
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "records" && (
            <div className="rounded-2xl border border-purple-200 shadow-lg bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-700">Inventory Records</h3>
                <p className="text-purple-600 text-sm mt-1">Detailed view of all inventory items</p>
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row mb-6">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="search" className="flex items-center text-purple-700 font-medium">
                      <Filter className="h-4 w-4 mr-2" />
                      Search Records
                    </label>
                    <input
                      id="search"
                      placeholder="Search by item name, department, or party name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2 lg:w-[200px]">
                    <label htmlFor="department-filter" className="flex items-center text-purple-700 font-medium">
                      <Building2 className="h-4 w-4 mr-2" />
                      Department
                    </label>
                    <select
                      id="department-filter"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    >
                      <option value="all">All Departments</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Admin">Admin</option>
                      <option value="Events">Events</option>
                    </select>
                  </div>
                  <div className="space-y-2 lg:w-[200px]">
                    <label htmlFor="type-filter" className="flex items-center text-purple-700 font-medium">
                      <Package className="h-4 w-4 mr-2" />
                      Type
                    </label>
                    <select
                      id="type-filter"
                      value={filterInventoryType}
                      onChange={(e) => setFilterInventoryType(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    >
                      <option value="all">All Types</option>
                      <option value="Crockery">Crockery</option>
                      <option value="Disposal">Disposal</option>
                      <option value="Decor">Decor</option>
                      <option value="Grocery">Grocery</option>
                      <option value="Dresses">Dresses</option>
                    </select>
                  </div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="text-center p-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">No records found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <div className="overflow-hidden" style={{ maxHeight: "600px", overflowY: "auto" }}>
                    <RecordsTable />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}