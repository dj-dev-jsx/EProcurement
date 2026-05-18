import { useForm } from "@inertiajs/react";
import { 
  FileText, SendHorizonal, Package, 
  User, Building2, ClipboardList, CheckCircle2, 
  AlertCircle, ChevronDown, ChevronUp, Save,
  Calculator, Calendar, Users, AlertTriangle, Box,
  MapPin, School, Tag, Hash, Clock
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AutoCompleteInput from "./AutoCompleteInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ICSForm({ purchaseOrder, inventoryItems = [], user, ppeOptions = [], icsNumber }) {
  const pr = purchaseOrder?.detail?.pr_detail?.purchase_request ?? null;
  const focal = pr
    ? `${pr?.focal_person?.firstname ?? ""} ${pr?.focal_person?.middlename ?? ""} ${pr?.focal_person?.lastname ?? ""}`.trim()
    : "N/A";

  const { data, setData, post, processing, errors } = useForm({
    po_id: purchaseOrder?.id ?? null,
    ics_number: icsNumber ?? "",
    requested_by: pr?.focal_person?.id ?? null,
    received_from: user?.id ?? null,
    remarks: "",
    items: inventoryItems.map(item => ({
      inventory_item_id: item.id,
      recipient: "",
      recipient_division: "",
      estimated_useful_life: null,
      inventory_item_number: "",
      ppe_sub_major_account: "",
      general_ledger_account: "",
      office: "",
      school: "",
      quantity: item.total_stock > 0 ? 1 : 0,
      unit_cost: item.unit_cost ?? 0,
      total_cost: item.unit_cost ?? 0,
      total_stock: item.total_stock ?? 0,
      series_number: "0001",
      description: item.item_desc ?? item.product?.item_description ?? "N/A",
      ppe: null,
      gl: null,
      officeObj: null,
      schoolObj: null
    })),
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const { toast } = useToast();
  const [defaultRecipient, setDefaultRecipient] = useState("");
  const [defaultDivision, setDefaultDivision] = useState("");

  // Calculate totals
  const totals = data.items.reduce((acc, item) => ({
    quantity: acc.quantity + (parseFloat(item.quantity) || 0),
    cost: acc.cost + (parseFloat(item.total_cost) || 0),
  }), { quantity: 0, cost: 0 });

  // Set ICS number if passed
  useEffect(() => {
    if (icsNumber && !data.ics_number) setData("ics_number", icsNumber);
  }, [icsNumber]);

  // Initialize all items as expanded
  useEffect(() => {
    const initial = {};
    data.items.forEach((_, idx) => { initial[idx] = true; });
    setExpandedItems(initial);
  }, []);

  const toggleItem = (index) => {
    setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...data.items];
    if (field === "quantity") {
      let qty = parseFloat(value) || 0;
      if (qty > updatedItems[index].total_stock) qty = updatedItems[index].total_stock;
      if (qty < 0) qty = 0;
      updatedItems[index].quantity = qty;
      updatedItems[index].total_cost = qty * (updatedItems[index].unit_cost ?? 0);
    } else {
      updatedItems[index][field] = value;
    }
    setData("items", updatedItems);
  };

  const handleRemoveItem = index => {
    const updatedItems = data.items.filter((_, i) => i !== index);
    setData("items", updatedItems);
    const newExpanded = {};
    updatedItems.forEach((_, i) => { newExpanded[i] = true; });
    setExpandedItems(newExpanded);
  };

  // --- Generate inventory number for a single item ---
  const generateNumberForItem = async () => {
  const itemsToGenerate = data.items.filter(item => item.ppe && item.gl && item.quantity > 0);
  if (!itemsToGenerate.length) return;

  try {
    const firstItem = itemsToGenerate[0];
    const res = await fetch(
      `/api/ics-next-series?ppe=${encodeURIComponent(firstItem.ppe.name.trim())}&gl=${encodeURIComponent(firstItem.gl.name.trim())}`
    );
    const api = await res.json();
    let nextSeries = parseInt(api.series || "0", 10);

    const updatedItems = [...data.items];
    itemsToGenerate.forEach(item => {
      const seriesCode = nextSeries.toString().padStart(4, "0");
      const year = new Date().getFullYear().toString();
      const ppeCode = item.ppe.code?.padStart(2, "0") || "00";
      const glCode = item.gl.code?.padStart(2, "0") || "00";
      const locationCode = item.officeObj?.code?.padStart(2, "0") || "";
      const schoolCode = item.officeObj?.name === "Schools" && item.schoolObj?.code ? item.schoolObj.code.padStart(2, "0") : "";

      const inventoryNumber = [year, ppeCode, glCode, seriesCode, locationCode]
        .filter(Boolean)
        .concat(schoolCode ? [schoolCode] : [])
        .join("-");

      const index = updatedItems.findIndex(i => i === item);
      updatedItems[index] = {
        ...item,
        inventory_item_number: inventoryNumber,
        series_number: seriesCode,
        ppe_sub_major_account: item.ppe.name,
        general_ledger_account: item.gl.name,
        office: item.officeObj?.name || "",
        school: item.schoolObj?.name || ""
      };
      nextSeries++;
    });
    setData("items", updatedItems);
  } catch (err) {
    console.error("Error generating inventory numbers", err);
  }
};

  const handleItemPPEChange = (index, selectedPPE) => {
    const updatedItems = [...data.items];
    updatedItems[index].ppe = selectedPPE;
    updatedItems[index].gl = null;
    updatedItems[index].ppe_sub_major_account = selectedPPE?.name || "";
    updatedItems[index].general_ledger_account = "";
    setData("items", updatedItems);
  };

  const handleItemGLChange = (index, selectedGL) => {
    const updatedItems = [...data.items];
    updatedItems[index].gl = selectedGL;
    updatedItems[index].general_ledger_account = selectedGL?.name || "";
    setData("items", updatedItems);
    generateNumberForItem(index, updatedItems[index]);
  };

  const handleItemOfficeChange = (index, selectedOffice) => {
    const updatedItems = [...data.items];
    updatedItems[index].officeObj = selectedOffice;
    updatedItems[index].office = selectedOffice?.name || "";
    setData("items", updatedItems);
    generateNumberForItem(index, updatedItems[index]);
  };

  const handleItemSchoolChange = (index, selectedSchool) => {
    const updatedItems = [...data.items];
    updatedItems[index].schoolObj = selectedSchool;
    updatedItems[index].school = selectedSchool?.name || "";
    setData("items", updatedItems);
    generateNumberForItem(index, updatedItems[index]);
  };

  const handleSubmit = e => {
    e.preventDefault();
    setConfirmDialogOpen(true);
  };

  const handleConfirmSave = () => {
    post(route("supply_officer.store_ics"), {
      preserveScroll: true,
      onSuccess: () => {
        setConfirmDialogOpen(false);
        toast({ title: "ICS Recorded", description: "Inventory Custodian Slip successfully saved!", className: "bg-green-600 text-white", duration: 3000 });
      },
      onError: () => {
        toast({ title: "Save Failed", description: "Please review inputs and try again.", variant: "destructive", duration: 4000 });
      },
    });
  };

  const isCentral = inventoryItems.some((item) => item.source_type === "central");

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Inventory Custodian Slip (ICS)</h2>
            <p className="text-violet-100 text-sm">Record and manage property issuances</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-red-700">Validation Errors</h4>
              <ul className="mt-2 space-y-1">
                {Object.entries(errors).map(([key, message]) => <li key={key} className="text-sm text-red-600">• {message}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ICS Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <ClipboardList size={20} className="text-violet-600" />
            <h3 className="text-lg font-semibold text-gray-900">ICS Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Building2 size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{pr?.division?.division ?? "N/A"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">ICS Number</label>
                <div className="relative">
                  <input type="text" value={data.ics_number} onChange={e => setData("ics_number", e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" placeholder="Enter ICS number" />
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <User size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{focal}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Calendar size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString('en-PH')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Items to Issue</h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                {data.items.length} item{data.items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {data.items.map((item, index) => (
              <div key={index} className="group">
                {/* Item Header */}
                <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleItem(index)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${expandedItems[index] ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md">
                          <Box size={12} /> Stock: {item.total_stock}
                        </span>
                        <span className="text-xs text-gray-400">Max issuable: {item.total_stock}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₱{parseFloat(item.total_cost || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{item.quantity} qty</p>
                    </div>
                    {expandedItems[index] ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Item Details - Expandable */}
                {expandedItems[index] && (
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                    {/* PPE / GL / Office / School / Inventory Number */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">PPE Sub-major Account</label>
                        <select value={item.ppe?.id || ""} onChange={e => handleItemPPEChange(index, ppeOptions.find(p => p.id == e.target.value))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all">
                          <option value="">Select PPE</option>
                          {ppeOptions.map(p => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ${p.name}` : p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">General Ledger Account</label>
                        <select value={item.gl?.id || ""} onChange={e => handleItemGLChange(index, item.ppe?.general_ledger_accounts.find(g => g.id == e.target.value))} disabled={!item.ppe} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:bg-gray-100">
                          <option value="">Select GL</option>
                          {item.ppe?.general_ledger_accounts?.map(g => <option key={g.id} value={g.id}>{g.code ? `${g.code} - ${g.name}` : g.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location Office</label>
                        <AutoCompleteInput label="" apiRoute="/api/office-search" value={item.officeObj?.code || ""} onChange={val => handleItemOfficeChange(index, val)} placeholder="Type Location Office..." />
                      </div>
                      {item.officeObj?.name === "Schools" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">School</label>
                          <AutoCompleteInput label="" apiRoute="/api/school-search" value={item.schoolObj?.name || ""} onChange={val => handleItemSchoolChange(index, val)} placeholder="Type School..." />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Item No.</label>
                        <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-200">
                          <span className="text-sm font-mono text-gray-600">{item.inventory_item_number || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity / Cost / Estimated Life */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</label>
                        <div className="relative">
                          <input type="number" min="0" max={item.total_stock} value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
                          <Calculator size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <p className="text-xs text-emerald-600 font-medium">Available: {item.total_stock} units</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</label>
                        <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-200">
                          <span className="text-sm font-medium text-gray-600">₱ {parseFloat(item.unit_cost || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</label>
                        <div className="p-2.5 bg-violet-50 rounded-xl border border-violet-200">
                          <span className="text-sm font-bold text-violet-700">₱ {parseFloat(item.total_cost || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Useful Life (years)</label>
                      <div className="relative">
                        <input type="number" value={item.estimated_useful_life ?? ""} onChange={e => handleItemChange(index, "estimated_useful_life", e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" onWheel={e => e.currentTarget.blur()} required />
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Remove Button */}
                    {data.items.length > 1 && (
                      <div className="mt-4 flex justify-end">
                        <button type="button" onClick={() => handleRemoveItem(index)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 text-sm hover:bg-red-50 rounded-lg transition-colors">
                          Remove Item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Total Items:</span>
              <span className="text-sm font-semibold text-gray-900">{data.items.length}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Quantity</p>
                <p className="text-lg font-bold text-gray-900">{totals.quantity}</p>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-lg font-bold text-violet-600">₱ {totals.cost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Default Recipient */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Users size={20} className="text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recipient Details</h3>
            {isCentral && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg">
                <AlertTriangle size={12} /> Required for Central
              </span>
            )}
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">These values will be applied to all items above</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient Name {isCentral && <span className="text-red-500"> *</span>}</label>
                <div className="relative">
                  <input type="text" value={defaultRecipient} onChange={e => { setDefaultRecipient(e.target.value); setData("items", data.items.map(i => ({ ...i, recipient: e.target.value }))); }} placeholder="Leave blank to issue to requester" className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" required={isCentral} />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient Division {isCentral && <span className="text-red-500"> *</span>}</label>
                <div className="relative">
                  <input type="text" value={defaultDivision} onChange={e => { setDefaultDivision(e.target.value); setData("items", data.items.map(i => ({ ...i, recipient_division: e.target.value }))); }} placeholder="Optional" className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" required={isCentral} />
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks (Optional)</label>
              <textarea value={data.remarks} onChange={e => setData("remarks", e.target.value)} rows="3" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none" placeholder="Add any additional notes or comments..." />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => window.history.back()} className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-medium rounded-xl hover:from-violet-700 hover:to-violet-800 transition-all shadow-lg shadow-violet-500/30" disabled={processing}>
            {processing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>) : (<><Save size={18} /> Submit ICS</>)}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-violet-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Confirm Issuance</DialogTitle>
            <DialogDescription className="text-center">Are you sure you want to record this ICS issuance? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 rounded-xl p-4 my-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Items</p><p className="font-semibold text-gray-900">{data.items.length}</p></div>
              <div><p className="text-gray-500">Total Quantity</p><p className="font-semibold text-gray-900">{totals.quantity}</p></div>
              <div className="col-span-2"><p className="text-gray-500">Total Cost</p><p className="text-xl font-bold text-violet-600">₱ {totals.cost.toFixed(2)}</p></div>
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirmSave} className="flex-1 bg-violet-600 hover:bg-violet-700">Yes, Record ICS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
