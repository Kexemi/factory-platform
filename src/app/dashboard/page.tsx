'use client';

import { useEffect, useState } from 'react';

type Tab = 'dashboard' | 'bookings' | 'reviews' | 'estimates' | 'dispatch' | 'subscriptions' | 'marketing' | 'gbp' | 'analytics' | 'settings';

export default function BizDashboard() {
  const [slug, setSlug] = useState('');
  const [biz, setBiz] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>({});
  const [phone, setPhone] = useState('');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('biz');
    if (s) { setSlug(s); loadBiz(s); }
  }, []);

  async function loadBiz(s: string) {
    const r = await fetch(`/api/businesses?slug=${s}`);
    const j = await r.json();
    if (j.data?.[0]) setBiz(j.data[0]);
  }

  async function loadTab(t: Tab) {
    setTab(t);
    if (!biz) return;
    const endpoints: Record<string, string> = {
      bookings: `/api/bookings?business_id=${biz.id}`,
      reviews: `/api/reviews?business_id=${biz.id}`,
      estimates: `/api/estimates?business_id=${biz.id}`,
      dispatch: `/api/dispatch?business_id=${biz.id}`,
      subscriptions: `/api/subscriptions?business_id=${biz.id}`,
      marketing: `/api/marketing?business_id=${biz.id}`,
      gbp: `/api/gbp?business_id=${biz.id}`,
      analytics: `/api/analytics?business_id=${biz.id}`,
    };
    if (t === 'dashboard') {
      // Load analytics + recent bookings
      const [a, b] = await Promise.all([
        fetch(endpoints.analytics).then(r => r.json()),
        fetch(endpoints.bookings).then(r => r.json()),
      ]);
      setData({ analytics: a.data, bookings: b.data });
    } else if (endpoints[t]) {
      const r = await fetch(endpoints[t]);
      const j = await r.json();
      setData(j.data || j);
    }
  }

  function verifyPhone() {
    if (phone === biz?.phone?.replace(/[^0-9]/g, '')?.slice(-6)) {
      setAuthed(true);
      loadTab('dashboard');
    } else {
      alert('Incorrect code. Try the last 6 digits of your business phone.');
    }
  }

  if (!slug) return <LoginScreen onSubmit={setSlug} />;
  if (!biz) return <LoadingScreen />;
  if (!authed) return <VerifyScreen phone={phone} setPhone={setPhone} verify={verifyPhone} bizName={biz.name} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div><h1 className="font-bold text-lg">{biz.name}</h1><p className="text-xs text-gray-400">{biz.category}</p></div>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {(['dashboard','bookings','reviews','estimates','dispatch','subscriptions','marketing','gbp','analytics','settings'] as Tab[]).map(t => (
              <button key={t} onClick={() => loadTab(t)} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${tab === t ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <DashboardTab data={data} biz={biz} />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'reviews' && <ReviewsTab bizId={biz.id} />}
        {tab === 'estimates' && <EstimatesTab bizId={biz.id} />}
        {tab === 'dispatch' && <DispatchTab bizId={biz.id} />}
        {tab === 'subscriptions' && <SubscriptionsTab bizId={biz.id} />}
        {tab === 'marketing' && <MarketingTab bizId={biz.id} />}
        {tab === 'gbp' && <GBPTab bizId={biz.id} />}
        {tab === 'analytics' && <AnalyticsTab bizId={biz.id} />}
        {tab === 'settings' && <SettingsTab biz={biz} />}
      </main>
    </div>
  );
}

function LoginScreen({ onSubmit }: { onSubmit: (s: string) => void }) {
  const [s, setS] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Business Dashboard</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your business slug from your booking site URL.</p>
        <form onSubmit={e => { e.preventDefault(); onSubmit(s); }}>
          <input value={s} onChange={e => setS(e.target.value)} placeholder="your-business-slug" className="w-full border rounded-xl px-4 py-2.5 mb-4" />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Access Dashboard</button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">Slug is in your site URL: .../apps/<strong>your-slug</strong>-booking.html</p>
      </div>
    </div>
  );
}

function LoadingScreen() { return <div className="p-8 text-center text-gray-400">Loading...</div>; }

function VerifyScreen({ phone, setPhone, verify, bizName }: any) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-xl font-bold mb-2">Verify Your Identity</h2>
        <p className="text-sm text-gray-500 mb-6">Enter the last 6 digits of {bizName}'s phone number.</p>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={6} placeholder="230056" className="w-full border rounded-xl px-4 py-2.5 mb-4 text-center text-2xl tracking-widest" />
        <button onClick={verify} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Verify</button>
      </div>
    </div>
  );
}

