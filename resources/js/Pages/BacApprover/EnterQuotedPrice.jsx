import { useState, useEffect } from "react";
import {
  ScrollText,
  FilePlus2,
  CheckCircle2,
  Save,
  Trash2,
  Package,
  Users,
  Building2,
  Calendar,
  User,
  ArrowLeft,
  Plus,
  Search,
  X,
  Tag,
  MapPin,
  DollarSign,
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@headlessui/react";
import axios from "axios";
import Swal from "sweetalert2";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";

export default function EnterQuotedPrices({ pr, suppliers, rfqs, purchaseRequest, rfq_details }) {
  const { toast } = useToast();
  const [selectedSuppliersByItem, setSelectedSuppliersByItem] = useState({});
  const [entirePRSupplier, setEntirePRSupplier] = useState(null);
  const [supplierList, setSupplierList] = useState(suppliers ?? []);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", message: "", type: "success" });
  const [onConfirmAction, setOnConfirmAction] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [quotedPrices, setQuotedPrices] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    representative_name: "",
    company_name: "",
    address: "",
    tin_num: "",
  });
  const [estimatedPrice, setEstimatedPrice] = useState(() => {
    const initial = {};
    if (pr.details) {
      pr.details.forEach(detail => {
        initial[detail.id] = detail.unit_price || "";
      });
    }
    return initial;
  });
  const { data, setData } = useForm({
    pr_id: pr.id,
    user_id: purchaseRequest?.focal_person?.id ?? null,
    supplier_id: '',
    selections: []
  });
  const [editingQuotes, setEditingQuotes] = useState({});
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);
  const { flash } = usePage().props;

  // Calculate progress
  const totalItems = pr.details?.length || 0;
  const submittedCount = rfq_details?.length || 0;
  const progressPercentage = totalItems > 0 ? Math.round((submittedCount / totalItems) * 100) : 0;

  useEffect(() => {
    if (rfq_details && rfq_details.length > 0) {
      const initialSelected = {};
      rfq_details.forEach(rfq => {
        if (!initialSelected[rfq.pr_details_id]) {
          initialSelected[rfq.pr_details_id] = [];
        }
        if (!initialSelected[rfq.pr_details_id].includes(rfq.supplier_id)) {
          initialSelected[rfq.pr_details_id].push(rfq.supplier_id);
        }
      });
      setSelectedSuppliersByItem(initialSelected);
    }
  }, [rfq_details]);

  const showDialog = ({ title, message, type, onConfirm = null }) => {
    setDialogContent({ title, message, type });
    setOnConfirmAction(() => onConfirm);
    setDialogOpen(true);
  };

  const confirmSubmit = (e, detailId, supplierId, currentQuotedPrice) => {
    e.preventDefault();
    const currentQuotedPriceValue = currentQuotedPrice === "" ? null : currentQuotedPrice;
    showDialog({
      title: "Confirm Submission",
      message: "Are you sure you want to submit this quoted price?",
      type: "confirm",
      onConfirm: () => handleSubmit(detailId, supplierId, currentQuotedPriceValue),
    });
  };

  const getQuotedPrice = (detailId, supplierId) => {
    const quoted = rfq_details.find(
      (q) => q.pr_details_id === detailId && q.supplier_id === supplierId
    );
    return quoted?.quoted_price ?? null;
  };

  const handleSubmit = (detailId, supplierId, quoted_price_to_submit, editingKey = null) => {
    const final_quoted_price = quoted_price_to_submit === "" ? null : quoted_price_to_submit;
    const payload = {
      pr_id: pr.id,
      pr_details_id: detailId,
      supplier_id: supplierId,
      quoted_price: final_quoted_price,
    };
    const submittingKey = editingKey || `${detailId}-${supplierId}`;
    setSubmittingId(submittingKey);

    router.post(route("bac_user.submit_quoted"), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSubmittingId(null);
        if (editingKey) {
          setEditingQuotes((prev) => {
            const next = { ...prev };
            delete next[editingKey];
            return next;
          });
        }
        showDialog({
          title: "Submitted!",
          message: "Quoted price submitted successfully.",
          type: "success",
        });
      },
      onError: (errors) => {
        setSubmittingId(null);
        showDialog({
          title: "Oops!",
          message: errors?.quoted_price || "Something went wrong while submitting.",
          type: "error",
        });
      },
    });
  };

  const confirmSubmitAll = () => {
    showDialog({
      title: "Confirm Bulk Submission",
      message: "Are you sure you want to submit all quoted prices?",
      type: "confirm",
      onConfirm: () => handleSubmitAll(),
    });
  };

  const handleSubmitAll = () => {
    if (!entirePRSupplier) return;
    const entries = pr.details
      .map((detail) => {
        const uniqueId = `${detail.id}-${entirePRSupplier}`;
        const quotedPrice = quotedPrices[uniqueId];
        const final_quoted_price = quotedPrice === "" ? null : quotedPrice;
        if (quotedPrice !== undefined) {
          return {
            pr_id: pr.id,
            pr_details_id: detail.id,
            supplier_id: entirePRSupplier,
            quoted_price: final_quoted_price,
          };
        }
        return null;
      })
      .filter((entry) => entry !== null);

    if (entries.length === 0) {
      showDialog({
        title: "No Prices to Submit",
        message: "Please enter at least one quoted price before submitting all.",
        type: "warning",
      });
      return;
    }

    setSubmittingId("all");
    router.post(
      route("bac_user.submit_bulk_quoted"),
      { quotes: entries },
      {
        preserveScroll: true,
        onSuccess: () => {
          setQuotedPrices((prev) => {
            const updated = { ...prev };
            entries.forEach((entry) => {
              delete updated[`${entry.pr_details_id}-${entry.supplier_id}`];
            });
            return updated;
          });
          setSubmittingId(null);
          showDialog({
            title: "All Quoted Prices Submitted!",
            message: "All prices for this supplier have been submitted successfully.",
            type: "success",
          });
        },
        onError: (errors) => {
          setSubmittingId(null);
          showDialog({
            title: "Oops!",
            message: errors?.quoted_price || "Something went wrong while submitting all prices.",
            type: "error",
          });
        },
      }
    );
  };

  const addSelection = (itemId, supplierId, estimatedBid) => {
    setData(prevData => {
      const filtered = (prevData.selections || []).filter(
        s => !(s.pr_detail_id === itemId && s.supplier_id === supplierId)
      );
      return {
        ...prevData,
        selections: [...filtered, { pr_detail_id: itemId, supplier_id: supplierId, estimated_bid: estimatedBid }],
      };
    });
  };

  const openModalForItem = (itemId) => {
    setSelectedItemId(itemId);
    setShowModal(true);
    const selectedItem = pr.details.find(d => d.id === itemId);
    if (selectedItem) {
      const unitPrice = selectedItem.unit_price || "";
      setEstimatedPrice(prev => ({ ...prev, [itemId]: unitPrice }));
      setData(prev => ({ ...prev, estimated_bid: unitPrice }));
    }
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(route("bac_user.store_supplier"), newSupplier);
      const createdSupplier = response.data.supplier;
      setSupplierList(prev => [...prev, createdSupplier]);
      setSelectedSupplierId(String(createdSupplier.id));
      const newSupplierId = createdSupplier.id;
      const priceValue = selectedItemId === null ? "" : (estimatedPrice[selectedItemId] || "");
      const initialBid = priceValue.toString().trim() || (pr.details?.find(d => d.id === selectedItemId)?.unit_price || "");

      if (selectedItemId !== null) {
        addSelection(selectedItemId, newSupplierId, initialBid);
      } else {
        pr.details.forEach(detail => {
          const bid = detail.unit_price || "";
          addSelection(detail.id, newSupplierId, bid);
        });
      }

      setNewSupplier({
        company_name: "",
        address: "",
        tin_num: "",
        representative_name: "",
      });

      setShowAddSupplierModal(false);
      setShowModal(false);
    } catch (error) {
      if (error.response) {
        console.error("Server error:", error.response.data);
      } else {
        console.error("Error adding supplier:", error.message);
      }
      Swal.fire("Error", "Failed to add supplier. Please try again.", "error");
    }
  };

  const selectedItem = selectedItemId && pr.details?.length
    ? pr.details.find(d => d.id === selectedItemId)
    : null;

  const filteredSuppliers = supplierList
    .filter(supplier => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        supplier.representative_name?.toLowerCase().includes(q) ||
        supplier.company_name?.toLowerCase().includes(q) ||
        supplier.address?.toLowerCase().includes(q)
      );
    })
    .filter(supplier => {
      return !rfq_details.some(
        (q) => q.pr_details_id === selectedItemId && q.supplier_id === supplier.id
      );
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirst, indexOfLast);

  const handleDeleteQuote = (detailId, supplierId, uniqueId) => {
    setSubmittingId(uniqueId);
    router.delete(route("bac_user.delete_quoted"), {
      data: {
        pr_id: pr.id,
        pr_details_id: detailId,
        supplier_id: supplierId,
      },
      preserveScroll: true,
      onSuccess: () => {
        setSubmittingId(null);
        setQuotedPrices((prev) => {
          const next = { ...prev };
          delete next[uniqueId];
          return next;
        });
        setEditingQuotes((prev) => {
          const next = { ...prev };
          delete next[uniqueId];
          return next;
        });
        setSelectedSuppliersByItem((prev) => {
          const updated = { ...prev };
          if (Array.isArray(updated[detailId])) {
            updated[detailId] = updated[detailId].filter((id) => id !== supplierId);
            if (updated[detailId].length === 0) {
              delete updated[detailId];
            }
          }
          return updated;
        });
        toast({
          title: "Deleted",
          description: "Quoted price removed successfully.",
          variant: "default",
          setTimeout: 3000
        });
        showDialog({
          open: true,
          title: "Deleted!",
          description: "The quoted price was removed successfully.",
        });
      },
      onFinish: () => {
        setSubmittingId(null);
        if (flash?.message) {
          toast({
            title: flash.status === "success" ? "Deleted" : "Error",
            description: flash.message,
            variant: flash.status === "success" ? "default" : "destructive",
            setTimeout: 3000
          });
        }
      },
      onError: () => {
        setSubmittingId(null);
        toast({
          title: "Error",
          description: "Could not delete quoted price.",
          variant: "destructive",
          setTimeout: 3000
        });
      },
    });
  };

  return (
    <ApproverLayout>
      <Head title="Enter Quoted Prices" />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <a
                  href={route("bac_user.for_quotations")}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </a>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    Enter Quoted Prices
                  </h1>
                  <p className="text-sm text-slate-500">PR: {pr.pr_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Supplier</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Progress</span>
              <span className="text-sm font-bold text-indigo-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {submittedCount} of {totalItems} items have quoted prices
            </p>
          </div>
        </div>

        {/* PR Info Cards - Horizontal */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs text-slate-500">PR Number</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{pr.pr_number}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500">Division</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{pr.division}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-slate-500">Requested By</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{pr.requester_name}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-500">Focal Person</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{purchaseRequest?.focal_person?.firstname}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-slate-500">Created</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{new Date(pr.created_at).toLocaleDateString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-rose-500" />
                  <span className="text-xs text-slate-500">Items</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{pr.details?.length || 0}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Purpose</p>
              <p className="text-sm text-slate-700">{pr.purpose}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pr.details.map(detail => {
              const itemSuppliers = selectedSuppliersByItem[detail.id] || [];
              const hasQuotes = itemSuppliers.length > 0;
              const hasSubmittedQuotes = itemSuppliers.some(sid => getQuotedPrice(detail.id, sid) !== null);
              
              return (
                <div 
                  key={detail.id} 
                  className={`bg-white rounded-xl border-2 transition-all duration-200 ${
                    hasSubmittedQuotes 
                      ? 'border-green-200 shadow-sm' 
                      : hasQuotes 
                        ? 'border-amber-200 shadow-sm'
                        : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 rounded-t-lg flex items-center justify-between ${
                    hasSubmittedQuotes 
                      ? 'bg-green-50' 
                      : hasQuotes 
                        ? 'bg-amber-50'
                        : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Package className={`w-5 h-5 ${hasSubmittedQuotes ? 'text-green-600' : hasQuotes ? 'text-amber-600' : 'text-slate-500'}`} />
                      <span className="text-xs font-medium text-slate-500">Item</span>
                    </div>
                    {hasSubmittedQuotes && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Complete
                      </span>
                    )}
                    {hasQuotes && !hasSubmittedQuotes && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2">{detail.item}</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{detail.specs}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{detail.unit}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Qty: {detail.quantity}</span>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-indigo-600 mb-1">Estimated Price</p>
                      <p className="text-lg font-bold text-indigo-700">₱{Number(detail.unit_price || 0).toLocaleString()}</p>
                    </div>

                    {/* Suppliers List */}
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-slate-500">Suppliers ({itemSuppliers.length})</p>
                      {itemSuppliers.length > 0 ? (
                        itemSuppliers.map((supplierId) => {
                          const supplier = supplierList.find((s) => s.id === supplierId);
                          if (!supplier) return null;
                          const uniqueId = `${detail.id}-${supplierId}`;
                          const isSubmitting = submittingId === uniqueId;
                          const quoted = getQuotedPrice(detail.id, supplierId);
                          const alreadySubmitted = quoted !== null;

                          const handleInputChange = (e) => {
                            let value = parseFloat(e.target.value);
                            if (isNaN(value)) value = "";
                            setQuotedPrices((prev) => ({ ...prev, [uniqueId]: value }));
                          };

                          return (
                            <div key={uniqueId} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800 truncate">{supplier.representative_name}</p>
                                  <p className="text-xs text-slate-500 truncate">{supplier.company_name}</p>
                                </div>
                                {alreadySubmitted && !editingQuotes[uniqueId] && (
                                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                                    Submitted
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                  <p className="absolute left-2 top-4 -translate-y-1/2 w-5 h-5 text-slate-400">₱</p>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter price"
                                    disabled={alreadySubmitted && !editingQuotes[uniqueId]}
                                    value={
                                      alreadySubmitted && !editingQuotes[uniqueId]
                                        ? parseFloat(quoted).toFixed(2)
                                        : quotedPrices[uniqueId] || ""
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={handleInputChange}
                                    className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border ${
                                      alreadySubmitted && !editingQuotes[uniqueId]
                                        ? 'bg-white border-slate-200 text-slate-500'
                                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                                    }`}
                                  />
                                </div>
                                <div className="flex gap-1">
                                  {alreadySubmitted && !editingQuotes[uniqueId] ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingQuotes((prev) => ({ ...prev, [uniqueId]: true }));
                                          setQuotedPrices((prev) => ({ ...prev, [uniqueId]: quoted }));
                                        }}
                                        className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                                        title="Edit"
                                      >
                                        <PencilSquareIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                          showDialog({
                                            title: "Confirm Delete",
                                            message: "Are you sure you want to delete this quoted price?",
                                            type: "confirm",
                                            onConfirm: () => handleDeleteQuote(detail.id, supplierId, uniqueId),
                                          });
                                        }}
                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : alreadySubmitted ? (
                                    <button
                                      type="button"
                                      disabled={isSubmitting}
                                      onClick={() => handleSubmit(detail.id, supplierId, quotedPrices[uniqueId] ?? "", uniqueId)}
                                      className={`p-2 rounded-lg ${
                                        isSubmitting ? "bg-slate-400" : "bg-green-600 hover:bg-green-700"
                                      } text-white`}
                                      title="Save"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="submit"
                                      disabled={isSubmitting}
                                      onClick={(e) => confirmSubmit(e, detail.id, supplierId, quotedPrices[uniqueId] ?? "")}
                                      className={`p-2 rounded-lg ${
                                        isSubmitting ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700"
                                      } text-white`}
                                      title="Submit"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">No suppliers added yet</p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => openModalForItem(detail.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      {itemSuppliers.length > 0 ? 'Manage Suppliers' : 'Add Supplier'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk Submit */}
          {entirePRSupplier && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={confirmSubmitAll}
                disabled={submittingId === "all"}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-all ${
                  submittingId === "all"
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 shadow-lg"
                }`}
              >
                {submittingId === "all" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Submit All Quotes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-indigo-600 px-6 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Select Supplier
                  </h2>
                  {selectedItem && (
                    <p className="text-indigo-200 text-sm mt-1">Item: {selectedItem.item}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, or address..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Representative</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">TIN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentSuppliers.length > 0 ? (
                      currentSuppliers.map((supplier) => {
                        const isDisabled = rfq_details.some(
                          (q) => q.pr_details_id === selectedItemId && q.supplier_id === supplier.id
                        );
                        return (
                          <tr key={supplier.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{supplier.representative_name}</td>
                            <td className="px-4 py-3 text-slate-700">{supplier.company_name}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{supplier.address}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{supplier.tin_num}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  disabled={isDisabled}
                                  onClick={() => {
                                    const priceValue = selectedItemId === null ? "" : estimatedPrice[selectedItemId] || "";
                                    const finalBid = priceValue.toString().trim() || (pr.details?.find((d) => d.id === selectedItemId)?.unit_price || "");
                                    addSelection(selectedItemId, supplier.id, finalBid);
                                    setEstimatedPrice((prev) => ({ ...prev, [selectedItemId]: finalBid }));
                                    setSelectedSuppliersByItem((prev) => {
                                      const current = prev[selectedItemId] || [];
                                      if (current.includes(supplier.id)) return prev;
                                      return { ...prev, [selectedItemId]: [...current, supplier.id] };
                                    });
                                    setSelectedSupplierId(String(supplier.id));
                                    setShowModal(false);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                                >
                                  Select
                                </button>
                                <button
                                  onClick={() => {
                                    const updatedSelectedSuppliers = { ...selectedSuppliersByItem };
                                    const updatedPrices = { ...estimatedPrice };
                                    const skipped = [];
                                    pr.details.forEach((detail) => {
                                      const alreadyQuoted = rfq_details.some(
                                        (q) => q.pr_details_id === detail.id && q.supplier_id === supplier.id
                                      );
                                      if (alreadyQuoted) {
                                        skipped.push(detail.item_description || `Item #${detail.id}`);
                                      } else {
                                        const price = detail.unit_price || "";
                                        updatedPrices[detail.id] = price;
                                        addSelection(detail.id, supplier.id, price);
                                        const current = updatedSelectedSuppliers[detail.id] || [];
                                        if (!current.includes(supplier.id)) {
                                          updatedSelectedSuppliers[detail.id] = [...current, supplier.id];
                                        }
                                      }
                                    });
                                    setEstimatedPrice(updatedPrices);
                                    setSelectedSuppliersByItem(updatedSelectedSuppliers);
                                    setSelectedSupplierId(String(supplier.id));
                                    setEntirePRSupplier(supplier.id);
                                    setShowModal(false);
                                    if (skipped.length > 0) {
                                      setSkippedItems(skipped);
                                      setWarningDialogOpen(true);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
                                >
                                  Apply All
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-slate-400">
                          No suppliers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Add New Supplier
                </h3>
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Representative Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.representative_name}
                  onChange={e => setNewSupplier(prev => ({ ...prev, representative_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter representative name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.company_name}
                  onChange={e => setNewSupplier(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newSupplier.address}
                    onChange={e => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-10 border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter address"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TIN Number *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.tin_num}
                  onChange={e => setNewSupplier(prev => ({ ...prev, tin_num: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter TIN number"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={
              dialogContent.type === "error" ? "text-red-600" :
              dialogContent.type === "success" ? "text-green-600" : 
              dialogContent.type === "warning" ? "text-amber-600" : ""
            }>
              {dialogContent.title}
            </DialogTitle>
            <DialogDescription>
              {dialogContent.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {dialogContent.type === "confirm" ? (
              <>
                <Button
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"
                  onClick={() => {
                    setDialogOpen(false);
                    setOnConfirmAction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => {
                    if (typeof onConfirmAction === "function") {
                      onConfirmAction();
                    }
                    setDialogOpen(false);
                    setOnConfirmAction(null);
                  }}
                >
                  Confirm
                </Button>
              </>
            ) : (
              <Button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                onClick={() => setDialogOpen(false)}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Some Items Skipped
            </DialogTitle>
            <DialogDescription>
              This supplier already quoted for some items, so they were skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => setWarningDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ApproverLayout>
  );
}