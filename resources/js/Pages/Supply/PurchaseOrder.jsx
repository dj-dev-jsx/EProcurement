import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head, useForm } from "@inertiajs/react";
import React, { useEffect } from "react";
import { FunnelIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function PurchaseOrder({ purchaseRequests, filters }) {
  const { data, setData, get } = useForm({
    search: filters.search || "",
    division: filters.division || "",
  });

  useEffect(() => {
    const delay = setTimeout(() => {
      get(route("bac_user.purchase_orders"), {
        preserveState: true,
        replace: true,
      });
    }, 400);

    return () => clearTimeout(delay);
  }, [data.search, data.division]);

  return (
    <ApproverLayout header="Create Purchase Orders">
      <Head title="Purchase Orders" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Create Purchase Orders
          </h1>
          <p className="text-sm text-gray-500">
            Generate purchase orders from winning suppliers
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
              placeholder="Search PR number or focal person"
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
                No Purchase Requests with winners
              </p>
              <span className="text-sm text-gray-400">
                Only requests with selected suppliers appear here
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="text-gray-600 text-xs uppercase">
                      <th className="px-6 py-3 text-left">PR #</th>
                      <th className="px-6 py-3 text-left">Focal</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-left">Summary</th>
                      <th className="px-6 py-3 text-left">Supplier / Amount</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchaseRequests.data.map((pr) => {
                      const winningDetails = pr.details.filter((detail) =>
                        pr.rfqs
                          ?.flatMap((r) => r.details)
                          .some(
                            (d) =>
                              d.pr_details_id === detail.id &&
                              d.is_winner_as_calculated
                          )
                      );

                      if (winningDetails.length === 0) return null;

                      const winners = pr.rfqs
                        ?.flatMap((r) => r.details ?? [])
                        .filter(
                          (d) =>
                            winningDetails.some(
                              (wd) => wd.id === d.pr_details_id
                            ) && d.is_winner_as_calculated
                        );

                      const totalQuotedPrice = winners.reduce((sum, w) => {
                        const prDetail = winningDetails.find(
                          (d) => d.id === w.pr_details_id
                        );
                        const qty = prDetail?.quantity ?? 1;
                        const price =
                          w.unit_price_edited ?? w.quoted_price ?? 0;
                        return sum + price * qty;
                      }, 0);

                      const supplierList = [
                        ...new Set(
                          winners.map(
                            (w) => w.supplier?.company_name || "N/A"
                          )
                        ),
                      ];

                      return (
                        <tr key={pr.id} className="hover:bg-gray-50 transition">

                          {/* PR */}
                          <td className="px-6 py-4 font-semibold text-indigo-600">
                            {pr.pr_number}
                          </td>

                          {/* Focal */}
                          <td className="px-6 py-4 text-gray-600">
                            {pr.focal_person.firstname}{" "}
                            {pr.focal_person.lastname}
                          </td>

                          {/* Division */}
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                              {pr.division.division}
                            </span>
                          </td>

                          {/* Summary */}
                          <td className="px-6 py-4 text-gray-600">
                            {winningDetails[0]?.item}
                            {winningDetails.length > 1 && (
                              <span className="text-xs text-gray-400 ml-1">
                                +{winningDetails.length - 1}
                              </span>
                            )}
                          </td>

                          {/* Supplier + Price */}
                          <td className="px-6 py-4">
                            <div className="text-gray-700">
                              {supplierList.join(", ")}
                            </div>
                            <div className="text-sm font-semibold text-indigo-600">
                              ₱{totalQuotedPrice.toLocaleString()}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-center">
                            {pr.has_po ? (
                              <span className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                                PO Generated
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  window.location.href = route(
                                    "bac_user.create_po",
                                    pr.id
                                  )
                                }
                                className="px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                              >
                                Create PO
                              </button>
                            )}
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
    </ApproverLayout>
  );
}