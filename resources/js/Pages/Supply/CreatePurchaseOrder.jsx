import { Head, useForm } from "@inertiajs/react";
import React, { useEffect, useState, useMemo } from "react";
import ApproverLayout from "@/Layouts/ApproverLayout";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function CreatePurchaseOrder({ pr, rfq, suppliers, winners }) {

  const winningSupplierIds = useMemo(
    () => [...new Set(winners.map((w) => w.supplier_id))],
    [winners]
  );

  const winningSuppliers = useMemo(
    () => suppliers.filter((s) => winningSupplierIds.includes(s.id)),
    [suppliers, winningSupplierIds]
  );

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    rfq_id: rfq.id,
    items: [],
    mode_of_procurement: "",
    delivery_term: "",
  });

  const getItemsForSupplier = (supplierId) => {
    return winners
      .filter((w) => w.supplier_id === supplierId)
      .map((w) => ({
        pr_detail_id: w.pr_detail_id,
        item: w.item,
        specs: w.specs,
        unit: w.unit,
        quantity: w.quantity,
        unit_price: Number(w.unit_price),
        total_price: Number(w.quantity) * Number(w.unit_price),
        supplier_id: supplierId,
      }));
  };

  useEffect(() => {
    const allItems = winningSuppliers.flatMap((s) =>
      getItemsForSupplier(s.id)
    );
    setData("items", allItems);
  }, [winningSuppliers]);

  const grandTotal = data.items.reduce(
    (sum, i) => sum + Number(i.total_price),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = () => {
    post(route("bac_user.store_po"), {
      onFinish: () => setIsConfirmDialogOpen(false),
    });
  };

  return (
    <ApproverLayout header="Create Purchase Order">
      <Head title={`Create PO for PR #${pr.pr_number}`} />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Create Purchase Order
          </h1>
          <p className="text-sm text-gray-500">
            PR #{pr.pr_number} • Generate PO from selected suppliers
          </p>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Procurement Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-medium text-gray-600">
                Mode of Procurement *
              </label>
              <input
                type="text"
                value={data.mode_of_procurement}
                onChange={(e) =>
                  setData("mode_of_procurement", e.target.value)
                }
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.mode_of_procurement && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.mode_of_procurement}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Delivery Term *
              </label>
              <input
                type="text"
                value={data.delivery_term}
                onChange={(e) =>
                  setData("delivery_term", e.target.value)
                }
                className="mt-1 w-full rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {errors.delivery_term && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.delivery_term}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Suppliers */}
        {winningSuppliers.map((supplier) => {
          const supplierItems = data.items.filter(
            (i) => i.supplier_id === supplier.id
          );

          const supplierTotal = supplierItems.reduce(
            (sum, i) => sum + Number(i.total_price),
            0
          );

          return (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
            >
              {/* Supplier Header */}
              <div className="flex justify-between items-center bg-gray-100 px-6 py-3">
                <h3 className="font-semibold text-gray-800">
                  {supplier.company_name}
                </h3>
                <span className="text-indigo-600 font-semibold">
                  ₱{supplierTotal.toLocaleString()}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Item</th>
                      <th className="px-6 py-3 text-left">Specs</th>
                      <th className="px-6 py-3 text-center">Qty</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {supplierItems.map((item) => (
                      <tr key={item.pr_detail_id} className="hover:bg-gray-50">

                        <td className="px-6 py-4 font-medium text-gray-800">
                          {item.item}
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {item.specs}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {item.quantity}
                        </td>

                        <td className="px-6 py-4 text-right text-gray-600">
                          ₱{item.unit_price.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                          ₱{item.total_price.toLocaleString()}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Grand Total</p>
            <h2 className="text-2xl font-bold text-indigo-600">
              ₱{grandTotal.toLocaleString()}
            </h2>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={processing || data.items.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {processing ? "Submitting..." : "Create Purchase Order"}
          </Button>
        </div>

      </div>

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" />
              Confirm Purchase Order
            </DialogTitle>
            <DialogDescription>
              Please review all details before creating the purchase order.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ApproverLayout>
  );
}