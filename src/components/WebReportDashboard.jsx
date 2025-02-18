import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import Chart from "chart.js/auto";

export default function WebReportDashboard() {
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch("/report.json")
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch report");
                return response.json();
            })
            .then((data) => setReport(data.results[0]))
            .catch((error) => setError(error.message));
    }, []);

    if (error) return <p className="text-red-500">⚠️ Error: {error}</p>;
    if (!report) return <p className="text-gray-500 text-center mt-10">⏳ Loading report...</p>;

    // Performance Data
    const performanceData = {
        labels: ["Page Load Time"],
        datasets: [
            {
                label: "Milliseconds (ms)",
                data: [parseInt(report.performanceResults?.loadTime || 0)],
                backgroundColor: "rgba(75, 192, 192, 0.7)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">📊 Website Testing Report</h1>
            
            {/* Performance Analysis */}
            <Card className="mb-6">
                <CardContent>
                    <h3 className="text-lg font-semibold mb-2">🔹 Performance Analysis</h3>
                    <Bar data={performanceData} />
                </CardContent>
            </Card>
            
            {/* Security Warnings */}
            <Card className="mb-6">
                <CardContent>
                    <h3 className="text-lg font-semibold mb-2">🔹 Security Warnings</h3>
                    {report.securityResults?.length > 0 ? (
                        report.securityResults.map((warning, index) => (
                            <p key={index} className="text-red-500">⚠️ {warning.warning} - {warning.url}</p>
                        ))
                    ) : (
                        <p className="text-green-500">✅ No security issues detected.</p>
                    )}
                </CardContent>
            </Card>

            {/* API Requests */}
            <Card>
                <CardContent>
                    <h3 className="text-lg font-semibold mb-2">🔹 API Requests</h3>
                    {report.apiResults?.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead>URL</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.apiResults.map((request, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{request.method}</TableCell>
                                        <TableCell className="break-all">{request.url}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-gray-500">No API requests found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
