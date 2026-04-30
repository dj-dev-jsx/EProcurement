import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head, router, useForm } from "@inertiajs/react";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AOQTabs from "@/Layouts/AOQTabs";
import { Undo2 } from "lucide-react";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";

export default function AbstractOfQuotations({ rfq, groupedDetails = {}, committee }) {
  const pr = rfq.purchase_request;

  const [remarks_as_read, setRemarks] = useState("");
  const [resultDialog, setResultDialog] = useState({
    open: false,
    type: "success", // "success" | "error"
    title: "",
    description: "",
  });

  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState(null);
  const [replacementName, setReplacementName] = useState("");
  const [awardMode, setAwardMode] = useState(rfq.award_mode ?? "whole-pr");

  // Initialize committee state from props
  const [committeeState, setCommitteeState] = useState(() => {
    const members = {};
    const positions = ["secretariat", "member1", "member2", "member3", "vice_chair", "chair"];

    positions.forEach((pos) => {
      const activeMember = committee?.members
        ?.filter((m) => m.position === pos)
        ?.find((m) => m.status === "active");

      members[pos] = {
        name: activeMember?.name || "",
        status: activeMember?.status || "inactive", // 👈 fallback is inactive
      };
    });

    return { status: committee?.status || "draft", members };
  });

  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [savingCommittee, setSavingCommittee] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [submissionType, setSubmissionType] = useState('as-read'); // default

  const handleOpenRollbackDialog = (rfqId, supplierId, detailId = null) => {
    setRollbackTarget({ rfqId, supplierId, detailId });
    setRemarks("");
    setRollbackDialogOpen(true);
  };

  const handleConfirmRollback = () => {
    setRollingBack(true);
    const payload = {
      remarks_as_read,
      mode: awardMode,
      ...(awardMode === "per-item" ? { detail_id: rollbackTarget.detailId } : {}),
    };

    router.post(route("bac_user.rollback_winner_as_read", { id: rollbackTarget.rfqId }), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setRollbackDialogOpen(false);
        setRollingBack(false);
        setResultDialog({
          open: true,
          type: "success",
          title: "Rollback Successful",
          description: "Winner selection has been rolled back.",
        });
        toast({
          title: "Rollback Successful",
          description: "Winner selection has been rolled back.",
          duration: 3000,
        });
      },
      onError: () => {
        setRollingBack(false);
        setResultDialog({
          open: true,
          type: "error",
          title: "Rollback Failed",
          description: "Unable to rollback winner. Please try again.",
        });
      },
    });
  };

  // --- Process supplier data ---
  const supplierMap = {};
  const winnerCounts = {};
  pr.details.forEach((detail) => {
    const quotesForItem = groupedDetails[detail.id] || [];
    quotesForItem.forEach((quote) => {
      const sid = quote.supplier.id;
      if (!supplierMap[sid]) {
        supplierMap[sid] = { supplier: quote.supplier, detailIds: new Set(), total: 0, quotes: [] };
        winnerCounts[sid] = 0;
      }
      supplierMap[sid].detailIds.add(detail.id);

      // --- Multiply by quantity safely ---
      const quantity = detail.quantity ?? 1; // fallback to 1 if undefined
      const price = parseFloat(quote.quoted_price ?? 0) || 0; // fallback to 0
      supplierMap[sid].total += price * quantity;

      supplierMap[sid].quotes.push(quote); // Store quotes for easy remark comparison
      if (quote.is_winner_as_read) winnerCounts[sid]++;
    });
  });

  const totalDetailsCount = pr.details.length;
  const fullBidSuppliers = Object.values(supplierMap).filter(
    (s) => s.detailIds.size === totalDetailsCount
  );

  const hasFullBidSuppliers = fullBidSuppliers.length > 0;

  // Ensure awardMode is valid
  useEffect(() => {
    if (!hasFullBidSuppliers && awardMode === "whole-pr") {
      setAwardMode("per-item");
    }
  }, [hasFullBidSuppliers, awardMode]);

  const hasAnyWinner = pr.details.some((detail) =>
    (groupedDetails[detail.id] || []).some((q) => q.is_winner_as_calculated)
  );

  

  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [remarksTarget, setRemarksTarget] = useState(null);
  // { rfqId, supplierId, detailId (nullable), currentRemarks }
  const [remarksInput, setRemarksInput] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);

  const handleSaveRemarks = () => {
    setSavingRemarks(true);
    const payload = {
      supplier_id: remarksTarget.supplierId,
      remarks_as_read: remarksInput,
      mode: awardMode,
      ...(remarksTarget.detailId !== null ? { detail_id: remarksTarget.detailId } : {}),
    };

    router.post(route("bac_user.save_remarks_as_read", { id: remarksTarget.rfqId }), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSavingRemarks(false);
        setRemarksDialogOpen(false);
        toast({
          title: "Remarks Saved",
          description: "Supplier remarks updated successfully.",
          duration: 3000,
        });
        router.reload({ only: ['rfq', 'groupedDetails'] });
      },
      onError: () => {
        setSavingRemarks(false);
        toast({
          title: "Save Failed",
          description: "Could not save remarks. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      },
    });
  };
    const handlePrintAOQ = (rfqId, detailId) =>
  window.open(route("bac_user.print_aoq", { id: rfqId, pr_detail_id: detailId }), "_blank");


  // Your existing forms...
  const mainForm = useForm({
    project_no: "",
    date_of_opening: "",
    venue: "",
  });

  // 🔹 NEW — separate form for project info submission
  const projectInfoForm = useForm({
    project_no:rfq.project_no || "",
    date_of_opening: rfq.date_of_opening || "",
    venue: rfq.venue || "",
  });
  useEffect(() => {
  projectInfoForm.setData({
    project_no: rfq.project_no || "",
    date_of_opening: rfq.date_of_opening || "",
    venue: rfq.venue || "",
  });
}, [rfq]);


  const handleProjectInfoSubmit = (e) => {
    e.preventDefault();
    projectInfoForm.post(route("bac_user.submit_project_info", rfq.id));
  };

    const handlePrintPerItemGroupedAsRead = (rfqId) =>
    window.open(route("bac_user.print_aoq_per_item_grouped_read", { id: rfqId }), "_blank");

  return (
    <ApproverLayout>
      <Head title={`Abstract for ${pr.pr_number}`} />
      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Abstract of Quotations
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                    PR #{pr.pr_number}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 text-sm">{pr.details.length} Items</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </div>
        
        <AOQTabs pr={pr.id} />

        {/* Warning Banner */}
        {!hasFullBidSuppliers && (
          <div className="mb-6 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Limited Award Mode</p>
              <p className="text-sm text-amber-700 mt-0.5">No supplier quoted for all items. You can only declare winners per item.</p>
            </div>
          </div>
        )}
<form
  onSubmit={handleProjectInfoSubmit}
  className="mt-6 mb-8"
>
  <div className="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100/50 overflow-hidden">
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Project Information</h3>
            <p className="text-indigo-100 text-sm mt-0.5">Configure RFQ details for this purchase request</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handlePrintPerItemGroupedAsRead(rfq.id)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print AOQ
        </button>
      </div>
    </div>

    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Number */}
        <div className="md:col-span-2">
          <Label
            htmlFor="project_number"
            className="text-sm font-semibold text-gray-700 mb-2 block"
          >
            Project Number
          </Label>
          <Textarea
            id="project_number"
            rows={3}
            className="resize-none w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-inner"
            value={projectInfoForm.data.project_no}
            onChange={(e) =>
              projectInfoForm.setData("project_no", e.target.value)
            }
            placeholder="Enter project number..."
          />
        </div>

        {/* Date + Venue */}
        <div className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="date_opening"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              Date of Opening
            </Label>
            <Input
              id="date_opening"
              type="date"
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-inner"
              value={projectInfoForm.data.date_of_opening}
              onChange={(e) =>
                projectInfoForm.setData("date_of_opening", e.target.value)
              }
            />
          </div>

          <div>
            <Label
              htmlFor="venue"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              Venue
            </Label>
            <Input
              id="venue"
              type="text"
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-inner"
              value={projectInfoForm.data.venue}
              onChange={(e) =>
                projectInfoForm.setData("venue", e.target.value)
              }
              placeholder="Enter venue..."
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
        <Button
          type="submit"
          disabled={projectInfoForm.processing}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-200"
        >
          {projectInfoForm.processing
            ? "Submitting..."
            : "Save Project Info"}
        </Button>
      </div>
    </div>
  </div>
</form>


{/* Unified Abstract Table for Printing */}
<div className="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100/50 overflow-hidden mt-6">
  <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-5 border-b border-gray-200">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-indigo-100 rounded-xl">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Abstract of Quotation</h3>
        <p className="text-sm text-gray-500 mt-0.5">Comparative pricing analysis across suppliers</p>
      </div>
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
        <tr>
          <th className="border-b-2 border-gray-200 px-4 py-4 text-left font-semibold text-gray-700 w-64">
            Item Description
          </th>
          {Array.from(
            new Map(
              Object.values(groupedDetails)
                .flat()
                .map((q) => [q.supplier.id, q.supplier])
            ).values()
          ).map((supplier) => (
            <th
              key={supplier.id}
              className="border-b-2 border-gray-200 px-4 py-4 text-center font-semibold text-gray-700 min-w-[120px]"
            >
              <div className="flex flex-col items-center">
                <span className="text-indigo-600 font-medium">{supplier.company_name}</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {pr.details.map((detail, idx) => {
          const quotes = groupedDetails[detail.id] || [];
          const suppliers = Array.from(
            new Map(
              Object.values(groupedDetails)
                .flat()
                .map((q) => [q.supplier.id, q.supplier])
            ).values()
          );

          // Find lowest quote for this item
          const lowestQuote = quotes.reduce((min, q) => {
            const price = parseFloat(q.quoted_price) || 0;
            return !min || price < parseFloat(min.quoted_price) ? q : min;
          }, null);

          return (
            <tr
              key={detail.id}
              className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-indigo-50/50 transition-all duration-200`}
            >
              <td className="border-b border-gray-100 px-4 py-4">
                <div className="font-semibold text-gray-800">
                  {detail.item} {detail.specs}
                </div>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
                    Qty: {detail.quantity} {detail.unit}
                  </span>
                </div>
              </td>

              {suppliers.map((supplier) => {
                const quote = quotes.find(
                  (q) => q.supplier.id === supplier.id
                );
                const isWinner = quote?.is_winner_as_read;
                const isLowest =
                  lowestQuote &&
                  quote?.supplier.id === lowestQuote.supplier.id;

                if (!quote)
                  return (
                    <td
                      key={supplier.id}
                      className="border-b border-gray-100 text-center text-gray-400 italic py-3"
                    >
                      —
                    </td>
                  );

                const total =
                  (parseFloat(quote.quoted_price) || 0) *
                  (parseFloat(detail.quantity) || 0);

                return (
                  <td
                    key={supplier.id}
                    className={`border-b border-gray-100 px-4 py-3 text-center ${
                      isLowest
                        ? "bg-green-50/70"
                        : ""
                    } ${isWinner ? "bg-indigo-50/70" : ""}`}
                  >
                    <div className={`font-semibold ${isLowest ? "text-green-700" : "text-gray-800"}`}>
                      ₱{parseFloat(quote.quoted_price).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ₱{total.toLocaleString()}
                    </div>
                    {isWinner && (
                      <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Winner
                      </div>
                    )}
                  </td>
                );
              })}
            
          </tr>
          
        );
      })}
      
{/* TOTAL ROW */}
<tr className="bg-gradient-to-r from-indigo-50 to-purple-50 font-semibold">
  <td className="border-b border-gray-200 px-4 py-4 text-right text-gray-800">
    <span className="text-sm font-bold text-gray-600">TOTAL:</span>
  </td>

  {Array.from(
    new Map(
      Object.values(groupedDetails)
        .flat()
        .map((q) => [q.supplier.id, q.supplier])
    ).values()
  ).map((supplier) => {
    const total = supplierMap[supplier.id]?.total || 0;

    return (
      <td
        key={supplier.id}
        className="border-b border-gray-200 px-4 py-4 text-center text-indigo-700 font-bold"
      >
        ₱{total.toLocaleString()}
      </td>
    );
  })}
</tr>

      {/* REMARKS ROW */}
      <tr className="bg-gray-50/50">
        <td className="border-b border-gray-200 px-4 py-4 text-right font-semibold text-gray-700">
          <span className="text-sm">Remarks:</span>
        </td>

        {Array.from(
          new Map(
            Object.values(groupedDetails)
              .flat()
              .map((q) => [q.supplier.id, q.supplier])
            ).values()
          ).map((supplier) => {
          // Gather remarks from all items under this supplier
          const allRemarks = Object.values(groupedDetails)
            .flat()
            .filter((q) => q.supplier.id === supplier.id)
            .map((q) => q.remarks_as_read)
            .filter(Boolean);

          const uniqueRemarks = [...new Set(allRemarks)];
          const displayRemarks =
            uniqueRemarks.length > 0
              ? uniqueRemarks.join("; ")
              : "No remarks";

          return (
            <td
              key={supplier.id}
              className="border-b border-gray-200 px-4 py-3 text-center text-gray-600 text-sm"
            >
              {uniqueRemarks.length > 0 ? (
                <span className="inline-block max-w-[150px] truncate" title={displayRemarks}>
                  {displayRemarks}
                </span>
              ) : (
                <span className="italic text-gray-400 text-xs">No remarks</span>
              )}
            </td>
          );
        })}
      </tr>

      {/* EDIT REMARKS BUTTONS ROW */}
      <tr className="bg-gray-50/30">
        <td className="border-b border-gray-200 px-4 py-4 text-right font-semibold text-gray-700">
          <span className="text-sm">Actions:</span>
        </td>

        {Array.from(
          new Map(
            Object.values(groupedDetails)
              .flat()
              .map((q) => [q.supplier.id, q.supplier])
            ).values()
          ).map((supplier) => (
          <td
            key={supplier.id}
            className="border-b border-gray-200 px-4 py-4 text-center"
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
              onClick={() => {
                setRemarksTarget({
                  rfqId: rfq.id,
                  supplierId: supplier.id,
                  detailId: null,
                  currentRemarks: "", // optional if you want to prefill
                });
                setRemarksInput("");
                setRemarksDialogOpen(true);
              }}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </td>
        ))}
      </tr>
    </tbody>
  </table>
</div>






                {/* BAC COMMITTEE */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100/50 overflow-hidden mt-8">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">BAC Committee</h3>
                <p className="text-sm text-gray-500 mt-0.5">Bids and Awards Committee members</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["chair", "vice_chair", "secretariat", "member1", "member2", "member3"].map(
                (position) => {
                  const info = committeeState.members[position];
                  return (
                    info?.status === "active" && (
                      <div
                        key={position}
                        className="flex items-center justify-between p-5 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-200">
                            {(info.name || "—").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{info.name || "—"}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                              {position.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-purple-600 hover:bg-purple-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          onClick={() => {
                            setSelectedMember({ position, current: info });
                            setReplacementName("");
                            setCommitteeDialogOpen(true);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )
                  );
                }
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* COMMITTEE REPLACEMENT DIALOG */}
      <Dialog open={committeeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <DialogTitle>Replace Committee Member</DialogTitle>
            </div>
            <DialogDescription>
              Enter a new member to replace{" "}
              <strong className="text-gray-900">{selectedMember?.current?.name || "N/A"}</strong> (
              <span className="capitalize">{selectedMember?.position.replace("_", " ")}</span>).
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <input
              type="text"
              value={replacementName}
              onChange={(e) => setReplacementName(e.target.value)}
              placeholder="Enter new member name"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50/50"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setCommitteeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={savingCommittee}
              onClick={() => {
                if (!replacementName.trim()) return;
                setSavingCommittee(true);
                // 1. Update local state immediately
                setCommitteeState((prev) => ({
                  ...prev,
                  members: {
                    ...prev.members,
                    [selectedMember.position]: {
                      name: replacementName.trim(),
                      status: "active",
                    },
                  },
                }));

                // 2. Build payload for backend
                const payload = {
                  id: committee?.id ?? null,
                  status: committeeState.status,
                  members: Object.entries({
                    ...committeeState.members,
                    [selectedMember.position]: {
                      name: replacementName.trim(),
                      status: "active",
                    },
                  }).map(([position, info]) => ({
                    position,
                    name: info.name,
                    status: info.status,
                  })),
                };

                // 3. Submit to backend
                router.post(route("bac.committee.save"), payload, {
                  preserveScroll: true,
                  onSuccess: () => {
                    setSavingCommittee(false);
                    setCommitteeDialogOpen(false);
                    setResultDialog({
                      open: true,
                      type: "success",
                      title: "Committee Updated",
                      description: `${selectedMember.position.replace("_", " ")} replaced successfully.`,
                    });
                    toast({
                      title: "Committee Updated",
                      description: `${selectedMember.position.replace("_", " ")} replaced successfully.`,
                      duration: 3000,
                    });
                  },
                  onError: () => {
                    setSavingCommittee(false);
                    setResultDialog({
                      open: true,
                      type: "error",
                      title: "Committee Update Failed",
                      description: "Unable to replace committee member. Please try again.",
                    });
                  },
                });
              }}
            >
              {savingCommittee ? "Saving..." : "Confirm"}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-xl">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <DialogTitle>Rollback Winner</DialogTitle>
            </div>
            <DialogDescription>
              Provide remarks for rolling back this winner selection.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              value={remarks_as_read}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={rollingBack} variant="destructive" onClick={handleConfirmRollback}>
              {rollingBack ? "Rolling Back..." : "Confirm Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* RESULT DIALOG */}
    <Dialog open={resultDialog.open} onOpenChange={(open) => setResultDialog(prev => ({ ...prev, open }))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {resultDialog.type === "error" ? (
              <div className="p-3 bg-red-100 rounded-xl">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : (
              <div className="p-3 bg-green-100 rounded-xl">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <DialogTitle className={resultDialog.type === "error" ? "text-red-600" : "text-green-600"}>
              {resultDialog.title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2">{resultDialog.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={() => setResultDialog(prev => ({ ...prev, open: false }))}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <DialogTitle>Edit Supplier Remarks</DialogTitle>
          </div>
          <DialogDescription>
            Enter remarks for this supplier {awardMode === "per-item" ? "on this item" : "for the PR"}.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <Textarea
            value={remarksInput}
            onChange={(e) => setRemarksInput(e.target.value)}
            placeholder="Enter remarks..."
            className="min-h-[100px] rounded-xl"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setRemarksDialogOpen(false)}>
            Cancel
          </Button>
          <Button disabled={savingRemarks} onClick={handleSaveRemarks}>
            {savingRemarks ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
  </DialogContent>
</Dialog>

    </ApproverLayout>
  );
}
