import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import { Head, useForm, router } from "@inertiajs/react";
import { 
  PackageCheck, Search, Filter, Package, AlertCircle, 
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Plus,
  ChevronDown, ChevronRight as ChevronRightIcon, X,
  Download, RefreshCw, FileText, LayoutGrid, List
} from "lucide-react";
import { useEffect, Fragment, useState, useMemo } from "react";

export default function Inventory({ inventoryData, filters }) {
  const { data, setData, get } = useForm({
    search: filters.search || "",
    status: filters.status || "",
    date_received: filters.date_received || "",
  });

  // State management
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // table or grid
  const [hoveredRow, setHoveredRow] = useState(null);

  // Group by PO function
  const groupByPO = (inventory) => {
    if (!inventory || !inventory.data) return [];
    const grouped = new Map();
    inventory.data.forEach((inv) => {
      const po = inv.po_detail?.purchase_order;
      if (!po) return;
      if (!grouped.has(po.id)) {
        grouped.set(po.id, {
          po_id: po.id,
          po: po,
          requested_by: po.requested_by,
          requested_by_office: po.requested_by_office,
          items: [],
        });
      }
      grouped.get(po.id).items.push(inv);
    });
    return Array.from(grouped.values());
  };

  const groupedInventoryData = useMemo(() => groupByPO(inventoryData), [inventoryData]);

  // Calculate selectable IDs
  const allSelectableIds = useMemo(() => 
    groupedInventoryData.flatMap(group => 
      group.items.filter(inv => {
        const totalStock = parseFloat(inv.total_stock) || 0;
        const issuedQty = parseFloat(inv.issued_qty) || 0;
        return totalStock - issuedQty > 0;
      }).map(inv => inv.id)
    ), [groupedInventoryData]);
  
  const allSelected = allSelectableIds.length > 0 && selectedItems.length === allSelectableIds.length;

  // Toggle functions
  const toggleSelect = (id, stock) => {
    if (stock <= 0) return;
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === allSelectableIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allSelectableIds);
    }
  };

  const toggleGroup = (poId) => {
    setExpandedGroups(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

  // Expand all groups by default
  useEffect(() => {
    const initialExpanded = {};
    groupedInventoryData.forEach(group => {
      initialExpanded[group.po_id] = true;
    });
    setExpandedGroups(initialExpanded);
  }, [groupedInventoryData.length]);

  // Debounced search
  useEffect(() => {
    setIsLoading(true);
    const delay = setTimeout(() => {
      get(route("supply_officer.inventory"), {
        preserveState: true,
        replace: true,
      });
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(delay);
  }, [data.search, data.status, data.date_received]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = groupedInventoryData.reduce((acc, group) => acc + group.items.length, 0);
    const availableItems = groupedInventoryData.reduce((acc, group) => 
      acc + group.items.filter(inv => {
        const totalStock = parseFloat(inv.total_stock) || 0;
        const issuedQty = parseFloat(inv.issued_qty) || 0;
        return totalStock - issuedQty > 0;
      }).length, 0);
    const totalValue = groupedInventoryData.reduce((acc, group) => 
      acc + group.items.reduce((sum, inv) => {
        const unitCost = parseFloat(inv.unit_cost) || 0;
        const totalStock = parseFloat(inv.total_stock) || 0;
        return sum + (unitCost * totalStock);
      }, 0), 0);
    return { totalItems, availableItems, issuedItems: totalItems - availableItems, totalValue };
  }, [groupedInventoryData]);

  // Clear filters
  const clearFilters = () => {
    setData({ search: "", status: "", date_received: "" });
  };

  const hasActiveFilters = data.search || data.status || data.date_received;

  return (
    <SupplyOfficerLayout header="Schools Divisions Office - Ilagan | Inventory">
      <Head title="Inventory" />

      {/* Top Bar with Title and Actions */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          {/* Title Section */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold text-gray-900">Inventory</h2>
              {isLoading && (
                <RefreshCw size={18} className="text-blue-500 animate-spin" />
              )}
            </div>
            <p className="text-gray-500">Manage and track all supply items in the warehouse</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                showFilters || hasActiveFilters 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-xs rounded-md">
                  {[data.search, data.status, data.date_received].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Item name, PO, or Focal Person..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  value={data.search}
                  onChange={(e) => setData("search", e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={data.status}
                  onChange={(e) => setData("status", e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Issued">Issued</option>
                </select>
              </div>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Date Received</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  value={data.date_received}
                  onChange={(e) => setData("date_received", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Items", value: stats.totalItems, icon: Package, color: "from-blue-500 to-blue-600" },
          { label: "Available", value: stats.availableItems, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
          { label: "Issued", value: stats.issuedItems, icon: Clock, color: "from-amber-500 to-amber-600" },
          
        ].map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${stat.color} text-white px-5 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80 mb-1">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-xl">
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      {selectedItems.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <PackageCheck size={20} />
            </div>
            <div>
              <p className="font-semibold">{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected</p>
              <p className="text-sm text-blue-100">Ready for issuance</p>
            </div>
          </div>
          <button
            onClick={() =>
              router.visit(route("supply_officer.issuance"), {
                method: "get",
                data: { items: selectedItems },
              })
            }
            className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition-colors duration-200 flex items-center gap-2 shadow-md"
          >
            <Plus size={18} /> Issue Selected Items
          </button>
        </div>
      )}

      {/* Modern Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={allSelectableIds.length === 0}
                    className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>

                {[
                  { label: "PO Number", width: "w-32" },
                  { label: "Item Details", width: "w-48" },
                  { label: "Specs", width: "w-40" },
                  { label: "Unit", width: "w-20" },
                  { label: "Stock", width: "w-24" },
                  { label: "Unit Cost", width: "w-28" },
                  { label: "Total Cost", width: "w-28" },
                  { label: "Status", width: "w-28" },
                  { label: "Actions", width: "w-32" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-${col.label === 'Actions' || col.label === 'Status' ? 'center' : 'left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {groupedInventoryData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Package size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No Inventory Found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedInventoryData.map((group) => (
                  <Fragment key={group.po_id}>
                    {/* PO group header */}
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 hover:bg-gray-100 transition-colors duration-200">
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                          {group.po?.po_number ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {group.requested_by ?? "N/A"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {group.requested_by_office ?? "Focal Person"}
                          </span>
                        </div>
                      </td>
                      <td colSpan="6" className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Supplier:</span>
                          <span className="text-sm font-medium text-gray-900">{group.po?.supplier?.name ?? "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-400">{group.items.length} item{group.items.length > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>

                    {/* Item rows */}
                    {group.items.map((inv, idx) => {
                      const unit = inv.unit?.unit ?? "N/A";
                      const unitCost = parseFloat(inv.unit_cost) || 0;
                      const issuedQty = parseFloat(inv.issued_qty) || 0;
                      const totalStock = parseFloat(inv.total_stock) || 0;
                      const remainingStock = Math.max(totalStock - issuedQty, 0);
                      const totalPrice = (unitCost * inv.total_stock).toFixed(2);

                      let statusConfig = { label: "Available", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 };
                      if (totalStock === 0) {
                        statusConfig = { label: "Fully Issued", bg: "bg-gray-100", text: "text-gray-600", icon: AlertCircle };
                      } else if (issuedQty > 0 && remainingStock > 0) {
                        statusConfig = { label: "Partially Issued", bg: "bg-amber-100", text: "text-amber-700", icon: Clock };
                      }

                      const StatusIcon = statusConfig.icon;
                      const isHovered = hoveredRow === inv.id;
                      const isSelected = selectedItems.includes(inv.id);

                      return (
                        <tr 
                          key={inv.id} 
                          className={`transition-all duration-200 ${isHovered ? 'bg-blue-50/50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                          onMouseEnter={() => setHoveredRow(inv.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={remainingStock <= 0}
                              onChange={() => toggleSelect(inv.id, remainingStock)}
                              className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-4 py-4"></td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{inv.item_desc ?? "No description"}</span>
                              <span className="text-xs text-gray-400">ID: {inv.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600">{inv.specs ?? "-"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-gray-900">{unit}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${remainingStock > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {remainingStock}
                              </span>
                              <span className="text-xs text-gray-400">/ {totalStock}</span>
                            </div>
                            {/* Stock progress bar */}
                            <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${remainingStock > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                style={{ width: `${totalStock > 0 ? (remainingStock / totalStock) * 100 : 0}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">₱ {unitCost.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-semibold text-gray-900">₱ {totalPrice}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded-lg`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {remainingStock <= 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg cursor-not-allowed">
                                <AlertCircle size={14} /> Issued
                              </span>
                            ) : (
                              <a
                                href={route("supply_officer.issuance", inv.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                              >
                                <PackageCheck size={14} /> Issue
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Pagination */}
        {inventoryData.links && inventoryData.links.length > 3 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500">
              Showing page <span className="font-medium text-gray-900">{inventoryData.current_page}</span> of <span className="font-medium text-gray-900">{inventoryData.last_page}</span>
            </p>
            <div className="flex items-center gap-1">
              {inventoryData.links.map((link, i) => {
                // Skip first and last if they're just navigation
                if (i === 0 || i === inventoryData.links.length - 1) return null;
                
                const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                const isNext = link.label.includes('Next') || link.label.includes('&raquo;');
                
                if (isPrev) {
                  return (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() => link.url && get(link.url, { preserveState: true, preserveScroll: true })}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  );
                }
                
                if (isNext) {
                  return (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() => link.url && get(link.url, { preserveState: true, preserveScroll: true })}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronRight size={18} />
                    </button>
                  );
                }

                return (
                  <button
                    key={i}
                    disabled={!link.url}
                    onClick={() => link.url && get(link.url, { preserveState: true, preserveScroll: true })}
                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      link.active 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "text-gray-600 hover:bg-gray-50 border border-gray-200"
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SupplyOfficerLayout>
  );
}
