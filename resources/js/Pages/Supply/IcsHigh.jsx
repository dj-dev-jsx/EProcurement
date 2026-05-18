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
  Calendar
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function IcsHigh({ ics, user, filters }) {
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [expandedRows, setExpandedRows] = useState([]); // moved here ✅

  // toggle expand/collapse
  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // filtering logic
  const filteredIcs = ics?.data?.filter((record) => {
    const requestedBy = `${record.requested_by?.firstname ?? ''} ${record.requested_by?.lastname ?? ''}`;
    const focalPerson = record.po?.rfq?.purchase_request?.focal_person?.name ?? '';

    const matchesSearch =
      search === '' ||
      record.ics_number?.toLowerCase().includes(search.toLowerCase()) ||
      record.inventory_item?.item_desc?.toLowerCase().includes(search.toLowerCase()) ||
      requestedBy.toLowerCase().includes(search.toLowerCase()) ||
      focalPerson.toLowerCase().includes(search.toLowerCase()) ||
      (record.items?.[0]?.recipient ?? '').toLowerCase().includes(search.toLowerCase());

    const recordDate = new Date(record.created_at);
    const matchesMonth = filterMonth === '' || recordDate.getMonth() + 1 === Number(filterMonth);
    const matchesYear = filterYear === '' || recordDate.getFullYear() === Number(filterYear);

    return matchesSearch && matchesMonth && matchesYear;
  });
const [showReturnModal, setShowReturnModal] = useState(false);
const [selectedRecord, setSelectedRecord] = useState(null);
const [selectedItems, setSelectedItems] = useState([]);
const [returnType, setReturnType] = useState("");
const handleActionSelect = (e, record) => {
  const action = e.target.value;
  e.target.value = ""; // reset immediately after selection

  if (action === "return") {
    setSelectedRecord(record);
    setSelectedItems([]);
    setReturnType("");
    setShowReturnModal(true);
    return; // stop here — no redirect
  }

  if (action === "reissuance" || action === "disposal") {
    const routeName =
      action === "reissuance"
        ? "supply_officer.return_form"
        : "supply_officer.disposal_form";

    window.location.href = route(routeName, { id: record.id, type: "ics" });
  }
};

const [showSwitchModal, setShowSwitchModal] = useState(false);
const [switchItems, setSwitchItems] = useState([]);
const [switchRecord, setSwitchRecord] = useState(null);

  return (
    <SupplyOfficerLayout header="Schools Divisions Office - Ilagan | Inventory Custodian Slip (ICS) - HIGH">
      <Head title="ICS - HIGH" />
      <IssuanceTabs />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Custodian Slip (ICS)</h1>
                <p className="text-gray-600">High Value Items - Manage and track all ICS records</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block px-3 py-1 bg-white rounded-full border border-gray-200">
                  <span className="font-semibold text-gray-900">{filteredIcs.length}</span> records found
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  (window.location.href = route(
                    'supply_officer.generate_ics_report_high',
                    {
                      month: filterMonth,
                      year: filterYear,
                      search: search,
                      type: 'high',
                    }
                  ))
                }
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
                    placeholder="ICS #, Item, Division, Focal Person..."
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
                  id="month-filter"
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
                    id="year-filter"
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
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">ICS No.</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Division</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Requested By</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Item Description</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Qty</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-700">Unit Cost</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-700">Total Cost</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredIcs && filteredIcs.length > 0 ? (
                    filteredIcs.map((record, index) => {
                      const itemsWithDetails =
                        record.items
                          ?.filter((item) => item.type === "high")
                          .map((item) => ({
                            description:
                              item.inventoryItem?.product?.name ??
                              item.inventory_item?.item_desc ??
                              "N/A",
                            specs: item.inventoryItem?.product?.specs ?? "",
                            quantity: item.quantity,
                            unitCost: Number(item.unit_cost ?? 0),
                            totalCost: Number(item.total_cost ?? 0),
                            date: new Date(item.created_at).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }),
                            recipient: item.recipient ?? null,
                          })) || [];

                      const isExpanded = expandedRows.includes(record.id);
                      const firstItem = itemsWithDetails[0] ?? {
                        description: record.items?.[0]?.inventory_item?.item_desc ?? "N/A",
                        quantity: record.items?.[0]?.quantity ?? 0,
                        unitCost: Number(record.items?.[0]?.inventory_item?.unit_cost ?? 0),
                        totalCost:
                          (record.items?.[0]?.quantity ?? 0) *
                          (record.items?.[0]?.inventory_item?.unit_cost ?? 0),
                        date: new Date(record.items?.[0]?.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      };

                      const remainingItems = itemsWithDetails.slice(1);
                      const issuedTo = record.items?.[0]?.recipient ?? "N/A";
                      const division = record.items?.[0]?.recipient_division ?? "N/A";

                      return (
                        <React.Fragment key={record.id}>
                          {/* Main Row */}
                          <tr className="hover:bg-blue-50 transition-colors duration-150">
                            <td className="px-6 py-4 font-semibold text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                {record.ics_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">{division}</td>
                            <td className="px-6 py-4 text-gray-700 font-medium">{issuedTo}</td>
                            <td className="px-6 py-4 text-gray-700 font-medium">{firstItem.description}</td>
                            <td className="px-6 py-4 text-center text-gray-700 font-medium">{firstItem.quantity}</td>
                            <td className="px-6 py-4 text-right text-gray-700 font-medium">₱{firstItem.unitCost?.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">₱{firstItem.totalCost?.toFixed(2)}</td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{firstItem.date}</td>

                            {/* Actions */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <a
                                  href={route("supply_officer.print_ics", [record.id, "high"])}
                                  target="_blank"
                                  className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                                  title="Print ICS"
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
                                  title="Switch to Low Value Type"
                                >
                                  <span className="hidden sm:inline">Switch</span>
                                  <span className="sm:hidden">Type</span>
                                </Button>

                                <Button
                                  type="button"
                                  onClick={(e) => handleActionSelect(e, record)}
                                  value="return"
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 h-auto"
                                  title="Return Items"
                                >
                                  Return
                                </Button>
                              </div>

                              {/* Expand Button */}
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
                            remainingItems.map((ri, i) => (
                              <tr key={i} className="bg-gray-50 hover:bg-blue-50 transition-colors duration-150">
                                <td className="px-6 py-4"></td>
                                <td className="px-6 py-4"></td>
                                <td className="px-6 py-4"></td>
                                <td className="px-6 py-4"></td>
                                <td className="px-6 py-4 text-gray-700 font-medium">
                                  {ri.description}
                                  {ri.specs && (
                                    <div className="text-xs text-gray-500 mt-1">{ri.specs}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-700 font-medium">{ri.quantity}</td>
                                <td className="px-6 py-4 text-right text-gray-700 font-medium">₱{ri.unitCost.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-semibold text-gray-900">₱{ri.totalCost.toFixed(2)}</td>
                                <td className="px-6 py-4 text-gray-600 text-sm">{ri.date}</td>
                                <td className="px-6 py-4"></td>
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
            {ics?.links?.length > 3 && (
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-center items-center space-x-2">
                {ics.links.map((link, index) => (
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
    <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
      <DialogContent className="max-w-2xl rounded-xl border border-gray-200 shadow-2xl bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">Return Items</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Select items to return and specify whether they are for <span className="font-semibold text-gray-900">reissuance</span> or <span className="font-semibold text-gray-900">disposal</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Item Selection List */}
        {selectedRecord ? (
          (() => {
            const highItems = (selectedRecord.items || []).filter((it) => it.type === "high");
            const allItemsProcessed = highItems.every((it) => {
              const totalQty = Number(it.quantity ?? 0);
              const reissuedQty = Number(it.total_reissued_quantity ?? 0);
              const disposedQty = Number(it.total_disposed_quantity ?? 0);
              return reissuedQty + disposedQty >= totalQty;
            });

            return (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-2">
                {/* Select All */}
                {!allItemsProcessed && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <input
                      id="select-all-return"
                      type="checkbox"
                      checked={highItems
                        .filter((it) => {
                          const totalQty = Number(it.quantity ?? 0);
                          const reissuedQty = Number(it.total_reissued_quantity ?? 0);
                          const disposedQty = Number(it.total_disposed_quantity ?? 0);
                          return reissuedQty + disposedQty < totalQty;
                        })
                        .every((it) => selectedItems.includes(it.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const unprocessedIds = highItems
                            .filter((it) => {
                              const totalQty = Number(it.quantity ?? 0);
                              const reissuedQty = Number(it.total_reissued_quantity ?? 0);
                              const disposedQty = Number(it.total_disposed_quantity ?? 0);
                              return reissuedQty + disposedQty < totalQty;
                            })
                            .map((it) => it.id);
                          setSelectedItems((prev) => [...new Set([...prev, ...unprocessedIds])]);
                        } else {
                          const idsToRemove = highItems.map((it) => it.id);
                          setSelectedItems((prev) => prev.filter((id) => !idsToRemove.includes(id)));
                        }
                      }}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <label htmlFor="select-all-return" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                      Select all
                    </label>
                  </div>
                )}

                {/* All items already processed */}
                {allItemsProcessed ? (
                  <div className="p-4 text-center text-gray-600 text-sm bg-gray-50 rounded-lg border border-gray-200">
                    All items in this issuance have already been <span className="font-semibold text-blue-600">reissued</span> or <span className="font-semibold text-rose-600">disposed</span>.
                  </div>
                ) : (
                  highItems.map((item) => {
                    const itemName = item.inventoryItem?.product?.name ?? item.inventory_item?.item_desc ?? "N/A";
                    const itemSpecs = item.inventoryItem?.product?.specs ?? "";
                    const totalQty = Number(item.quantity ?? 0);
                    const reissuedQty = Number(item.total_reissued_quantity ?? 0);
                    const disposedQty = Number(item.total_disposed_quantity ?? 0);
                    const totalProcessed = reissuedQty + disposedQty;
                    const remainingQty = Math.max(totalQty - totalProcessed, 0);
                    const fullyProcessed = totalProcessed >= totalQty;

                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-150 cursor-pointer ${
                          selectedItems.includes(item.id)
                            ? "bg-blue-50 border-blue-300 shadow-sm"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                        } ${fullyProcessed ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          disabled={fullyProcessed}
                          onChange={(e) => {
                            if (fullyProcessed) return;
                            setSelectedItems((prev) =>
                              e.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id)
                            );
                          }}
                          className="mt-1 h-5 w-5 accent-blue-600 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <div className="font-semibold text-gray-900">{itemName}</div>
                            {fullyProcessed ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300 whitespace-nowrap">
                                Fully processed
                              </span>
                            ) : totalProcessed > 0 ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-300 whitespace-nowrap">
                                Partially returned
                              </span>
                            ) : null}
                          </div>
                          {itemSpecs && (
                            <div className="text-gray-600 text-sm mt-1">{itemSpecs}</div>
                          )}
                          <div className="text-gray-600 text-xs mt-2 space-x-4">
                            <span>Qty: <span className="font-medium">{totalQty}</span></span>
                            <span>Price: <span className="font-medium">₱{Number(item.unit_cost ?? 0).toFixed(2)}</span></span>
                          </div>
                          {(reissuedQty > 0 || disposedQty > 0) && (
                            <div className="text-xs text-gray-600 mt-2">
                              Returned: <span className="text-blue-600 font-medium">{reissuedQty} reissued</span> | <span className="text-rose-600 font-medium">{disposedQty} disposed</span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-gray-600 text-sm mt-4 italic">No items available.</p>
        )}

        {/* Return Type */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="font-semibold text-gray-900 mb-3">Return Type</div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 rounded-lg transition-all ${returnType === "reissuance" ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <input
                type="radio"
                name="returnType"
                value="reissuance"
                checked={returnType === "reissuance"}
                onChange={(e) => setReturnType(e.target.value)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">For Reissuance</span>
            </label>

            <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 rounded-lg transition-all ${returnType === "disposal" ? "border-rose-400 bg-rose-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <input
                type="radio"
                name="returnType"
                value="disposal"
                checked={returnType === "disposal"}
                onChange={(e) => setReturnType(e.target.value)}
                className="h-4 w-4 accent-rose-600"
              />
              <span className="text-sm font-medium text-gray-700">For Disposal</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="pt-6 border-t border-gray-200 mt-4 flex gap-3 justify-end">
          <Button
            variant="outline"
            className="px-6 py-2 rounded-lg"
            onClick={() => {
              setShowReturnModal(false);
              setSelectedItems([]);
              setReturnType("");
              setSelectedRecord(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${
              returnType === "disposal"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={!selectedItems.length || !returnType}
            onClick={() => {
              const routeName =
                returnType === "reissuance"
                  ? "supply_officer.return_form"
                  : "supply_officer.disposal_form";

              router.visit(
                route(routeName, {
                  id: selectedRecord.id,
                  type: "ics",
                  items: selectedItems.join(","),
                })
              );

              setShowReturnModal(false);
            }}
          >
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
      <DialogContent className="max-w-2xl rounded-xl border border-gray-200 shadow-2xl bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">Switch Item Type</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Select the items you want to switch to <span className="font-semibold text-gray-900">Low Value</span> type. This helps categorize items for better tracking and reporting.
          </DialogDescription>
        </DialogHeader>

        {/* Item Selection List */}
        {switchRecord ? (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto pr-2">
            {(switchRecord.items || []).filter((it) => it.type === "high").length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No items available for switching.</p>
              </div>
            ) : (
              (switchRecord.items || [])
                .filter((it) => it.type === "high")
                .map((item) => {
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
              router.visit(route('supply_officer.switch_type', {
                type: 'ics',
                id: switchRecord.id,
                po_id: switchRecord.po?.id,
                items: switchItems,
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
