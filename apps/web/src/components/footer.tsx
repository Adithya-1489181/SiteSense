import React from 'react';

export default function Footer() {
    return (
        <footer className="mt-auto p-5 border-t text-center bg-primary text-tertiary text-sm">
            &copy; {new Date().getFullYear()} SiteSense. All rights reserved.
        </footer>
    );
}
