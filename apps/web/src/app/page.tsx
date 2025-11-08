import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex-col">
      <div className="min-h-[82vh] w-full bg-[#f9fafb] relative">
        <div
          className="absolute inset-0 z-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, #d1d5db 1px, transparent 1px),
              linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
            `,
            backgroundSize: "25px 25px",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 85% at 50% 50%, #000 30%, transparent 70%)",
            maskImage:
              "radial-gradient(ellipse 90% 85% at 50% 50%, #000 30%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4 py-8 relative z-1 space-y-6">
          <h1 className="text-6xl font-bold text-center text-primary">
            A Unified & Actionable View of Overall Website Health
          </h1>
          <p className="text-center text-lg text-secondary mx-16">
            Are you a Web-Developer, Freelancer or Student, trying to build an optimized web? 
            <b> SiteSense</b> helps you test the <b>Performance</b>, <b>UX</b>, <b>SEO</b> and <b>Security</b> of your website — all in one place.
          </p>
          <h2 className="text-3xl font-semibold text-center text-primary">Run Anywhere - Your Way</h2>
        </div>
        <div className="flex justify-center space-x-20 relative z-1">
          <div className="flex space-x-8">
            <div className="bg-white rounded-2xl shadow-md transition-transform transition-shadow duration-200 hover:shadow-xl hover:-translate-y-1 p-8 w-80 flex flex-col items-center">
              <div className="w-full flex flex-col items-start">
                <h2 className="text-2xl font-semibold mb-2 text-primary text-left w-full">Hosted Websites</h2>
                <p className="text-secondary mb-4 text-left w-full">
                  Got a website? Drop your URL and get instant insights — no installs, no juggling, just results!
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md transition-transform transition-shadow duration-200 hover:shadow-xl hover:-translate-y-1 p-8 w-80 flex flex-col items-center">
              <div className="w-full flex flex-col items-start">
                <h2 className="text-2xl font-semibold mb-2 text-primary text-left w-full">Local Host</h2>
                <p className="text-secondary mb-4 text-left w-full">
                  Your localhost, tested instantly. No installs, no juggling, just results.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center relative z-1 mt-4">
          <Link href="/scanpage" className="mt-auto px-6 py-2 rounded-lg button-bg text-tertiary font-medium">
                Start Audit
          </Link>
        </div>
      </div>
      <footer className="mt-auto p-5 border-t text-center bg-primary text-tertiary text-sm">
        &copy; {new Date().getFullYear()} SiteSense. All rights reserved.
      </footer>
    </div>
  );
}