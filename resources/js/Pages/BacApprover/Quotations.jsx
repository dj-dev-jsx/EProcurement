import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import TooltipLink from "@/Components/Tooltip";
import {
  FunnelIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

export default function Quotation({ purchaseRequests, filters = {} }) {
  const [prNumber, setPrNumber] = useState(filters.prNumber || "");
  const [focalPerson, setFocalPerson] = useState(filters.focalPerson || "");
  const [division, setDivision] = useState(filters.division || "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.get(
        route("bac_user.for_quotations"),
        { prNumber, focalPerson, division },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 400);

    return () => clearTimeout(timeout);
  }, [prNumber, focalPerson, division]);

  return (
    <ApproverLayout header="For Quotation">
      <Head title="Purchase Requests for Quotation" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            For Quotation
          </h1>
          <p className="text-sm text-gray-500">
            Manage and evaluate supplier quotations
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="PR Number"
              className="rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="text"
              value={focalPerson}
              onChange={(e) => setFocalPerson(e.target.value)}
              placeholder="Focal Person"
              className="rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Divisions</option>
              <option value="1">SGOD</option>
              <option value="2">OSDS</option>
              <option value="3">CID</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {purchaseRequests.data.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">
                No Requests for Quotation
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
                      <th className="px-6 py-3 text-left">PR #</th>
                      <th className="px-6 py-3 text-left">Focal</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-left">Items</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {purchaseRequests.data.map((pr) => {
                      const hasWinner = pr.rfqs?.some(rfq =>
                        rfq.details?.some(d => d.is_winner_as_calculated)
                      );

                      const itemsPreview =
                        pr.details.length > 0
                          ? `${pr.details[0].item}${
                              pr.details.length > 1
                                ? ` +${pr.details.length - 1}`
                                : ""
                            }`
                          : "—";

                      return (
                        <tr key={pr.id} className="hover:bg-gray-50 transition">

                          {/* PR Number */}
                          <td className="px-6 py-4 font-semibold text-gray-800">
                            {pr.rfqs && pr.rfqs.length > 0 ? (
                              <TooltipLink
                                to={route(
                                  "bac_user.abstract_of_quotations",
                                  pr.id
                                )}
                                tooltip="View Abstract"
                                className="text-indigo-600 hover:underline"
                              >
                                {pr.pr_number}
                              </TooltipLink>
                            ) : (
                              <div className="text-gray-400 text-sm">
                                {pr.pr_number}
                                <div className="text-xs text-red-500">
                                  No quotations
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Focal */}
                          <td className="px-6 py-4 text-gray-600">
                            {[pr.focal_person.firstname, pr.focal_person.lastname]
                              .filter(Boolean)
                              .join(" ")}
                          </td>

                          {/* Division */}
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-full">
                              {pr.division.division}
                            </span>
                          </td>

                          {/* Items */}
                          <td className="px-6 py-4 text-gray-600">
                            {itemsPreview}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            {hasWinner ? (
                              <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                Winner Selected
                              </span>
                            ) : pr.rfqs?.length > 0 ? (
                              <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                With Quotations
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                No Quotations
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-center">
                            {hasWinner ? (
                              <button
                                disabled
                                className="px-3 py-2 text-xs bg-gray-300 text-white rounded-lg cursor-not-allowed"
                              >
                                Completed
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  router.visit(
                                    route("bac_user.quoted_price", pr.id)
                                  )
                                }
                                className="px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                              >
                                Enter Quote
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
                        router.visit(link.url, {
                          preserveScroll: true,
                          preserveState: true,
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