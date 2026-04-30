import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import { Head, useForm, usePage } from "@inertiajs/react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
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
import { FunnelIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

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
    const delay = setTimeout(() => {
      get(route("bac_user.purchase_orders_table"), {
        preserveState: true,
        replace: true,
      });
    }, 400);

    return () => clearTimeout(delay);
  }, [data.search, data.division]);

  const getStatusStyle = (status) => {
    if (status.toLowerCase().includes("completed"))
      return "bg-green-100 text-green-700";
    if (status.toLowerCase().includes("pending"))
      return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <SupplyOfficerLayout header="Purchase Orders">
      <Head title="Purchase Orders" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500">
            Manage and record incoming deliveries (IAR)
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

        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {purchaseOrders.data.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">
                No Purchase Orders found
              </p>
              <span className="text-sm text-gray-400">
                Try adjusting filters or search terms
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">PO #</th>
                      <th className="px-6 py-3 text-left">Focal Person</th>
                      <th className="px-6 py-3 text-left">Supplier</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchaseOrders.data.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50 transition">

                        {/* PO */}
                        <td className="px-6 py-4 font-semibold text-indigo-600">
                          {po.po_number}
                        </td>

                        {/* Focal */}
                        <td className="px-6 py-4 text-gray-600">
                          {po.rfq?.purchase_request?.focal_person
                            ? `${po.rfq.purchase_request.focal_person.firstname} ${po.rfq.purchase_request.focal_person.lastname}`
                            : "N/A"}
                        </td>

                        {/* Supplier */}
                        <td className="px-6 py-4 text-gray-600">
                          {po.supplier?.company_name ?? "N/A"}
                        </td>

                        {/* Division */}
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                            {po.rfq?.purchase_request?.division?.division || "N/A"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(po.status)}`}>
                            {po.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-center">
                          {po.iar ? (
                            <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              IAR Recorded
                            </span>
                          ) : (
                            <a
                              href={route("supply_officer.record_iar", po.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                            >
                              <ClipboardCheck size={16} />
                              Record IAR
                            </a>
                          )}
                        </td>

                      </tr>
                    ))}
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
                <CheckCircle2 size={22} />
                Success
              </DialogTitle>
              <DialogDescription className="pt-3 text-base">
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
    </SupplyOfficerLayout>
  );
}