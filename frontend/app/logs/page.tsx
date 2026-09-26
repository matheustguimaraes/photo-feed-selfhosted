"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logsApi, Log } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

export default function LogsPage() {
  const [filters, setFilters] = useState({
    limit: 100,
    action_type: "",
    model_name: "",
  });

  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["logs", filters],
    queryFn: () => {
      const params: any = { limit: filters.limit };
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.model_name) params.model_name = filters.model_name;
      return logsApi.list(params);
    },
  });

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    refetch();
  };

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "READ":
        return "bg-gray-100 text-gray-800";
      case "REQUEST":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const parseJsonData = (dataString?: string) => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return dataString;
    }
  };

  return (
    <PageLayout
      leftElement={
        <h1 className="text-xl font-bold text-black">DynamoDB Logs</h1>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-black/20 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Limit
              </label>
              <input
                type="number"
                value={filters.limit}
                onChange={(e) =>
                  handleFilterChange("limit", parseInt(e.target.value) || 100)
                }
                className="w-full rounded border border-black/20 px-3 py-2 text-black"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Action Type
              </label>
              <input
                type="text"
                value={filters.action_type}
                onChange={(e) =>
                  handleFilterChange("action_type", e.target.value)
                }
                placeholder="e.g., CREATE, UPDATE"
                className="w-full rounded border border-black/20 px-3 py-2 text-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Model Name
              </label>
              <input
                type="text"
                value={filters.model_name}
                onChange={(e) =>
                  handleFilterChange("model_name", e.target.value)
                }
                placeholder="e.g., Post, Profile"
                className="w-full rounded border border-black/20 px-3 py-2 text-black"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                className="w-full rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error instanceof Error ? error.message : "Failed to fetch logs"}
          </div>
        )}

        {isLoading && (
          <div className="py-8 text-center text-black">Loading logs...</div>
        )}

        {!isLoading && !error && (
          <div className="overflow-hidden rounded-lg border border-black/20 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {!logsData || logsData.logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logsData.logs.map((log: Log) => {
                      const parsedData = parseJsonData(log.data);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-black">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${getActionBadgeColor(
                                log.action_type
                              )}`}
                            >
                              {log.action_type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-black">
                            {log.model_name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {log.user_id || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {parsedData ? (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-800">
                                  View Data
                                </summary>
                                <pre className="mt-2 max-w-md overflow-auto rounded bg-gray-100 p-2 text-xs">
                                  {JSON.stringify(parsedData, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
              Showing {logsData?.count || 0} log(s)
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
