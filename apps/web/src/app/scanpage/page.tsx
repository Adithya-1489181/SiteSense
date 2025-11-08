"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function ScanPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [showRecentUrls, setShowRecentUrls] = useState(false);
    const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load recent scans from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('recentScans');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Convert timestamp strings back to Date objects
            const scansWithDates = parsed.map((scan: any) => ({
                ...scan,
                timestamp: new Date(scan.timestamp)
            }));
            setRecentScans(scansWithDates);
        }
    }, []);

    // Save recent scans to localStorage whenever they change
    useEffect(() => {
        if (recentScans.length > 0) {
            localStorage.setItem('recentScans', JSON.stringify(recentScans));
        }
    }, [recentScans]);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        if (e.target.value.length > 0) {
            setShowRecentUrls(true);
        }
    };

    const handleStartScan = async () => {
        if (!url) return;

        setIsScanning(true);

        // Create a new scan entry
        const newScan: ScanResult = {
            url,
            timestamp: new Date(),
            scanType: 'full',
            status: 'scanning'
        };

        // Add to recent scans
        setRecentScans(prev => [newScan, ...prev.slice(0, 9)]); // Keep last 10

        // Simulate scan process (replace with actual API call)
        setTimeout(() => {
            // Generate scores across all ranges (low: ≤30, medium: 31-70, high: >70)
            const generateScore = () => {
                const rand = Math.random();
                if (rand < 0.33) {
                    // Low score: 10-30
                    return Math.floor(Math.random() * 21) + 10;
                } else if (rand < 0.67) {
                    // Medium score: 31-70
                    return Math.floor(Math.random() * 40) + 31;
                } else {
                    // High score: 71-100
                    return Math.floor(Math.random() * 30) + 71;
                }
            };

            // Generate mock results
            const mockResults = {
                performance: { 
                    score: generateScore(),
                    metrics: {
                        loadTime: (Math.random() * 2 + 1).toFixed(2) + 's',
                        firstContentfulPaint: (Math.random() * 1 + 0.5).toFixed(2) + 's',
                        timeToInteractive: (Math.random() * 3 + 1).toFixed(2) + 's'
                    }
                },
                seo: { 
                    score: generateScore(),
                    issues: [
                        'Missing meta description',
                        'Image alt tags needed',
                        'H1 tag optimization suggested'
                    ]
                },
                ux: { 
                    score: generateScore(),
                    recommendations: [
                        'Improve mobile responsiveness',
                        'Enhance color contrast',
                        'Add ARIA labels for accessibility'
                    ]
                },
                security: { 
                    score: generateScore(),
                    vulnerabilities: [
                        'SSL certificate valid',
                        'No mixed content detected'
                    ]
                }
            };

            const overallScore = Math.floor(
                (mockResults.performance.score + 
                 mockResults.seo.score + 
                 mockResults.ux.score + 
                 mockResults.security.score) / 4
            );

            const finalResults = { ...mockResults, overall: overallScore };

            // Update the scan with results
            setRecentScans(prev => 
                prev.map((scan, idx) => 
                    idx === 0 ? { ...scan, status: 'success' as const, results: finalResults } : scan
                )
            );

            setIsScanning(false);
        }, 3000);
    };

    const selectRecentUrl = (recentUrl: string) => {
        setUrl(recentUrl);
        setShowRecentUrls(false);
    };

    const handleDeleteScan = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedScans = recentScans.filter((_, idx) => idx !== index);
        setRecentScans(updatedScans);
        
        // Update localStorage
        if (updatedScans.length > 0) {
            localStorage.setItem('recentScans', JSON.stringify(updatedScans));
        } else {
            localStorage.removeItem('recentScans');
        }
    };

    // Get unique URLs for suggestions
    const uniqueUrls = Array.from(new Set(recentScans.map(scan => scan.url)));
    
    // Filter suggestions based on input
    const filteredSuggestions = uniqueUrls.filter(u => 
        u.toLowerCase().includes(url.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f9fafb] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">
                        Website Scan Center
                    </h1>
                    <p className="text-secondary">
                        Analyze your website's health and performance with one click.
                    </p>
                </div>

                {/* URL Input Section */}
                <div className="bg-white rounded-2xl shadow-md border p-6 mb-6">
                    <div className="space-y-4">
                        {/* Combined URL Input Field with Dropdown */}
                        <div className="relative">
                            <label htmlFor="url" className="block text-sm font-medium text-primary mb-2">
                                Website URL
                            </label>
                            <div className="relative">
                                <input
                                    type="url"
                                    id="url"
                                    value={url}
                                    onChange={handleUrlChange}
                                    onFocus={() => setShowRecentUrls(true)}
                                    placeholder="https://example.com"
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRecentUrls(!showRecentUrls)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {/* Recent URLs Dropdown */}
                                {showRecentUrls && filteredSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                                        <div className="py-1">
                                            <div className="px-4 py-2 text-xs font-medium text-secondary uppercase tracking-wide border-b">
                                                Recent URLs
                                            </div>
                                            {filteredSuggestions.map((recentUrl, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => selectRecentUrl(recentUrl)}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-primary transition-colors"
                                                >
                                                    {recentUrl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Start Scan Button */}
                        <button
                            onClick={handleStartScan}
                            disabled={!url || isScanning}
                            className="w-full button-bg text-tertiary font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isScanning ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Scanning...
                                </>
                            ) : (
                                'Start Scan'
                            )}
                        </button>
                    </div>
                </div>

                {/* Recently Scanned URLs Section */}
                {recentScans.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-primary mb-4">Recently Scanned</h2>
                        <div className="space-y-3">
                            {recentScans.map((scan, index) => (
                                <div
                                    key={index}
                                    className={`bg-white rounded-2xl shadow-md border p-4 transition-all duration-200 ${
                                        scan.status !== 'scanning' 
                                            ? 'hover:shadow-xl hover:-translate-y-1' 
                                            : 'opacity-70'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-medium text-primary truncate">
                                                    {scan.url}
                                                </h3>
                                                {scan.status === 'success' && scan.results?.overall && (
                                                    <Badge 
                                                        className={`${
                                                            scan.results.overall > 70 
                                                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                                                : scan.results.overall > 30 
                                                                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                                                : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                    >
                                                        Score: {scan.results.overall}
                                                    </Badge>
                                                )}
                                                {scan.status === 'scanning' && (
                                                    <Badge variant="secondary">
                                                        <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Scanning
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-secondary">
                                                <span className="capitalize">{scan.scanType} Scan</span>
                                                <span>•</span>
                                                <span>{formatTimestamp(scan.timestamp)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteScan(index, e)}
                                                className={`p-1 rounded transition-colors ${
                                                    scan.status === 'scanning'
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                                }`}
                                                title={scan.status === 'scanning' ? 'Cannot delete while scanning' : 'Delete scan'}
                                                disabled={scan.status === 'scanning'}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            {scan.status !== 'scanning' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/scans/${index}`);
                                                        }}
                                                        className="button-bg text-tertiary text-xs font-medium px-3 py-1 rounded transition-all hover:scale-105"
                                                    >
                                                        View Details
                                                    </button>
                                                    <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}

function formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}