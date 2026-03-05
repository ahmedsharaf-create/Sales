
const appId = 'pyramids-sales-v1';

// --- Custom SVG Chart Components (No External Dependencies) ---
// --- Custom SVG Chart Components ---

const SimpleAreaChart = ({ data, color, dataKey }) => {
if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No trend data available</div>;
@@ -148,7 +148,7 @@ const SimplePieChart = ({ data }) => {
`A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
`L 0 0`,
].join(' ');
        const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
        const COLORS = ['#EF4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
return <path key={i} d={pathData} fill={COLORS[i % COLORS.length]} />;
})}
</svg>
@@ -190,7 +190,8 @@ export default function App() {
const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
const userDoc = await getDoc(userDocRef);
if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          const data = userDoc.data();
          setUserProfile(data);
setView('dashboard');
} else {
setView('onboarding');
@@ -220,7 +221,13 @@ export default function App() {
const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
const unsubSales = onSnapshot(salesRef, (snapshot) => {
const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesRecords(records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
});

if (userProfile.role === 'admin') {
@@ -248,29 +255,35 @@ export default function App() {
<div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
<Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
<main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} db={db} appId={appId} />}
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} db={db} appId={appId} userProfile={userProfile} />}
{view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} db={db} appId={appId} />}
{view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />}
{view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} managers={areaManagers} />}
</main>
<MobileNav view={view} setView={setView} role={userProfile?.role} />
</div>
);
}

// --- DASHBOARD ---
function Dashboard({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || 'All';
  
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
const [filterShop, setFilterShop] = useState('All');
const [dateRange, setDateRange] = useState('This Month');

const filteredRecords = useMemo(() => {
let data = [...records];
const now = new Date();
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    
    if (managerToFilter !== 'All') data = data.filter(r => r.areaManager === managerToFilter);
if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    
if (dateRange === 'Today') {
data = data.filter(r => new Date(r.timestamp).toDateString() === now.toDateString());
} else if (dateRange === 'This Month') {
@@ -280,13 +293,16 @@ function Dashboard({ records, targets, shops, managers }) {
});
}
return data;
  }, [records, filterManager, filterShop, dateRange]);
  }, [records, filterManager, filterShop, dateRange, isAdmin, assignedManager]);

const stats = useMemo(() => {
const totalGA = filteredRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
const totalOC = filteredRecords.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
let targetGA = 0; let targetOC = 0;
    const activeShopNames = filterShop === 'All' ? shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => s.name) : [filterShop];
    
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    const activeShopNames = filterShop === 'All' ? shops.filter(s => managerToFilter === 'All' || s.manager === managerToFilter).map(s => s.name) : [filterShop];
    
activeShopNames.forEach(s => {
targetGA += Number(targets[s]?.ga || 0);
targetOC += Number(targets[s]?.oc || 0);
@@ -296,7 +312,7 @@ function Dashboard({ records, targets, shops, managers }) {
gaAchieved: targetGA > 0 ? (totalGA / targetGA) * 100 : 0,
ocAchieved: targetOC > 0 ? (totalOC / targetOC) * 100 : 0
};
  }, [filteredRecords, targets, filterShop, filterManager, shops]);
  }, [filteredRecords, targets, filterShop, filterManager, shops, isAdmin, assignedManager]);

const chartDataTrend = useMemo(() => {
const dailyMap = {};
@@ -322,24 +338,26 @@ function Dashboard({ records, targets, shops, managers }) {
<div className="space-y-6 animate-in fade-in duration-700">
<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 sticky top-0 z-10">
<div className="flex items-center gap-2 border-r pr-4 border-slate-100">
          <Activity size={18} className="text-emerald-500" />
          <Activity size={18} className="text-red-500" />
<h2 className="font-black uppercase text-sm tracking-tight">Analytics</h2>
</div>
        <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
          <option value="All">All Managers</option>
          {managers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {isAdmin && (
          <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
<select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
<option value="All">All Shops</option>
          {shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          {shops.filter(s => (isAdmin ? filterManager : assignedManager) === 'All' || s.manager === (isAdmin ? filterManager : assignedManager)).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
</select>
<select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
<option value="Today">Today</option><option value="This Month">This Month</option><option value="All Time">All Time</option>
</select>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Achieved" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#10b981" />
        <KPIBox title="GA Achieved" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#EF4444" />
<KPIBox title="OC Achieved" value={stats.totalOC} target={stats.targetOC} progress={stats.ocAchieved} color="#3b82f6" />
<KPIBox title="Average Progress" value={`${((stats.gaAchieved + stats.ocAchieved) / 2).toFixed(1)}%`} progress={(stats.gaAchieved + stats.ocAchieved) / 2} color="#8b5cf6" />
<KPIBox title="Total Entries" value={filteredRecords.length} subtext="Entries recorded" color="#64748b" />
@@ -348,10 +366,10 @@ function Dashboard({ records, targets, shops, managers }) {
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
<h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Daily GA Trend (Last 7 Days)
            <TrendingUp size={16} className="text-red-500" /> Daily GA Trend (Last 7 Days)
</h3>
<div className="h-[250px] w-full">
             <SimpleAreaChart data={chartDataTrend} color="#10b981" dataKey="GA" />
             <SimpleAreaChart data={chartDataTrend} color="#EF4444" dataKey="GA" />
</div>
</div>
<div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
@@ -388,7 +406,7 @@ function KPIBox({ title, value, target, progress, color, subtext }) {
</div>
{progress !== undefined ? (
<div className="space-y-2">
          <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-emerald-600' : 'text-slate-400'}`}>
          <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-red-600' : 'text-slate-400'}`}>
{progress.toFixed(1)}%
</div>
<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
@@ -406,15 +424,15 @@ function LoadingScreen() {
return (
<div className="flex h-screen items-center justify-center bg-slate-50">
<div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-slate-500 font-bold tracking-tighter">Pyramids Cloud...</p>
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-slate-500 font-bold tracking-tighter">PE Systems Cloud...</p>
</div>
</div>
);
}

function LoginPortal() {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [authMode, setAuthMode] = useState('login'); 
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
@@ -448,10 +466,7 @@ function LoginPortal() {
<div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
<div className="w-full max-md bg-white rounded-[3rem] p-10 shadow-2xl">
<div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Pyramids Sales</h1>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-2 italic">PE Sales</h1>
<p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
{authMode === 'forgot' ? 'Reset Password' : 'Enterprise Sales Portal'}
</p>
@@ -464,7 +479,7 @@ function LoginPortal() {
<Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
<input 
required type="email" placeholder="name@company.com" 
                className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500/20"
value={email} onChange={e => setEmail(e.target.value)} 
/>
</div>
@@ -477,7 +492,7 @@ function LoginPortal() {
<button 
type="button" 
onClick={() => setAuthMode('forgot')}
                  className="text-[10px] font-black uppercase text-emerald-600 hover:underline"
                  className="text-[10px] font-black uppercase text-red-600 hover:underline"
>
Forgot?
</button>
@@ -486,15 +501,15 @@ function LoginPortal() {
<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
<input 
required type="password" placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                  className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500/20"
value={password} onChange={e => setPassword(e.target.value)} 
/>
</div>
</div>
)}

{error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black text-center border border-red-100">{error}</div>}
          {message && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black text-center border border-emerald-100">{message}</div>}
          {message && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black text-center border border-red-100">{message}</div>}

<button disabled={loading} className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
{loading ? <Loader2 className="animate-spin" /> : (
@@ -510,7 +525,7 @@ function LoginPortal() {
<ArrowLeft size={14} /> Back to Login
</button>
) : (
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-emerald-600 transition-colors">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-colors">
{authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
</button>
)}
@@ -526,7 +541,7 @@ function Onboarding({ user, setView, setUserProfile }) {
const handleSave = async () => {
if (!name.trim()) return;
setLoading(true);
    const profile = { username: name, role: 'user', createdAt: Date.now() };
    const profile = { username: name, role: 'user', assignedManager: '', createdAt: Date.now() };
await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
setUserProfile(profile);
setView('dashboard');
@@ -536,7 +551,7 @@ function Onboarding({ user, setView, setUserProfile }) {
<div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center">
<h2 className="text-2xl font-black text-slate-800 mb-6 italic">Enter Your Full Name</h2>
<input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl outline-none" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg">Continue</button>
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg">Continue</button>
</div>
</div>
);
@@ -553,13 +568,12 @@ function Navigation({ view, setView, role, onLogout }) {
];
return (
<nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg"><Store className="text-white" size={20} /></div>
        <h1 className="text-lg font-bold text-white tracking-tighter uppercase">Pyramids</h1>
      <div className="mb-10 px-2 py-4 border-b border-slate-800">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">PE Sales</h1>
</div>
<div className="space-y-1 flex-1">
{links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'hover:bg-slate-800'}`}>
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-red-600/10 text-red-400 border border-red-600/20' : 'hover:bg-slate-800'}`}>
<link.icon size={18} /> <span className="font-medium text-sm">{link.label}</span>
</button>
))}
@@ -576,48 +590,99 @@ function MobileNav({ view, setView, role }) {
return (
<div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50">
{icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl ${view === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
        <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}>
<item.icon size={22} />
</button>
))}
</div>
);
}

function SalesCollectionForm({ areaManagers, shops, user, db, appId }) {
  const [formData, setFormData] = useState({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
function SalesCollectionForm({ areaManagers, shops, user, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';

  const [formData, setFormData] = useState({ 
    areaManager: isAdmin ? '' : assigned, 
    shopName: '', 
    gaAch: '', 
    ocAch: '', 
    workingHours: '', 
    note: '' 
  });
const [submitting, setSubmitting] = useState(false);
const [success, setSuccess] = useState(false);
  const availableShops = useMemo(() => formData.areaManager ? shops.filter(s => s.manager === formData.areaManager) : [], [formData.areaManager, shops]);

  const availableShops = useMemo(() => {
    const mgr = isAdmin ? formData.areaManager : assigned;
    return mgr ? shops.filter(s => s.manager === mgr) : [];
  }, [formData.areaManager, shops, isAdmin, assigned]);

const handleSubmit = async (e) => {
e.preventDefault();
setSubmitting(true);
try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { ...formData, gaAch: Number(formData.gaAch), ocAch: Number(formData.ocAch), timestamp: Date.now(), submittedBy: user.uid });
      setSuccess(true); setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        areaManager: isAdmin ? formData.areaManager : assigned, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        timestamp: Date.now(), 
        submittedBy: user.uid 
      });
      setSuccess(true); 
      setFormData({ 
        areaManager: isAdmin ? '' : assigned, 
        shopName: '', 
        gaAch: '', 
        ocAch: '', 
        workingHours: '', 
        note: '' 
      });
setTimeout(() => setSuccess(false), 3000);
} catch (err) { console.error(err); }
setSubmitting(false);
};

return (
<div className="max-w-xl mx-auto py-10">
<h2 className="text-4xl font-black text-slate-800 mb-8 text-center italic">Daily Sales Entry</h2>
<form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-6">
        <select required className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
          <option value="">Select Manager</option>
          {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select required disabled={!formData.areaManager} className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
          <option value="">Select Shop</option>
          {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Area Manager</label>
          <select 
            required 
            disabled={!isAdmin}
            className="w-full bg-slate-50 p-4 rounded-xl font-bold disabled:opacity-50" 
            value={isAdmin ? formData.areaManager : assigned} 
            onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}
          >
            <option value="">Select Manager</option>
            {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shop Location</label>
          <select 
            required 
            disabled={!isAdmin && !assigned}
            className="w-full bg-slate-50 p-4 rounded-xl font-bold disabled:opacity-50" 
            value={formData.shopName} 
            onChange={e => setFormData({...formData, shopName: e.target.value})}
          >
            <option value="">Select Shop</option>
            {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
<input required type="text" placeholder="Working Hours (e.g., 09:00 - 18:00)" className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
<div className="grid grid-cols-2 gap-4">
          <input required type="number" placeholder="GA Ach" className="w-full bg-emerald-50 p-6 rounded-2xl text-2xl font-black text-emerald-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="GA Ach" className="w-full bg-red-50 p-6 rounded-2xl text-2xl font-black text-red-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
<input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-6 rounded-2xl text-2xl font-black text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
</div>
<textarea placeholder="Shift Feedback / Notes" className="w-full bg-slate-50 p-4 rounded-xl min-h-[100px]" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-xl shadow-lg">{submitting ? 'Submitting...' : 'Confirm Submission'}</button>
        <button type="submit" disabled={submitting || (!isAdmin && !assigned)} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-xl shadow-lg disabled:opacity-30">
          {!isAdmin && !assigned ? 'No Region Assigned' : (submitting ? 'Submitting...' : 'Confirm Submission')}
        </button>
</form>
</div>
);
@@ -700,13 +765,13 @@ function SalesList({ records, targets, shops, managers, role, db, appId }) {
<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit and Data Analysis</p>
</div>
<div className="flex flex-wrap gap-2">
          <input type="date" className="bg-white p-2 rounded-xl text-xs border border-slate-100 shadow-sm font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="bg-white p-2 rounded-xl text-xs border border-slate-100 shadow-sm font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <input type="date" className="bg-white p-2 rounded-xl text-xs border border-slate-100 shadow-sm font-bold" value={startDate} onChange={e => setStartDate(startDate)} />
          <input type="date" className="bg-white p-2 rounded-xl text-xs border border-slate-100 shadow-sm font-bold" value={endDate} onChange={e => setEndDate(endDate)} />
<select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="bg-white p-2 border border-slate-100 rounded-xl font-bold text-xs shadow-sm">
<option value="All">All Managers</option>
{managers.map(m => <option key={m} value={m}>{m}</option>)}
</select>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-emerald-700 shadow-lg transition-all">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-red-700 shadow-lg transition-all">
<FileSpreadsheet size={16} /> Export CSV
</button>
</div>
@@ -717,10 +782,10 @@ function SalesList({ records, targets, shops, managers, role, db, appId }) {
<tr className="text-[10px] font-black uppercase">
<th className="px-6 py-5">Date / Time</th>
<th className="px-6 py-5">Shop Name</th>
              <th className="px-6 py-5 text-emerald-400 text-center bg-emerald-950/20">GA Goal</th>
              <th className="px-6 py-4 text-emerald-400 text-center bg-emerald-950/20">GA Ach</th>
              <th className="px-6 py-4 text-emerald-400 text-center bg-emerald-950/20">GA %</th>
              <th className="px-6 py-4 text-emerald-400 text-center bg-emerald-950/20">GA Rem.</th>
              <th className="px-6 py-5 text-red-400 text-center bg-red-950/20">GA Goal</th>
              <th className="px-6 py-4 text-red-400 text-center bg-red-950/20">GA Ach</th>
              <th className="px-6 py-4 text-red-400 text-center bg-red-950/20">GA %</th>
              <th className="px-6 py-4 text-red-400 text-center bg-red-950/20">GA Rem.</th>
<th className="px-6 py-5 text-blue-400 text-center bg-blue-950/20">OC Goal</th>
<th className="px-6 py-4 text-blue-400 text-center bg-blue-950/20">OC Ach</th>
<th className="px-6 py-4 text-blue-400 text-center bg-blue-950/20">OC %</th>
@@ -747,10 +812,10 @@ function SalesList({ records, targets, shops, managers, role, db, appId }) {
<td className="px-6 py-4 text-slate-900 font-black tracking-tight">{r.shopName}</td>

{/* GA STATS */}
                  <td className="px-4 py-4 text-center bg-emerald-50/10 text-slate-400">{target.ga.toLocaleString()}</td>
                  <td className="px-4 py-4 text-center bg-emerald-50/10 text-emerald-600 font-black">+{r.gaAch}</td>
                  <td className="px-4 py-4 text-center bg-emerald-50/10 text-emerald-700">{gaPercent}%</td>
                  <td className="px-4 py-4 text-center bg-emerald-50/10 text-emerald-900">{Math.max(0, target.ga - shopTotals.totalGA).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-slate-400">{target.ga.toLocaleString()}</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-red-600 font-black">+{r.gaAch}</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-red-700">{gaPercent}%</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-red-900">{Math.max(0, target.ga - shopTotals.totalGA).toLocaleString()}</td>

{/* OC STATS */}
<td className="px-4 py-4 text-center bg-blue-50/10 text-slate-400">{target.oc.toLocaleString()}</td>
@@ -826,19 +891,19 @@ function TargetSetting({ shops, areaManagers, targets, db, appId }) {
<header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
<h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Target Controls</h2>
<div className="flex items-center gap-2">
           <label className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-2 shadow-lg">
           <label className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-2 shadow-lg">
<FileSpreadsheet size={16} /> Bulk Upload CSV
<input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} />
</label>
</div>
</header>

      {status && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-center text-xs font-bold">{status}</div>}
      {status && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-center text-xs font-bold">{status}</div>}

<div className="flex flex-col md:flex-row gap-4">
<div className="relative flex-1">
<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
          <input type="text" placeholder="Search shops..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border border-slate-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <input type="text" placeholder="Search shops..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border border-slate-100" value={searchTerm} onChange={e => setSearchTerm(searchTerm)} />
</div>
<select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white px-4 py-4 rounded-2xl shadow-sm font-bold text-sm border border-slate-100">
<option value="All">All Managers</option>
@@ -854,16 +919,16 @@ function TargetSetting({ shops, areaManagers, targets, db, appId }) {
<h4 className="font-black text-lg">{shop.name}</h4>
<p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Mgr: {shop.manager}</p>
</div>
              <button onClick={() => {setEditingShop(shop.name); setEditForm({ga: targets[shop.name]?.ga||0, oc: targets[shop.name]?.oc||0})}} className="text-slate-300 hover:text-emerald-500 p-2 transition-colors">
              <button onClick={() => {setEditingShop(shop.name); setEditForm({ga: targets[shop.name]?.ga||0, oc: targets[shop.name]?.oc||0})}} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
<Edit3 size={18}/>
</button>
</div>
<div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-emerald-600 uppercase mb-1 tracking-tighter">GA Target</p>
              <div className="bg-red-50/50 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-red-600 uppercase mb-1 tracking-tighter">GA Target</p>
{editingShop === shop.name ? 
                  <input type="number" className="w-full bg-transparent font-black border-b border-emerald-500 outline-none" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : 
                  <span className="text-xl font-black text-emerald-700">{targets[shop.name]?.ga?.toLocaleString() || 0}</span>
                  <input type="number" className="w-full bg-transparent font-black border-b border-red-500 outline-none" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : 
                  <span className="text-xl font-black text-red-700">{targets[shop.name]?.ga?.toLocaleString() || 0}</span>
}
</div>
<div className="bg-blue-50/50 p-4 rounded-2xl">
@@ -876,7 +941,7 @@ function TargetSetting({ shops, areaManagers, targets, db, appId }) {
</div>
{editingShop === shop.name && (
<div className="flex gap-2">
                <button onClick={() => handleSave(shop.name)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg"><Check size={18}/> Save</button>
                <button onClick={() => handleSave(shop.name)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg"><Check size={18}/> Save</button>
<button onClick={() => setEditingShop(null)} className="bg-slate-100 p-3 rounded-xl"><X size={18} /></button>
</div>
)}
@@ -887,10 +952,10 @@ function TargetSetting({ shops, areaManagers, targets, db, appId }) {
);
}

function UserSearch({ users, db, appId }) {
function UserSearch({ users, db, appId, managers }) {
const [searchTerm, setSearchTerm] = useState('');
const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user' });
  const [editForm, setEditForm] = useState({ username: '', role: 'user', assignedManager: '' });
const [updating, setUpdating] = useState(false);

const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
@@ -914,38 +979,53 @@ function UserSearch({ users, db, appId }) {
<h2 className="text-3xl font-black uppercase tracking-tighter">Team Management</h2>
<div className="relative">
<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
        <input type="text" placeholder="Search members..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border focus:ring-2 focus:ring-emerald-500/20 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <input type="text" placeholder="Search members..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none border focus:ring-2 focus:ring-red-500/20 font-bold" value={searchTerm} onChange={e => setSearchTerm(searchTerm)} />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{filtered.map(u => (
          <div key={u.uid} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 transition-all ${editingId === u.uid ? 'border-emerald-500 ring-4 ring-emerald-500/5' : ''}`}>
          <div key={u.uid} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 transition-all ${editingId === u.uid ? 'border-red-500 ring-4 ring-red-500/5' : ''}`}>
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xl uppercase">{u.username?.charAt(0)}</div>
<div className="flex-1">
{editingId === u.uid ? 
                  <input className="w-full font-black border-b-2 border-emerald-500 outline-none py-1" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /> : 
                  <input className="w-full font-black border-b-2 border-red-500 outline-none py-1" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /> : 
<p className="font-black text-slate-800 text-lg">{u.username}</p>
}
<span className={`text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-purple-600' : 'text-slate-400'}`}>{u.role.toUpperCase()}</span>
                {u.assignedManager && (
                   <p className="text-[9px] font-bold text-red-600 italic mt-1 uppercase">Region: {u.assignedManager}</p>
                )}
</div>
<button onClick={() => handleDeleteUser(u.uid)} className="text-red-300 hover:text-red-500 transition-colors p-2">
<Trash2 size={16} />
</button>
</div>
{editingId === u.uid ? (
              <div className="flex gap-2">
                <select className="flex-1 bg-slate-50 rounded-lg p-2 text-xs font-bold border-none outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="user">USER ROLE</option>
                  <option value="admin">ADMIN ROLE</option>
                </select>
                <button onClick={() => handleUpdate(u.uid)} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-600/20">
                  {updating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
                </button>
                <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-400 p-3 rounded-xl"><X size={18}/></button>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase text-slate-400 px-1">Role</label>
                   <select className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold border-none outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                     <option value="user">USER</option>
                     <option value="admin">ADMIN</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase text-slate-400 px-1">Assign Region / Manager</label>
                   <select className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold border-none outline-none" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                     <option value="">No Assignment</option>
                     {managers.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-red-600 text-white p-3 rounded-xl shadow-lg shadow-red-600/20 flex justify-center">
                    {updating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
                  </button>
                  <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-400 p-3 rounded-xl"><X size={18}/></button>
                </div>
</div>
) : (
              <button onClick={() => {setEditingId(u.uid); setEditForm({username: u.username, role: u.role})}} className="w-full bg-slate-50 text-slate-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                <UserCog size={14} className="inline mr-2"/> Edit Profile
              <button onClick={() => {setEditingId(u.uid); setEditForm({username: u.username, role: u.role, assignedManager: u.assignedManager || ''})}} className="w-full bg-slate-50 text-slate-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                <UserCog size={14} className="inline mr-2"/> Assign Region & Edit
</button>
)}
</div>
@@ -1009,21 +1089,21 @@ function AdminDashboard({ areaManagers, shops, targets, db, appId }) {

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
<div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2"><UserPlus className="text-indigo-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Manager</h3></div>
          <div className="flex items-center gap-3 mb-2"><UserPlus className="text-red-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Manager</h3></div>
<div className="flex gap-2">
<input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold outline-none" placeholder="Manager Name" />
            <button onClick={handleAddManager} className="bg-indigo-600 text-white px-6 rounded-xl font-black">Add</button>
            <button onClick={handleAddManager} className="bg-red-600 text-white px-6 rounded-xl font-black">Add</button>
</div>
</div>
<div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2"><Store className="text-emerald-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Shop</h3></div>
          <div className="flex items-center gap-3 mb-2"><Store className="text-red-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Shop</h3></div>
<div className="flex gap-2 flex-col sm:flex-row">
<input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold outline-none" placeholder="Shop Name" />
<select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="bg-slate-50 border-none p-4 rounded-xl font-bold outline-none cursor-pointer">
<option value="">Choose Manager</option>
{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
</select>
            <button onClick={() => { if (newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); }} className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black">Link</button>
            <button onClick={() => { if (newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); }} className="bg-red-600 text-white px-6 py-4 rounded-xl font-black">Link</button>
</div>
</div>
</div>
@@ -1045,15 +1125,15 @@ function AdminDashboard({ areaManagers, shops, targets, db, appId }) {
<td className="px-8 py-6">
{editingManager === shop.manager ? (
<div className="flex items-center gap-2">
                      <input className="bg-slate-50 border-b-2 border-indigo-500 font-bold outline-none p-1" value={editValue} onChange={e => setEditValue(e.target.value)} />
                      <button onClick={() => saveEditManager(shop.manager)} className="text-emerald-500"><Check size={18} /></button>
                      <input className="bg-slate-50 border-b-2 border-red-500 font-bold outline-none p-1" value={editValue} onChange={e => setEditValue(e.target.value)} />
                      <button onClick={() => saveEditManager(shop.manager)} className="text-red-500"><Check size={18} /></button>
<button onClick={() => setEditingManager(null)} className="text-slate-300"><X size={18} /></button>
</div>
) : (
<div className="flex items-center justify-between group">
<span className="font-black text-slate-800 text-lg tracking-tight">{shop.manager}</span>
<div className="opacity-0 group-hover:opacity-100 flex gap-2">
                        <button onClick={() => handleEditManager(shop.manager)} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                        <button onClick={() => handleEditManager(shop.manager)} className="p-2 text-red-400 hover:text-red-600"><Edit3 size={14} /></button>
<button onClick={() => handleDeleteManager(shop.manager)} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
</div>
</div>
