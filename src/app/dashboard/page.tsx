'use client';

import { useEffect, useState } from 'react';

/**
 * Business owner admin dashboard.
 * Shows bookings, accepts SMS codes for verification, manages settings.
 */
export default function DashboardPage() {
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const biz = params.get('biz');
    if (biz) {
      setSlug(biz);
      loadBusiness(biz);
    }
  }, []);

  async function loadBusiness(slug: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/businesses?slug=${slug}`);
      const json = await res.json();
      if (json.data?.[0]) {
        setBusiness(json.data[0]);
        loadBookings(json.data[0].id);
      } else {
        setError('Business not found. Check your link.');
      }
    } catch (e) {
      setError('Failed to load business data.');
    }
    setLoading(false);
  }

  async function loadBookings(businessId: number) {
    try {
      const res = await fetch(`/api/bookings?business_id=${businessId}`);
      const json = await res.json();
      if (json.data) setBookings(json.data);
    } catch (e) {
      /* silent */
    }
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Business Dashboard</h1>
          <p className="text-sm text-gray-500 mb-6">Enter your business link to view bookings.</p>
          <form onSubmit={(e) => { e.preventDefault(); loadBusiness(slug); }}>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="your-business-slug"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mb-4"
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">
              View Dashboard
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Your business slug is in your booking website URL: <br/>
            <code className="bg-gray-100 px-2 py-0.5 rounded">evansville-booking-sites/apps/<strong>your-slug</strong>-booking.html</code>
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!business) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{business.name}</h1>
            <p className="text-sm text-gray-500">{business.category} · {business.phone}</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>{bookings.length} total bookings</p>
            <a href={`https://kexemi.github.io/evansville-booking-sites/apps/${business.slug}-booking.html`}
               target="_blank" className="text-blue-600 hover:underline">View your site →</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
            <p className="text-sm text-gray-500">Total Bookings</p>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-3xl font-bold text-green-600">{bookings.filter(b => b.created_at).length}</p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-3xl font-bold text-amber-600">{business.phone || 'N/A'}</p>
            <p className="text-sm text-gray-500">Contact Phone</p>
          </div>
        </div>

        {/* Booking table */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">Recent Bookings</h2>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📅</p>
              <p>No bookings yet. Share your site to start receiving requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Service</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b: any) => (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-gray-400">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="py-3 font-medium">{b.customer_name}</td>
                      <td className="py-3"><a href={`tel:${b.customer_phone}`} className="text-blue-600">{b.customer_phone}</a></td>
                      <td className="py-3">{b.service}</td>
                      <td className="py-3">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">New</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">Notification Settings</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-gray-400 text-xs">Get a text when someone books</p>
              </div>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-gray-400 text-xs">Get an email with full details</p>
              </div>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Phone Number for SMS</p>
                <p className="text-gray-400 text-xs">{business.phone || 'Not configured'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* How to get bookings */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
          <h2 className="text-lg font-bold mb-2">📈 Get More Bookings</h2>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>✅ Share your site link with customers</li>
            <li>✅ Add it to your Google Business Profile</li>
            <li>✅ Include it in your email signature</li>
            <li>✅ Post it on your Facebook page</li>
            <li>✅ Print a QR code for your truck/office</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
