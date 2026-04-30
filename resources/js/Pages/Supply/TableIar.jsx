import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import { Head, useForm } from "@inertiajs/react";
import React, { useEffect } from "react";
import { PrinterCheck } from "lucide-react";
import { FunnelIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function TableIar({ iarData, filters }) {
  const { data, setData, get } = useForm({
    search: filters.search || "",
  });

  useEffect(() => {
    const delay = setTimeout(() => {
      get(route("supply_officer.iar_table"), {
        preserveState: true,
        replace: true,
      });
    }, 300);

    return () => clearTimeout(delay);
  }, [data.search]);

  return (
    <SupplyOfficerLayout header="Inspection & Acceptance Reports">
      <Head title="Inspection and Acceptance Reports" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inspection & Acceptance Reports
          </h1>
          <p className="text-sm text-gray-500">
            View, track, and print inspection reports
          </p>
        </div>

        {/* Search / Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Search</h3>
          </div>

          <input
            type="text"
            value={data.search}
            onChange={(e) => setData("search", e.target.value)}
            placeholder="Search IAR number or supplier..."
            className="w-full md:w-96 rounded-lg border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {iarData?.data?.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-600 text-lg font-medium">
                No Inspection Reports Found
              </p>
              <p className="text-sm text-gray-400">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">IAR #</th>
                      <th className="px-6 py-3 text-left">Division</th>
                      <th className="px-6 py-3 text-left">Items</th>
                      <th className="px-6 py-3 text-left">Supplier</th>
                      <th className="px-6 py-3 text-left">Total</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {iarData.data.map((item) => {
                      const itemsSummary =
                        item.items?.length > 1
                          ? `${item.items[0]} +${item.items.length - 1} more`
                          : item.items?.[0] || "N/A";

                      return (
                        <tr
                          key={item.iar_number}
                          className="hover:bg-gray-50 transition"
                        >
                          {/* IAR Number */}
                          <td className="px-6 py-4 font-semibold text-indigo-600">
                            {item.iar_number}
                          </td>

                          {/* Division */}
                          <td className="px-6 py-4 text-gray-600">
                            {item.division || "N/A"}
                          </td>

                          {/* Items */}
                          <td className="px-6 py-4 text-gray-700">
                            {itemsSummary}
                          </td>

                          {/* Supplier */}
                          <td className="px-6 py-4 text-gray-600">
                            {item.supplier || "N/A"}
                          </td>

                          {/* Total */}
                          <td className="px-6 py-4 font-medium text-gray-800">
                            ₱{" "}
                            {Number(item.totalPrice || 0).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-center">
                            <a
                              href={route(
                                "supply_officer.print_iar",
                                item.id
                              )}
                              target="_blank"
                              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
                            >
                              <PrinterCheck size={16} />
                              Print
                            </a>
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
                  Showing results
                </span>

                <div className="flex gap-2 flex-wrap">
                  {iarData.links.map((link, i) => (
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
                      className={`px-3 py-1 text-sm rounded-md border transition ${
                        link.active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
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