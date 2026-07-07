import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import { Head, useForm } from "@inertiajs/react";
import React, { useEffect } from "react";
import { FunnelIcon, DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function PurchaseOrder({ purchaseRequests, filters }) {
  const { data, setData, get } = useForm({
    search: filters.search || "",
    division: filters.division || "",
  });

  useEffect(() => {
    const delay = setTimeout(() => {
      get(route("supply_officer.purchase_orders"), {
        preserveState: true,
        replace: true,
      });
    }, 400);

    return () => clearTimeout(delay);
  }, [data.search, data.division]);

  return (
    <SupplyOfficerLayout header="Purchase Orders">
      <Head title="Purchase Orders" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-gray-800">
      Purchase Orders
    </h1>
    <p className="text-sm text-gray-500">
      Manage and view all created purchase orders
    </p>
  </div>

  <button
    onClick={() =>
      (window.location.href = route("supply_officer.create_po"))
    }
    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all"
  >
    <PlusIcon className="w-5 h-5" />
    Create PO
  </button>
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
              {filters.divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.division}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {purchaseRequests.data.length === 0 ? (
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
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="text-gray-600 text-xs uppercase">
                      <th className="px-6 py-3 text-left">PO #</th>
                      <th className="px-6 py-3 text-left">Focal Person</th>
                      <th className="px-6 py-3 text-left">Supplier</th>
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchaseRequests.data.map((po) => {
                      const focal = po.rfq?.purchase_request?.focal_person;
                      const division = po.rfq?.purchase_request?.division?.division || po.requested_by_office;

                      return (
                        <tr key={po.id} className="hover:bg-gray-50 transition">

                          {/* PO # */}
                          <td className="px-6 py-4 font-semibold text-indigo-600">
                            {po.po_number}
                          </td>

                          {/* Focal Person */}
                          <td className="px-6 py-4 text-gray-600">
                            {focal
                              ? `${focal.firstname || ""} ${focal.lastname || ""}`
                              : "N/A"}
                          </td>

                          {/* Supplier */}
                          <td className="px-6 py-4 text-gray-600">
                            {po.supplier?.company_name || "N/A"}
                          </td>

                          {/* Description */}
                          <td className="px-6 py-4 text-gray-600">
                            <div className="text-sm">
                              {po.details?.map((detail, idx) => (
                                <div key={idx} className="mb-1">
                                  <div className="font-medium">{detail.item}</div>
                                  <div className="text-xs text-gray-500">{detail.specs}</div>
                                </div>
                              )).slice(0, 1) || "N/A"}
                            </div>
                            {po.details?.length > 1 && (
                              <div className="text-xs text-gray-400 mt-1">
                                +{po.details.length - 1} more
                              </div>
                            )}
                          </td>

                          {/* Division */}
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                              {division || "N/A"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                              po.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : po.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : po.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {po.status || "pending"}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                window.open(
                                  route("supply_officer.print_po", po.id),
                                  "_blank"
                                )
                              }
                              className="px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                            >
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
                  Showing {purchaseRequests.from} - {purchaseRequests.to}
                </span>

                <div className="flex gap-2 flex-wrap">
                  {purchaseRequests.links.map((link, i) => (
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
      </div>
    </SupplyOfficerLayout>
  );
}