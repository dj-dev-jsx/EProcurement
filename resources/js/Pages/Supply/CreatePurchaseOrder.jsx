import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import { Head, useForm } from "@inertiajs/react";
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function CreatePurchaseOrder({ pr, rfq, suppliers, winners }) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const prDetails = useMemo(() => pr?.details ?? [], [pr]);
  const defaultRequestedBy = useMemo(() => {
    if (!pr?.focal_person) return "";
    return [
      pr.focal_person.firstname,
      pr.focal_person.middlename,
      pr.focal_person.lastname,
    ]
      .filter(Boolean)
      .join(" ");
  }, [pr]);

  const defaultRequestedByOffice = useMemo(() => {
    return pr?.division?.division ?? "";
  }, [pr]);

  const { data, setData, post, processing, errors } = useForm({
    rfq_id: rfq?.id ?? null,
    po_number: "",
    requested_by: defaultRequestedBy,
    requested_by_id: pr?.focal_person?.id ?? null,
    requested_by_office: defaultRequestedByOffice,
    mode_of_procurement: "",
    delivery_term: "",
    items: [],
  });

  useEffect(() => {
    if (winners?.length && data.items.length === 0) {
      setData(
        "items",
        winners.map((winner) => ({
          item_key: `${winner.supplier_id}-${winner.pr_detail_id}-${Math.random()
            .toString(36)
            .substring(2, 10)}`,
          supplier_id: winner.supplier_id,
          pr_detail_id: winner.pr_detail_id,
          item: winner.item || "",
          specs: winner.specs || "",
          unit: winner.unit || "",
          quantity: winner.quantity ?? 1,
          unit_price: Number(winner.unit_price ?? 0),
          total_price: Number(winner.total_price ?? 0),
        }))
      );
    }
  }, [winners, data.items.length, setData]);

  const createItemRow = (overrides = {}) => {
    const defaultPrDetail = prDetails.find(
      (detail) => detail.id === overrides.pr_detail_id
    );

    const baseDetail = defaultPrDetail || prDetails[0];

    return {
      item_key: `new-${Math.random().toString(36).substring(2, 10)}`,
      supplier_id: overrides.supplier_id || suppliers?.[0]?.id || null,
      pr_detail_id: baseDetail?.id ?? null,
      item: overrides.item ?? baseDetail?.item ?? "",
      specs: overrides.specs ?? baseDetail?.specs ?? "",
      unit: overrides.unit ?? baseDetail?.unit ?? "",
      quantity: overrides.quantity ?? baseDetail?.quantity ?? 1,
      unit_price: overrides.unit_price ?? 0,
      total_price:
        Number(overrides.quantity ?? baseDetail?.quantity ?? 1) *
        Number(overrides.unit_price ?? 0),
    };
  };

  const addItem = () => {
    setData("items", [...data.items, createItemRow()]);
  };

  // Initialize one empty item row when creating a manual PO (no winners/pr)
  useEffect(() => {
    if ((!winners || winners.length === 0) && (data.items || []).length === 0 && (suppliers || []).length > 0) {
      setData("items", [createItemRow()]);
    }
  }, [winners, suppliers, data.items.length, setData]);

  const updateItem = (index, field, value) => {
    const updatedItems = data.items.map((item, idx) => {
      if (idx !== index) return item;

      let next = {
        ...item,
        [field]:
          field === "quantity" || field === "unit_price"
            ? Number(value)
            : value,
      };

      if (field === "pr_detail_id") {
        const prDetail = prDetails.find((detail) => detail.id === Number(value));
        if (prDetail) {
          next = {
            ...next,
            item: prDetail.item ?? next.item,
            specs: prDetail.specs ?? next.specs,
            unit: prDetail.unit ?? next.unit,
            quantity: prDetail.quantity ?? next.quantity,
          };
        }
      }

      next.total_price = Number(next.quantity || 0) * Number(next.unit_price || 0);
      return next;
    });

    setData("items", updatedItems);
  };

  const removeItem = (index) => {
    setData("items", data.items.filter((_, idx) => idx !== index));
  };

  const grandTotal = (data.items || []).reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = () => {
    post(route("supply_officer.store_po"), {
      onFinish: () => setIsConfirmDialogOpen(false),
    });
  };

  return (
    <SupplyOfficerLayout header="Create Purchase Order">
      <Head title={`Create PO${pr ? ` for PR #${pr.pr_number}` : ""}`} />

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create Purchase Order</h1>
          <p className="text-sm text-gray-500">
            {pr
              ? `PR #${pr.pr_number} • Fill in PO number, supplier, and item details.`
              : "Enter supplier and item details for the purchase order."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Purchase Order Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">PO Number *</label>
              <input
                type="text"
                value={data.po_number}
                onChange={(e) => setData("po_number", e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.po_number && <p className="text-red-500 text-xs mt-1">{errors.po_number}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Requested By / Program Manager *</label>
              <input
                type="text"
                value={data.requested_by}
                onChange={(e) => setData("requested_by", e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.requested_by && <p className="text-red-500 text-xs mt-1">{errors.requested_by}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Program Manager Office</label>
              <input
                type="text"
                value={data.requested_by_office}
                onChange={(e) => setData("requested_by_office", e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.requested_by_office && <p className="text-red-500 text-xs mt-1">{errors.requested_by_office}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Mode of Procurement *</label>
              <input
                type="text"
                value={data.mode_of_procurement}
                onChange={(e) => setData("mode_of_procurement", e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.mode_of_procurement && <p className="text-red-500 text-xs mt-1">{errors.mode_of_procurement}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Delivery Term</label>
              <input
                type="text"
                value={data.delivery_term}
                onChange={(e) => setData("delivery_term", e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.delivery_term && <p className="text-red-500 text-xs mt-1">{errors.delivery_term}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">PO Items</h2>
              <p className="text-sm text-gray-500">Add one or more supplier item lines to the purchase order.</p>
            </div>
            <Button type="button" onClick={addItem} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>

          {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Specs</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {(data.items || []).map((item, index) => (
                  <tr key={item.item_key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <select
                        value={item.supplier_id ?? ""}
                        onChange={(e) => updateItem(index, "supplier_id", e.target.value)}
                        className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>Select supplier</option>
                        {(suppliers || []).map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.company_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.item}
                        onChange={(e) => updateItem(index, "item", e.target.value)}
                        className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Specifications"
                        value={item.specs}
                        onChange={(e) => updateItem(index, "specs", e.target.value)}
                        className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="w-20 rounded-lg border-gray-300 px-3 py-2 text-sm text-center focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                        className="w-28 rounded-lg border-gray-300 px-3 py-2 text-sm text-right focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                      ₱{Number(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center justify-center rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Grand Total</p>
            <h2 className="text-2xl font-bold text-indigo-600">
              ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <Button type="submit" disabled={processing || data.items.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
            {processing ? "Submitting..." : "Create Purchase Order"}
          </Button>
        </div>

        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" />
                Confirm Purchase Order
              </DialogTitle>
              <DialogDescription>Please review all details before creating the purchase order.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSubmit} className="bg-green-600 hover:bg-green-700">
                Confirm & Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </SupplyOfficerLayout>
  );
}