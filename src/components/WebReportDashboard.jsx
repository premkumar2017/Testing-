import React, { useState, useEffect } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { Table } from 'react-bootstrap';
import { FiExternalLink, FiClock, FiLock, FiUnlock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

Chart.register(...registerables);

const ReportDashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch('/performance_report.json');
        const data = await response.json();
        setReport(data.results[0]);
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading report...</div>;
  if (!report) return <div className="p-8 text-center text-red-500">Failed to load report.</div>;

  // Format score with color coding
  const formatScore = (score) => {
    if (score >= 90) return <span className="text-green-600">{score}%</span>;
    if (score >= 50) return <span className="text-yellow-600">{score}%</span>;
    return <span className="text-red-600">{score}%</span>;
  };

  // Lighthouse data for chart
  const lighthouseData = {
    labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
    datasets: [{
      label: 'Scores (%)',
      data: [
        report.lighthouseResults?.performance || 0,
        report.lighthouseResults?.accessibility || 0,
        report.lighthouseResults?.bestPractices || 0,
        report.lighthouseResults?.seo || 0,
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(16, 185, 129, 0.7)'
      ],
    }]
  };

  // API request methods data
  const apiMethodsData = {
    labels: ['GET', 'POST', 'PUT', 'DELETE', 'OTHER'],
    datasets: [{
      data: [
        report.apiResults?.filter(r => r.method === 'GET').length || 0,
        report.apiResults?.filter(r => r.method === 'POST').length || 0,
        report.apiResults?.filter(r => r.method === 'PUT').length || 0,
        report.apiResults?.filter(r => r.method === 'DELETE').length || 0,
        report.apiResults?.filter(r => !['GET','POST','PUT','DELETE'].includes(r.method)).length || 0
      ],
      backgroundColor: [
        '#10B981',
        '#3B82F6',
        '#F59E0B',
        '#EF4444',
        '#6B7280'
      ]
    }]
  };

  // API status codes data
  const apiStatusData = {
    labels: ['Success (2xx)', 'Redirect (3xx)', 'Client Error (4xx)', 'Server Error (5xx)'],
    datasets: [{
      data: [
        report.apiResults?.filter(r => r.status >= 200 && r.status < 300).length || 0,
        report.apiResults?.filter(r => r.status >= 300 && r.status < 400).length || 0,
        report.apiResults?.filter(r => r.status >= 400 && r.status < 500).length || 0,
        report.apiResults?.filter(r => r.status >= 500).length || 0
      ],
      backgroundColor: [
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#7C3AED'
      ]
    }]
  };

  // API response time data
  const apiTimingData = {
    labels: report.apiResults?.slice(0, 10).map((_, i) => `Request ${i + 1}`) || [],
    datasets: [{
      label: 'Response Time (ms)',
      data: report.apiResults?.slice(0, 10).map(req => req.validation?.responseTime || 0) || [],
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1
    }]
  };

  const renderStatusIcon = (status) => {
    if (status >= 200 && status < 300) {
      return <FiCheckCircle className="text-green-500 inline mr-1" />;
    } else if (status >= 400) {
      return <FiAlertCircle className="text-red-500 inline mr-1" />;
    }
    return <FiAlertCircle className="text-yellow-500 inline mr-1" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Website Testing Report</h1>
          <p className="text-gray-600">Tested URL: <span className="text-blue-600">{report.url}</span></p>
          <p className="text-sm text-gray-500">Last updated: {new Date(report.timestamp).toLocaleString()}</p>
        </header>

        {/* Lighthouse Scores */}
        <section className="mb-8 card">
          <h2 className="text-xl font-semibold mb-4">Lighthouse Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Bar 
                data={lighthouseData} 
                options={{ 
                  responsive: true,
                  scales: { y: { beginAtZero: true, max: 100 } },
                }} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">Performance</h3>
                <p className="text-2xl">{formatScore(report.lighthouseResults?.performance)}</p>
              </div>
              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">Accessibility</h3>
                <p className="text-2xl">{formatScore(report.lighthouseResults?.accessibility)}</p>
              </div>
              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">Best Practices</h3>
                <p className="text-2xl">{formatScore(report.lighthouseResults?.bestPractices)}</p>
              </div>
              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">SEO</h3>
                <p className="text-2xl">{formatScore(report.lighthouseResults?.seo)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* API Test Results */}
        <section className="mb-8 card">
          <h2 className="text-xl font-semibold mb-4">API Test Results</h2>
          
          {/* API Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-lg mb-2">Request Methods</h3>
              <Pie data={apiMethodsData} />
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">Response Status</h3>
              <Pie data={apiStatusData} />
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">Response Times</h3>
              <Line data={apiTimingData} options={{
                responsive: true,
                scales: { y: { beginAtZero: true } }
              }} />
            </div>
          </div>

          {/* API Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-medium">Total Requests</h3>
              <p className="text-2xl">{report.apiResults?.length || 0}</p>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-medium">Failed</h3>
              <p className="text-2xl text-red-600">
                {report.apiResults?.filter(r => r.status >= 400).length || 0}
              </p>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-medium flex items-center">
                <FiLock className="mr-1" /> HTTPS
              </h3>
              <p className="text-2xl">
                {report.apiResults?.filter(r => r.validation?.isSecure).length || 0}/{report.apiResults?.length || 0}
              </p>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-medium flex items-center">
                <FiClock className="mr-1" /> Avg Time
              </h3>
              <p className="text-2xl">
                {report.apiResults?.reduce((sum, req) => sum + (req.validation?.responseTime || 0), 0) / (report.apiResults?.length || 1) || 0}ms
              </p>
            </div>
          </div>

          {/* API Requests Table */}
          <div className="overflow-x-auto">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>HTTPS</th>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {report.apiResults?.map((req, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className={`font-mono ${req.method === 'GET' ? 'text-green-600' : 'text-blue-600'}`}>
                      {req.method}
                    </td>
                    <td className="text-xs max-w-xs truncate">{req.url}</td>
                    <td>
                      {renderStatusIcon(req.status)}
                      {req.status}
                    </td>
                    <td className={req.validation?.isSecure ? 'text-green-600' : 'text-red-600'}>
                      {req.validation?.isSecure ? <FiLock /> : <FiUnlock />}
                    </td>
                    <td>
                      {req.validation?.responseTime || 'N/A'}ms
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedApi(req)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FiExternalLink />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>

        {/* API Detail Modal */}
        {selectedApi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">API Request Details</h3>
                <button 
                  onClick={() => setSelectedApi(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">Request</h4>
                  <p><strong>Method:</strong> <span className="font-mono">{selectedApi.method}</span></p>
                  <p><strong>URL:</strong> <span className="font-mono break-all">{selectedApi.url}</span></p>
                  <p><strong>Timestamp:</strong> {new Date(selectedApi.timestamp).toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">Response</h4>
                  <p><strong>Status:</strong> {selectedApi.status}</p>
                  <p><strong>Time:</strong> {selectedApi.validation?.responseTime || 'N/A'}ms</p>
                  <p><strong>Secure:</strong> {selectedApi.validation?.isSecure ? '✅' : '❌'}</p>
                  <p><strong>Cached:</strong> {selectedApi.validation?.hasCacheHeaders ? '✅' : '❌'}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Response Headers</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedApi.response?.headers || {}, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Response Body</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-60">
                  {selectedApi.response?.body || 'No body content'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Security Analysis */}
        <section className="mb-8 card">
          <h2 className="text-xl font-semibold mb-4">Security Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 rounded">
              <h3 className="font-medium">SQL Injection</h3>
              <p>{report.securityResults?.sqlInjection || 'N/A'}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <h3 className="font-medium">XSS Protection</h3>
              <p>{report.securityResults?.xss || 'N/A'}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-medium">Authentication</h3>
              <p>{report.securityResults?.authentication || 'N/A'}</p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-medium">Data Encryption</h3>
              <p>{report.securityResults?.dataEncryption || 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* Responsive Screenshots */}
        <section className="mb-8 card">
          <h2 className="text-xl font-semibold mb-4">Responsive Screenshots</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Mobile', 'Tablet', 'Desktop'].map((device) => (
              <div key={device} className="bg-white p-4 rounded">
                <h3 className="font-medium text-center mb-2">{device}</h3>
                <img 
                  src={`screenshot-${device}.png`} 
                  alt={`${device} screenshot`}
                  className="w-full h-auto border border-gray-200 rounded"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportDashboard;