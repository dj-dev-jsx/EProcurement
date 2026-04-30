import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import { CheckCircle2, PrinterCheckIcon } from "lucide-react";
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
import { FunnelIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";

export default function PurchaseOrdersTable({ purchaseOrders, filters }) {
  const { props } = usePage();

  const { data, setData, get } = useForm({
    search: filters.search || "",
    division: filters.division || "",
  });

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (props.flash.success) {
      setSuccessMessage(props.flash.success);
      setIsSuccessDialogOpen(true);
    }
  }, [props.flash.success]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      get(route("bac_user.bac_purchase_orders_table"), {
        preserveState: true,
        replace: true,
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [data.search, data.division]);

  const getStatusStyle = (status) => {
    const s = status.toLowerCase();
    if (s === "completed") return "bg-green-100 text-green-700";
    if (s === "pending") return "bg-yellow-100 text-yellow-700";
    if (s === "processing") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <ApproverLayout header="Purchase Orders">
      <Head title="Purchase Orders" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500">
            Track and manage all generated purchase orders
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search PO number or focal person"
              value={data.search}
              onChange={(e) => setData("search", e.target.value)}
              className="rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={data.division}
              onChange={(e) => setData("division", e.target.value)}
              className="rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Divisions</option>
              {filters.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.division}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {purchaseOrders.data.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">
                No Purchase Orders Found
              </p>
              <span className="text-sm text-gray-400">
                Try adjusting your filters
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="text-gray-600 text-xs uppercase">
                      <th className="px-6 py-3 text-left">PO #</th>
                      <th className="px-6 py-3 text-left">Focal</th>
                      <th className="px-6 py-3 text-left">Supplier</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchaseOrders.data.map((po) => {
                      const focal = po.rfq?.purchase_request?.focal_person;

                      return (
                        <tr key={po.id} className="hover:bg-gray-50 transition">

                          <td className="px-6 py-4 font-semibold text-indigo-600">
                            {po.po_number}
                          </td>

                          <td className="px-6 py-4 text-gray-600">
                            {focal
                              ? `${focal.firstname} ${focal.lastname}`
                              : "N/A"}
                          </td>

                          <td className="px-6 py-4 text-gray-600">
                            {po.supplier?.company_name || "N/A"}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                              {po.rfq?.purchase_request?.division?.division || "N/A"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusStyle(po.status)}`}>
                              {po.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                window.open(
                                  route("bac_user.print_po", po.id),
                                  "_blank"
                                )
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition"
                            >
                              <PrinterCheckIcon size={16} />
                              Print
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {purchaseOrders.from} - {purchaseOrders.to}
                </span>

                <div className="flex gap-2 flex-wrap">
                  {purchaseOrders.links.map((link, i) => (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() =>
                        link.url &&
                        get(link.url, {
                          data,
                          preserveState: true,
                          preserveScroll: true,
                        })
                      }
                      className={`px-3 py-1 text-sm rounded-md ${
                        link.active
                          ? "bg-indigo-600 text-white"
                          : "bg-white border hover:bg-gray-100"
                      } ${!link.url && "opacity-40 cursor-not-allowed"}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Success Dialog */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={24} />
                Success
              </DialogTitle>
              <DialogDescription className="pt-4 text-base">
                {successMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setIsSuccessDialogOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ApproverLayout>
  );
}