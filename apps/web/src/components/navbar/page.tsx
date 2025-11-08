
export default function navbar() {
    return (
        <div>
            <header className="sticky top-0 z-50 bg-white p-5 border-b flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-4">
            <img src="/images/logo.png" alt="SiteSense Logo" className="h-10 w-auto" />
            <h1 className="text-3xl font-bold text-primary">SiteSense</h1>
          </div>
          <nav className="text-secondary text-6xsm text-right space-x-4 flex items-center">
            <a href="#" className="hover:underline"></a>
            <a href="#" className="hover:underline">Pricing</a>
            <a href="#" className="hover:underline">Blog</a>
            <div className = ""></div>
          </nav>
        </header>
        </div>
    )
} 