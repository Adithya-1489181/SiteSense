"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/footer';

interface ScanResult {
    url: string;
    timestamp: Date;
    scanType: string;
    status: 'success' | 'error' | 'scanning';
    results?: {
        performance?: { score: number; metrics: any };
        seo?: { score: number; issues: string[] };
        ux?: { score: number; recommendations: string[] };
        security?: { score: number; vulnerabilities: string[] };
        overall?: number;
    };
}

interface Issue {
    title: string;
    severity: 'critical' | 'major' | 'minor';
    impact: number;
    effort: number;
    module: string;
    fixed: boolean;
}

export default function ScanReportPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'actions'>('overview');
    const [issues, setIssues] = useState<Issue[]>([
        { title: 'Optimize image sizes', severity: 'major', impact: 8, effort: 3, module: 'Performance', fixed: false },
        { title: 'Add meta descriptions', severity: 'critical', impact: 9, effort: 2, module: 'SEO', fixed: false },
        { title: 'Improve color contrast', severity: 'minor', impact: 5, effort: 4, module: 'UX', fixed: true },
        { title: 'Enable HTTPS', severity: 'critical', impact: 10, effort: 5, module: 'Security', fixed: false },
        { title: 'Minify CSS files', severity: 'minor', impact: 4, effort: 2, module: 'Performance', fixed: true },
        { title: 'Fix broken links', severity: 'major', impact: 7, effort: 3, module: 'SEO', fixed: false },
        { title: 'Add ARIA labels', severity: 'major', impact: 6, effort: 5, module: 'UX', fixed: false },
        { title: 'Update SSL certificate', severity: 'minor', impact: 3, effort: 1, module: 'Security', fixed: true },
    ]);

    useEffect(() => {
        const stored = localStorage.getItem('recentScans');
        if (stored) {
            const scans = JSON.parse(stored);
            const scanIndex = parseInt(params.id);
            if (scans[scanIndex]) {
                setScan({
                    ...scans[scanIndex],
                    timestamp: new Date(scans[scanIndex].timestamp)
                });
            }
        }
    }, [params.id]);

    const toggleIssue = (index: number) => {
        setIssues(prevIssues => 
            prevIssues.map((issue, i) => 
                i === index ? { ...issue, fixed: !issue.fixed } : issue
            )
        );
    };

    const downloadPDF = async () => {
        if (!scan) return;
        
        try {
            // Dynamic imports
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            // Get the dashboard content
            const dashboardElement = document.getElementById('dashboard-content');
            if (!dashboardElement) {
                alert('Dashboard content not found');
                return;
            }

            // Show loading state
            const loadingToast = document.createElement('div');
            loadingToast.className = 'fixed top-4 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50';
            loadingToast.textContent = 'Generating PDF...';
            document.body.appendChild(loadingToast);

            // Capture all tabs by temporarily rendering them
            const originalTab = activeTab;
            const tabs: ('overview' | 'recommendations' | 'actions')[] = ['overview', 'recommendations', 'actions'];
            const captures: HTMLCanvasElement[] = [];

            for (const tab of tabs) {
                // Switch to tab
                setActiveTab(tab);
                
                // Wait for render
                await new Promise(resolve => setTimeout(resolve, 500));

                // Capture the content
                const canvas = await html2canvas(dashboardElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#f9fafb'
                });
                
                captures.push(canvas);
            }

            // Restore original tab
            setActiveTab(originalTab);

            // Create PDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Add header with logo and title on first page
            pdf.setFillColor(30, 29, 29);
            pdf.rect(0, 0, pdfWidth, 35, 'F');
            
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text('SiteSense', 15, 15);
            
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Website Health Report', 15, 24);
            
            pdf.setFontSize(10);
            pdf.text(scan.url, 15, 30);
            pdf.text(new Date(scan.timestamp).toLocaleDateString(), pdfWidth - 15, 30, { align: 'right' });

            let yOffset = 40;

            // Add each captured tab
            tabs.forEach((tab, index) => {
                const canvas = captures[index];
                const imgWidth = pdfWidth - 20;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const imgData = canvas.toDataURL('image/png');

                // Add new page if not first tab
                if (index > 0) {
                    pdf.addPage();
                    yOffset = 10;
                }

                // Add tab title
                pdf.setTextColor(30, 29, 29);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(tab.charAt(0).toUpperCase() + tab.slice(1), 10, yOffset);
                yOffset += 8;

                // Calculate how many pages needed for this image
                let remainingHeight = imgHeight;
                let sourceY = 0;

                while (remainingHeight > 0) {
                    const availableHeight = pdfHeight - yOffset - 10;
                    const heightToAdd = Math.min(remainingHeight, availableHeight);
                    const sourceHeight = (heightToAdd / imgHeight) * canvas.height;

                    // Create a temporary canvas for this portion
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = sourceHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    if (tempCtx) {
                        tempCtx.drawImage(
                            canvas,
                            0, sourceY,
                            canvas.width, sourceHeight,
                            0, 0,
                            canvas.width, sourceHeight
                        );
                        
                        const partialImgData = tempCanvas.toDataURL('image/png');
                        pdf.addImage(partialImgData, 'PNG', 10, yOffset, imgWidth, heightToAdd);
                    }

                    remainingHeight -= heightToAdd;
                    sourceY += sourceHeight;

                    if (remainingHeight > 0) {
                        pdf.addPage();
                        yOffset = 10;
                    }
                }
            });

            // Add footer to all pages
            const totalPages = pdf.internal.pages.length - 1;
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(
                    `Generated by SiteSense | Page ${i} of ${totalPages}`,
                    pdfWidth / 2,
                    pdfHeight - 10,
                    { align: 'center' }
                );
            }

            // Save PDF
            pdf.save(`SiteSense-Report-${scan.url.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);

            // Remove loading toast
            document.body.removeChild(loadingToast);

            // Show success message
            const successToast = document.createElement('div');
            successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            successToast.textContent = 'PDF downloaded successfully!';
            document.body.appendChild(successToast);
            setTimeout(() => document.body.removeChild(successToast), 3000);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (!scan || scan.status !== 'success' || !scan.results) {
        return (
            <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-primary mb-2">Loading...</h1>
                    <button onClick={() => router.push('/scanpage')} className="button-bg text-tertiary px-6 py-2 rounded-lg mt-4">
                        Back to Scans
                    </button>
                </div>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score > 70) return { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-600' };
        if (score > 30) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50', border: 'border-yellow-500' };
        return { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-600' };
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-300';
            case 'major': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'minor': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;
    const fixedIssues = issues.filter(i => i.fixed).length;
    const totalIssues = issues.length;

    const modules = [
        { name: 'Performance', score: scan.results.performance?.score || 0, icon: '⚡' },
        { name: 'SEO', score: scan.results.seo?.score || 0, icon: '🔍' },
        { name: 'UX', score: scan.results.ux?.score || 0, icon: '🎨' },
        { name: 'Security', score: scan.results.security?.score || 0, icon: '🔒' }
    ];

    // Radar Chart Component (SVG-based)
    const RadarChart = () => {
        const scores = modules.map(m => m.score);
        const maxScore = 100;
        const centerX = 150;
        const centerY = 150;
        const radius = 100;
        const angles = [0, 90, 180, 270];

        const getPoint = (score: number, angleIndex: number) => {
            const angle = (angles[angleIndex] - 90) * (Math.PI / 180);
            const distance = (score / maxScore) * radius;
            return {
                x: centerX + distance * Math.cos(angle),
                y: centerY + distance * Math.sin(angle)
            };
        };

        const dataPoints = scores.map((score, i) => getPoint(score, i));
        const pathData = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

        return (
            <svg viewBox="0 0 300 300" className="w-full h-full">
                {/* Grid circles */}
                {[20, 40, 60, 80, 100].map(level => (
                    <circle key={level} cx={centerX} cy={centerY} r={(level / 100) * radius} fill="none" stroke="#e5e7eb" strokeWidth="1" />
                ))}
                {/* Axis lines */}
                {modules.map((_, i) => {
                    const endPoint = getPoint(100, i);
                    return <line key={i} x1={centerX} y1={centerY} x2={endPoint.x} y2={endPoint.y} stroke="#e5e7eb" strokeWidth="1" />;
                })}
                {/* Data polygon */}
                <path d={pathData} fill="rgba(30, 29, 29, 0.2)" stroke="#1E1D1D" strokeWidth="2" />
                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#1E1D1D" />
                ))}
                {/* Labels */}
                {modules.map((module, i) => {
                    const labelPoint = getPoint(115, i);
                    return (
                        <text key={i} x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="text-xs font-medium fill-primary">
                            {module.icon} {module.name}
                        </text>
                    );
                })}
            </svg>
        );
    };

    // Donut Chart Component
    const DonutChart = ({ score, size = 120 }: { score: number; size?: number }) => {
        const strokeWidth = 10;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const progress = (score / 100) * circumference;
        const color = getScoreColor(score);

        return (
            <div className="relative inline-block" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color.bg.replace('bg-', '#')}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                        className={color.bg}
                        style={{ stroke: color.bg === 'bg-green-600' ? '#16a34a' : color.bg === 'bg-yellow-500' ? '#eab308' : '#dc2626' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${color.text}`}>{score}</span>
                    <span className="text-xs text-gray-500">/ 100</span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button 
                        onClick={() => router.push('/scanpage')} 
                        className="text-gray-600 hover:text-primary mb-6 flex items-center gap-2 font-medium transition-colors group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Scans
                    </button>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Health Dashboard</h1>
                                <p className="text-gray-600 text-lg font-medium">{scan.url}</p>
                            </div>
                            <div className="flex items-start gap-4">
                                <button
                                    onClick={downloadPDF}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium text-sm group"
                                >
                                    <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download PDF
                                </button>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 text-sm font-semibold">
                                        {new Date(scan.timestamp).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                        {new Date(scan.timestamp).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Content - Wrapped for PDF export */}
                <div id="dashboard-content">
                    {/* Tabs */}
                    <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 px-6">
                        <div className="flex gap-1">
                            {(['overview', 'recommendations', 'actions'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 px-6 text-sm font-semibold capitalize transition-all relative ${
                                        activeTab === tab
                                            ? 'text-primary'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* 6. Scoreboard (KPIs) - Score Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <Card className="bg-gradient-to-br from-primary to-gray-800 border-0 shadow-lg">
                                <CardContent className="pt-6 pb-6">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-300 uppercase tracking-wider mb-2">Overall Score</div>
                                        <div className="text-5xl font-bold text-white mb-1">{scan.results.overall}</div>
                                        <div className="text-xs text-gray-300">out of 100</div>
                                    </div>
                                </CardContent>
                            </Card>
                            {modules.map((module) => (
                                <Card key={module.name} className={`bg-white border-2 ${getScoreColor(module.score).border} hover:shadow-md transition-shadow`}>
                                    <CardContent className="pt-6 pb-6">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-3">{module.name}</div>
                                            <div className={`text-4xl font-bold mb-1 ${getScoreColor(module.score).text}`}>{module.score}</div>
                                            <div className="text-xs text-gray-500">score</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 1. Radar Chart - Website Health Summary */}
                            <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="text-lg font-bold text-gray-900">Website Health Balance</CardTitle>
                                    <CardDescription className="text-gray-600">Overall module performance visualization</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-center" style={{ height: '300px' }}>
                                        <RadarChart />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 5. Issue Severity Breakdown - Donut Chart */}
                            <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="text-lg font-bold text-gray-900">Issue Severity Breakdown</CardTitle>
                                    <CardDescription className="text-gray-600">Distribution of issues by severity</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-around h-64">
                                        <div className="text-center">
                                            <div className="relative inline-block w-32 h-32 mb-3">
                                                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#fee2e2" strokeWidth="20" />
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="none"
                                                        stroke="#dc2626"
                                                        strokeWidth="20"
                                                        strokeDasharray={`${(criticalIssues / totalIssues) * 251.2} 251.2`}
                                                        strokeDashoffset="0"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-2xl font-bold text-red-600">{criticalIssues}</span>
                                                </div>
                                            </div>
                                            <div className="text-sm font-medium text-gray-700">Critical</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="relative inline-block w-32 h-32 mb-3">
                                                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ffedd5" strokeWidth="20" />
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="none"
                                                        stroke="#f97316"
                                                        strokeWidth="20"
                                                        strokeDasharray={`${(majorIssues / totalIssues) * 251.2} 251.2`}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-2xl font-bold text-orange-600">{majorIssues}</span>
                                                </div>
                                            </div>
                                            <div className="text-sm font-medium text-gray-700">Major</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="relative inline-block w-32 h-32 mb-3">
                                                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#fef9c3" strokeWidth="20" />
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="none"
                                                        stroke="#eab308"
                                                        strokeWidth="20"
                                                        strokeDasharray={`${(minorIssues / totalIssues) * 251.2} 251.2`}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-2xl font-bold text-yellow-600">{minorIssues}</span>
                                                </div>
                                            </div>
                                            <div className="text-sm font-medium text-gray-700">Minor</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 2. Individual Module Scores - Donut Charts */}
                        <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg font-bold text-gray-900">Module Score Details</CardTitle>
                                <CardDescription className="text-gray-600">Individual performance metrics for each module</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {modules.map((module) => (
                                        <div key={module.name} className="text-center">
                                            <DonutChart score={module.score} size={120} />
                                            <div className="mt-3">
                                                <div className="text-sm font-semibold text-gray-700 mb-1">
                                                    {module.name}
                                                </div>
                                                <div className={`text-2xl font-bold ${getScoreColor(module.score).text}`}>
                                                    {module.score}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 8. Comparative Benchmarking - Minimalist Design */}
                        <Card className="bg-white shadow-sm border border-gray-200">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg font-bold text-gray-900">Industry Benchmarks</CardTitle>
                                <CardDescription className="text-gray-600">Compare with industry standards</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {modules.map((module) => {
                                        // Industry benchmarks based on web.dev and Lighthouse standards
                                        const industryBenchmarks: { [key: string]: number } = {
                                            'Performance': 72,
                                            'SEO': 78,
                                            'UX': 68,
                                            'Security': 75
                                        };
                                        const industryAvg = industryBenchmarks[module.name] || 70;
                                        const difference = module.score - industryAvg;
                                        const isAbove = difference > 0;
                                        
                                        return (
                                            <div key={module.name} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">{module.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-500">Industry: {industryAvg}</span>
                                                        <span className={`text-sm font-bold ${getScoreColor(module.score).text}`}>
                                                            {module.score}
                                                        </span>
                                                        <span className={`text-xs font-medium ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                                                            {isAbove ? '↑' : '↓'}{Math.abs(difference)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${getScoreColor(module.score).bg} transition-all duration-500 rounded-full`}
                                                        style={{ width: `${module.score}%` }}
                                                    />
                                                    <div 
                                                        className="absolute top-0 h-full w-0.5 bg-gray-400"
                                                        style={{ left: `${industryAvg}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                    <div className="space-y-6">
                        {/* 3. Priority Impact vs Effort - Scatter Plot */}
                        <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg font-bold text-gray-900">Priority Impact vs Effort Analysis</CardTitle>
                                <CardDescription className="text-gray-600">Identify high-impact, low-effort fixes (top-left quadrant)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative h-96 border-2 border-gray-200 rounded-lg">
                                    <svg className="w-full h-full">
                                        {/* Grid lines */}
                                        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4" />
                                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4" />
                                        
                                        {/* Quadrant labels */}
                                        <text x="25%" y="25%" textAnchor="middle" className="text-xs fill-green-600 font-semibold">
                                            High Impact, Low Effort
                                        </text>
                                        <text x="75%" y="25%" textAnchor="middle" className="text-xs fill-orange-600 font-semibold">
                                            High Impact, High Effort
                                        </text>
                                        <text x="25%" y="75%" textAnchor="middle" className="text-xs fill-gray-400 font-semibold">
                                            Low Impact, Low Effort
                                        </text>
                                        <text x="75%" y="75%" textAnchor="middle" className="text-xs fill-red-600 font-semibold">
                                            Low Impact, High Effort
                                        </text>
                                        
                                        {/* Data points */}
                                        {issues.map((issue, idx) => {
                                            const x = (issue.effort / 10) * 100;
                                            const y = 100 - (issue.impact / 10) * 100;
                                            const color = issue.severity === 'critical' ? '#dc2626' : issue.severity === 'major' ? '#f97316' : '#eab308';
                                            return (
                                                <g key={idx}>
                                                    <circle cx={`${x}%`} cy={`${y}%`} r="8" fill={color} opacity="0.7" />
                                                    <title>{issue.title}</title>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    {/* Axis labels */}
                                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                                        Effort →
                                    </div>
                                    <div className="absolute top-1/2 left-2 transform -translate-y-1/2 -rotate-90 text-xs font-medium text-gray-600">
                                        Impact →
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                        <span className="text-xs text-gray-600">Critical</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                                        <span className="text-xs text-gray-600">Major</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                                        <span className="text-xs text-gray-600">Minor</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 9. Audit Log Summary - Dynamic Table */}
                        <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg font-bold text-gray-900">Recommendations Audit Log</CardTitle>
                                <CardDescription className="text-gray-600">Detailed list of all identified issues and their priorities</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-gray-200">
                                                <th className="text-left p-3 font-semibold text-primary">Issue</th>
                                                <th className="text-left p-3 font-semibold text-primary">Module</th>
                                                <th className="text-center p-3 font-semibold text-primary">Severity</th>
                                                <th className="text-center p-3 font-semibold text-primary">Impact</th>
                                                <th className="text-center p-3 font-semibold text-primary">Effort</th>
                                                <th className="text-center p-3 font-semibold text-primary">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {issues
                                                .sort((a, b) => {
                                                    const severityOrder: { [key: string]: number } = { critical: 0, major: 1, minor: 2 };
                                                    return severityOrder[a.severity] - severityOrder[b.severity];
                                                })
                                                .map((issue, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                        <td className="p-3 font-medium text-gray-800">{issue.title}</td>
                                                        <td className="p-3 text-gray-600">{issue.module}</td>
                                                        <td className="p-3">
                                                            <Badge className={`${getSeverityColor(issue.severity)} border text-xs`}>
                                                                {issue.severity.toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-semibold text-primary">{issue.impact}/10</span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-semibold text-primary">{issue.effort}/10</span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {issue.fixed ? (
                                                                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">Fixed</Badge>
                                                            ) : (
                                                                <Badge className="bg-gray-100 text-gray-800 border-gray-300 text-xs">Pending</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                    <div className="space-y-6">
                        {/* 7. Task Completion Tracker - Progress Bars */}
                        <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg font-bold text-gray-900">Task Completion Tracker</CardTitle>
                                <CardDescription className="text-gray-600">Track your progress on fixing identified issues</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Overall Progress */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-primary">Overall Progress</span>
                                            <span className="text-sm text-secondary">
                                                {fixedIssues} of {totalIssues} issues resolved ({Math.round((fixedIssues / totalIssues) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-600 transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${(fixedIssues / totalIssues) * 100}%` }}
                                            >
                                                <span className="text-xs font-semibold text-white">{Math.round((fixedIssues / totalIssues) * 100)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Severity */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary mb-3">Progress by Severity</h3>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Critical', count: criticalIssues, fixed: issues.filter(i => i.severity === 'critical' && i.fixed).length, color: 'bg-red-600' },
                                                { label: 'Major', count: majorIssues, fixed: issues.filter(i => i.severity === 'major' && i.fixed).length, color: 'bg-orange-600' },
                                                { label: 'Minor', count: minorIssues, fixed: issues.filter(i => i.severity === 'minor' && i.fixed).length, color: 'bg-yellow-600' }
                                            ].map(({ label, count, fixed, color }) => (
                                                <div key={label}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-gray-700">{label} Issues</span>
                                                        <span className="text-xs text-gray-500">{fixed} / {count}</span>
                                                    </div>
                                                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${count > 0 ? (fixed / count) * 100 : 0}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Checklist */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary mb-3">Issue Checklist</h3>
                                        <div className="space-y-2">
                                            {issues.map((issue, idx) => (
                                                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                                                    issue.fixed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => toggleIssue(idx)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={issue.fixed}
                                                        onChange={() => toggleIssue(idx)}
                                                        className="w-5 h-5 rounded accent-green-600 cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex-1">
                                                        <div className={`text-sm font-medium transition-all ${issue.fixed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {issue.title}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {issue.module} • Impact: {issue.impact}/10 • Effort: {issue.effort}/10
                                                        </div>
                                                    </div>
                                                    <Badge className={`${getSeverityColor(issue.severity)} border text-xs`}>
                                                        {issue.severity}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                </div>
                {/* End Dashboard Content */}
            </div>
            <Footer />
        </div>
    );
}
