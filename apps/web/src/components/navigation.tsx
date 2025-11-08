"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home' },
        { href: '/scanpage', label: 'Scan' }
    ];

    return (
        <header className="sticky top-0 z-50 bg-white p-5 border-b flex justify-between items-center shadow-sm">
            <div className="flex items-center space-x-4">
                <img src="/images/logo.png" alt="SiteSense Logo" className="h-10 w-auto" />
                <h1 className="text-3xl font-bold text-primary">SiteSense</h1>
            </div>
            <nav className="text-secondary text-xl flex items-center space-x-6">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            className={`transition-colors ${
                                isActive
                                    ? 'text-primary font-semibold'
                                    : 'hover:text-primary hover:underline'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
