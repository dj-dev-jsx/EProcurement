import IssuanceTabs from '@/Layouts/IssuanceTabs';
import SupplyOfficerLayout from '@/Layouts/SupplyOfficerLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
  FileText, 
  MinusCircle, 
  PlusCircle, 
  PrinterCheck,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Ris({ purchaseOrders, inventoryItems, ris, user }) {
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [expandedRows, setExpandedRows] = useState([]); // ✅ moved here

  // Toggle expand/collapse rows
  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Pre-index inventory by (specs+unit)
  const inventoryMap = new Map(
    inventoryItems.map((inv) => [`${inv.item_desc}_${inv.inventory?.unit}`, inv.inventory])
  );

  // Pre-index RIS by (poId + inventoryId)
  const risMap = new Map();
  ris?.data?.forEach((r) => {
    const key = `${r.po_id}_${r.inventory_item_id}`;
    if (!risMap.has(key)) risMap.set(key, []);
    risMap.get(key).push(r);
  });


const filteredRis =
  ris?.data
    ?.map((record) => {
      // Filter items individually
      const filteredItems = record.items?.filter((item) => {
        const risNo = record.ris_number?.toLowerCase() ?? '';
        const recipientName = item.recipient?.toLowerCase() ?? '';
        const division =
          item.recipient_division?.toLowerCase() ?? '';
        const itemDesc = item.inventory_item?.item_desc?.toLowerCase() ?? '';

        const matchesSearch =
          risNo.includes(search.toLowerCase()) ||
          division.includes(search.toLowerCase()) ||
          recipientName.includes(search.toLowerCase()) ||
          itemDesc.includes(search.toLowerCase());

        // Date filters
        const recordDate = item.created_at ? new Date(item.created_at) : null;
        const matchesMonth = filterMonth
          ? recordDate && recordDate.getMonth() + 1 === parseInt(filterMonth)
          : true;
        const matchesYear = filterYear
          ? recordDate && recordDate.getFullYear() === parseInt(filterYear)
          : true;

        return matchesSearch && matchesMonth && matchesYear;
      });

      if (filteredItems.length === 0) return null;

      return { ...record, items: filteredItems };
    })
    .filter(Boolean) || [];


  function handleDropdownChange(event, recordId) {
    const selectedValue = event.target.value;
    if (selectedValue === 'reissuance') {
      // Handle reissuance action
      console.log(`Reissuance selected for record ID: ${recordId}`);
    } else if (selectedValue === 'disposal') {
      // Handle disposal action
      console.log(`Disposal selected for record ID: ${recordId}`);
    }
  }

const [showSwitchModal, setShowSwitchModal] = useState(false);
const [switchItems, setSwitchItems] = useState([]);
const [switchRecord, setSwitchRecord] = useState(null);
  return (
    <SupplyOfficerLayout header="Schools Divisions Office - Ilagan | Requisition and Issue Slip">
      <Head title="RIS" />
      <IssuanceTabs />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Requisition & Issue Slip</h1>
                <p className="text-gray-600">Manage and track all RIS records</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block px-3 py-1 bg-white rounded-full border border-gray-200">
                  <span className="font-semibold text-gray-900">{filteredRis.length}</span> records found
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  if (filterMonth) params.append("month", filterMonth);
                  if (filterYear) params.append("year", filterYear);
                  if (search) params.append("search", search);

                  window.location.href = route("supply_officer.generate_report") + "?" + params.toString();
                }}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
              >
                <Download size={18} />
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Filter size={20} className="text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="RIS #, Focal Person, Division, Item..."
                    className="pl-10 h-10 bg-gray-50 border-gray-300 focus:border-blue-500 focus:bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  className="w-full h-10 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="">All Months</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                  <input
                    type="number"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">#</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">RIS No.</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Division</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Issued To</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Item Description</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Quantity</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-700">Unit Cost</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-700">Total Cost</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRis && filteredRis.length > 0 ? (
                    filteredRis.map((record, index) => {
                      const isExpanded = expandedRows.includes(record.id);
                      const visibleItems = isExpanded ? record.items : record.items.slice(0, 1);

                      const issuedTo = record.items?.[0]?.recipient ?? "N/A";
                      const division = record.items?.[0]?.recipient_division ?? "N/A";

                      return (
                        <React.Fragment key={record.id}>
                          {/* Main Row */}
                          <tr className="hover:bg-blue-50 transition-colors duration-150">
                            <td className="px-6 py-4 font-semibold text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                {record.ris_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">{division}</td>
                            <td className="px-6 py-4 text-gray-700 font-medium">{issuedTo}</td>
                            <td className="px-6 py-4 text-gray-700 font-medium">
                              {record.items[0]?.inventory_item?.item_desc ?? "N/A"}
                            </td>
                            <td className="px-6 py-4 text-center text-gray-700 font-medium">
                              {record.items[0]?.quantity ?? 0}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700 font-medium">
                              ₱{Number(record.items[0]?.inventory_item?.unit_cost ?? 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                              ₱{(
                                (record.items[0]?.quantity ?? 0) *
                                (record.items[0]?.inventory_item?.unit_cost ?? 0)
                              ).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">
                              {new Date(record.items[0]?.created_at).toLocaleDateString("en-PH", {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <a
                                  href={route("supply_officer.print_ris", record.id)}
                                  target="_blank"
                                  className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                                  title="Print RIS"
                                >
                                  <PrinterCheck size={16} />
                                  <span className="hidden sm:inline">Print</span>
                                </a>

                                <Button
                                  type="button"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 h-auto"
                                  onClick={() => {
                                    setSwitchRecord(record);
                                    setSwitchItems([]);
                                    setShowSwitchModal(true);
                                  }}
                                  title="Switch to High Value Type"
                                >
                                  <span className="hidden sm:inline">Switch</span>
                                  <span className="sm:hidden">Type</span>
                                </Button>
                              </div>

                              {/* Toggle Expand Button */}
                              {record.items.length > 1 && (
                                <button
                                  onClick={() => toggleRow(record.id)}
                                  className="mt-2 text-blue-600 hover:text-blue-700 text-xs flex items-center justify-center gap-1 font-medium transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      <MinusCircle size={14} />
                                      <span className="hidden sm:inline">Show Less</span>
                                    </>
                                  ) : (
                                    <>
                                      <PlusCircle size={14} />
                                      <span className="hidden sm:inline">Show More</span>
                                      <span className="sm:hidden">+{record.items.length - 1}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Detail Rows */}
                          {isExpanded &&
                            record.items.slice(1).map((item, idx) => (
                              <tr key={`${record.id}-${idx}`} className="bg-gray-50 hover:bg-blue-50 transition-colors duration-150">
                                <td colSpan="4" className="px-6 py-4"></td>
                                <td className="px-6 py-4 text-gray-700 font-medium">
                                  {item.inventory_item?.item_desc ?? "N/A"}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-700 font-medium">{item.quantity}</td>
                                <td className="px-6 py-4 text-right text-gray-700 font-medium">
                                  ₱{Number(item.inventory_item?.unit_cost ?? 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                  ₱{(
                                    (item.quantity ?? 0) * (item.inventory_item?.unit_cost ?? 0)
                                  ).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">
                                  {new Date(item.created_at).toLocaleDateString("en-PH", {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td></td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10">
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="bg-gray-100 rounded-full p-4 mb-4">
                            <FileText size={32} className="text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Records Found</h3>
                          <p className="text-gray-600 text-sm">Try adjusting your filters or search criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {ris?.links?.length > 3 && (
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-center items-center space-x-2">
                {ris.links.map((link, index) => (
                  <Link
                    key={index}
                    href={link.url || '#'}
                    className={`
                      px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150
                      ${link.active 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : link.url 
                          ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                      }
                    `}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="max-w-2xl rounded-xl border border-gray-200 shadow-2xl bg-white">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-2xl font-bold text-gray-900">Switch Item Type</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Select the items you want to switch to <span className="font-semibold text-gray-900">High Value</span> type. This helps categorize items for better tracking and reporting.
            </DialogDescription>
          </DialogHeader>

          {/* Item Selection List */}
          {switchRecord ? (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-2">
              {(switchRecord.items || []).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No items available for this RIS record.</p>
                </div>
              ) : (
                (switchRecord.items || []).map((item) => {
                  const itemName = item.inventoryItem?.product?.name ?? item.inventory_item?.item_desc ?? "N/A";
                  const itemSpecs = item.inventoryItem?.product?.specs ?? "";
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-150 cursor-pointer ${
                        switchItems.includes(item.id)
                          ? "bg-blue-50 border-blue-300 shadow-sm"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={switchItems.includes(item.id)}
                        onChange={(e) => {
                          setSwitchItems((prev) =>
                            e.target.checked
                              ? [...prev, item.id]
                              : prev.filter((id) => id !== item.id)
                          );
                        }}
                        className="mt-1 h-5 w-5 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{itemName}</div>
                        {itemSpecs && (
                          <div className="text-gray-600 text-sm mt-1">{itemSpecs}</div>
                        )}
                        <div className="text-gray-600 text-xs mt-2 space-x-4">
                          <span>Qty: <span className="font-medium">{item.quantity}</span></span>
                          <span>Price: <span className="font-medium">₱{Number(item.unit_cost ?? 0).toFixed(2)}</span></span>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-sm mt-4 italic">No items available.</p>
          )}

          {/* Footer */}
          <DialogFooter className="pt-6 border-t border-gray-200 mt-4 flex gap-3 justify-end">
            <Button
              variant="outline"
              className="px-6 py-2 rounded-lg"
              onClick={() => {
                setShowSwitchModal(false);
                setSwitchItems([]);
                setSwitchRecord(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              disabled={!switchItems.length}
              onClick={() => {
                // Navigate to the route with selected items
                router.visit(route('supply_officer.switch_type', {
                  type: 'ris',
                  id: switchRecord.id,
                  po_id: switchRecord.po?.id,
                  items: switchItems, // send selected item IDs
                }));
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupplyOfficerLayout>
  );
}