function DashboardTab({ data, biz }: any) {
  const a = data?.analytics;
  const recent = data?.bookings?.slice(0, 5) || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Bookings" value={a?.total_bookings || 0} icon="📋" />
        <StatCard label="Estimates" value={a?.total_estimates || 0} icon="🔍" />
        <StatCard label="Reviews" value={a?.total_reviews || 0} icon="⭐" />
        <StatCard label="Subscribers" value={a?.active_subscriptions || 0} icon="🔄" />
        <StatCard label="Avg Rating" value={a?.avg_rating || '—'} icon="🏆" />
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold mb-4">Recent Bookings</h2>
        {recent.length === 0 ? <p className="text-gray-400 text-center py-4">No bookings yet. Share your site!</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th><th className="pb-2">Customer</th><th className="pb-2">Service</th><th className="pb-2">Status</th></tr></thead>
            <tbody>{recent.map((b: any) => (
              <tr key={b.id} className="border-b hover:bg-gray-50"><td className="py-2 text-gray-400">{b.created_at?.slice(0, 10)}</td><td className="py-2 font-medium">{b.customer_name}</td><td className="py-2">{b.service}</td><td className="py-2"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">New</span></td></tr>
            ))}</tbody></table>
        )}
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
        <h2 className="font-bold mb-2">📈 Grow Your Business</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <a href={`https://kexemi.github.io/evansville-booking-sites/apps/${biz.slug}-booking.html`} target="_blank" className="bg-white rounded-xl p-3 border hover:shadow-sm">🔗 Your Booking Site</a>
          <button onClick={() => navigator.clipboard.writeText(`https://kexemi.github.io/evansville-booking-sites/apps/${biz.slug}-booking.html`)} className="bg-white rounded-xl p-3 border hover:shadow-sm text-left">📋 Copy Site Link</button>
          <a href={`https://search.google.com/local/posts?lid=${biz.google_place_id || ''}`} target="_blank" className="bg-white rounded-xl p-3 border hover:shadow-sm">📊 Google Business Profile</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold">{icon} {value}</p><p className="text-xs text-gray-500 mt-1">{label}</p></div>;
}

// Placeholder tabs — will be fleshed out in dashboard update
function BookingsTab() { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">All Bookings</h2><p className="text-gray-400">Full booking list with filtering, export, and status management.</p></div>; }
function ReviewsTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Reviews</h2><p className="text-gray-400">Google Reviews, review requests, AI response generator.</p></div>; }
function EstimatesTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Photo Estimates</h2><p className="text-gray-400">Customer-submitted photos with AI-generated price estimates.</p></div>; }
function DispatchTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Dispatch Board</h2><p className="text-gray-400">Calendar view of jobs, technician assignment, route optimization.</p></div>; }
function SubscriptionsTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Recurring Plans</h2><p className="text-gray-400">Manage maintenance plans, auto-billing, customer subscriptions.</p></div>; }
function MarketingTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Marketing Campaigns</h2><p className="text-gray-400">Seasonal reminders, re-engagement, referral programs.</p></div>; }
function GBPTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Google Business Profile</h2><p className="text-gray-400">Posts, review responses, analytics from your GBP.</p></div>; }
function AnalyticsTab({ bizId }: any) { return <div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Analytics</h2><p className="text-gray-400">Traffic, conversion, popular services, revenue trends.</p></div>; }
function SettingsTab({ biz }: any) {
  return <div className="bg-white rounded-2xl border p-6 max-w-2xl">
    <h2 className="font-bold mb-4">Business Settings</h2>
    <div className="space-y-4 text-sm">
      <Field label="Business Name" value={biz.name} />
      <Field label="Phone" value={biz.phone} />
      <Field label="Email" value={biz.email} />
      <Field label="Website" value={biz.website} />
      <Field label="Category" value={biz.category} />
      <Field label="Slug" value={biz.slug} />
      <Field label="Dashboard Password" value={`Last 6 digits of ${biz.phone || 'your phone'}`} />
      <div className="pt-4 border-t">
        <p className="text-gray-500 text-xs">Add Spanish: Your site can show a Spanish toggle. Enable in settings.</p>
        <p className="text-gray-500 text-xs mt-1">Enable dispatch: Add technicians to start assigning jobs.</p>
      </div>
    </div>
  </div>;
}

function Field({ label, value }: any) {
  return <div className="flex justify-between py-2 border-b"><span className="text-gray-500">{label}</span><span className="font-medium">{value || '—'}</span></div>;
}
