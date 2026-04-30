import ApproverLayout from "@/Layouts/ApproverLayout";
import { Head } from "@inertiajs/react";
import { Card, CardContent } from "@/Components/ui/card";

import {
  ClipboardList,
  CheckCircle2,
  Hourglass,
  XCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard({
  auth,
  stats,
  deptData,
  approvalData,
  recentApprovals,
}) {
  const iconMap = {
    ClipboardList,
    CheckCircle2,
    Hourglass,
    XCircle,
  };

  const getStatusStyle = (status) => {
    if (status === "Reviewed") return "bg-green-100 text-green-700";
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <ApproverLayout header="Dashboard">
      <Head title="Dashboard" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

        {/* Welcome */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {auth.user.firstname}
            </h1>
            <p className="text-sm text-gray-500">
              Monitor requests, approvals, and system activity
            </p>
          </div>

          <div className="mt-4 md:mt-0 text-sm text-gray-400">
            Updated just now
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = iconMap[stat.icon];

            return (
              <Card
                key={idx}
                className="rounded-2xl border shadow-sm hover:shadow-md transition"
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {stat.value}
                    </h2>
                  </div>

                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Bar Chart */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Requests by Division
                </h2>
                <p className="text-sm text-gray-500">
                  Overview of approval status per division
                </p>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="division" />
                  <YAxis />
                  <Tooltip />

                  <Bar dataKey="approved" fill="#22c55e" />
                  <Bar dataKey="pending" fill="#eab308" />
                  <Bar dataKey="rejected" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Approval Ratio
                </h2>
                <p className="text-sm text-gray-500">
                  Distribution of request statuses
                </p>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={approvalData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                  >
                    {approvalData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                {approvalData.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    ></span>
                    <span className="text-gray-600">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-5">

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Activity
              </h2>
              <p className="text-sm text-gray-500">
                Latest reviewed purchase requests
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">PR #</th>
                    <th className="px-6 py-3 text-left">Item</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {recentApprovals.map((req, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        {req.pr_number}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {req.items}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {req.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </CardContent>
        </Card>

      </div>
    </ApproverLayout>
  );
}