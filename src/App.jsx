import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  PlusCircle, 
  Store, 
  Users as UsersIcon, 
  ClipboardList, 
  TrendingUp, 
  Settings,
  Trash2,
  Loader2,
  Download,
  Filter, 
  BarChart3,
  Target,
  Calendar,
  Upload,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Search,
  Lock,
  Mail,
  ShieldCheck,
  UserCog,
  Save,
  X,
  Edit3,
  Check,
  UserPlus,
  Plus,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAYb6zn5YulU9Ght-3T2vHFzdbOL94GYqs",
  authDomain: "pyramids-sales.firebaseapp.com",
  projectId: "pyramids-sales",
  storageBucket: "pyramids-sales.firebasestorage.app",
  messagingSenderId: "658795707959",
  appId: "1:658795707959:web:76e44a85011105fd2949b2",
  measurementId: "G-MMZ18E15FX"
};

// Initialize Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
}

const appId = 'pyramids-sales-v1';

// --- Custom SVG Chart Components (No External Dependencies) ---

const SimpleAreaChart = ({ data, color, dataKey }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No trend data</div>;
  
  const height = 200;
  const width = 500;
  const maxVal = Math.max(...data.map(d => d[dataKey]), 10);
  const padding = 20;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d[dataKey] / maxVal) * (height - padding));
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={areaPoints} fill={`url(#grad-${dataKey})`} />
      {data.map((d, i) => (
        <circle 
          key={i} 
          cx={(i / (data.length - 1)) * width} 
          cy={height - ((d[dataKey] / maxVal) * (height - padding))} 
          r="4" 
          fill="white" 
          stroke={color} 
          strokeWidth="2" 
        />
      ))}
    </svg>
  );
};

const SimplePieChart = ({ data }) => {
  let cumulativePercent = 0;
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No distribution</div>;

  function getCoordinatesForPercent(percent) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  return (
    <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90">
      {data.map((slice, i) => {
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += (slice.value / total);
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
        const pathData = [
          `M ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `L 0 0`,
        ].join(' ');
        const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
        return <path key={i} d={pathData} fill={COLORS[i % COLORS.length]} />;
      })}
    </svg>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data Subscription
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserProfile(null);
        setView('login');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setView('dashboard');
        } else {
          setView('onboarding');
        }
      } catch (e) {
        setError("Database permission error.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !userProfile || !db) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    });

    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesRecords(records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });

    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      });
    }

    return () => { unsubSettings(); unsubSales(); };
  }, [user, userProfile]);

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  if (loading) return <LoadingScreen />;

  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} db={db} appId={appId} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} db={db} appId={appId} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} />}
      </main>
      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- DASHBOARD (REDESIGNED FOR COMPATIBILITY) ---

function Dashboard({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
  const [filterShop, setFilterShop] = useState('All');
  const [dateRange, setDateRange] = useState('This Month');

  const filteredRecords = useMemo(() => {
    let data = [...records];
    const now = new Date();
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    if (dateRange === 'Today') {
      data = data.filter(r => new Date(r.timestamp).toDateString() === now.toDateString());
    } else if (dateRange === 'This Month') {
      data = data.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return data;
  }, [records, filterManager, filterShop, dateRange]);

  const stats = useMemo(() => {
    const totalGA = filteredRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
    let targetGA = 0; let targetOC = 0;
    const activeShopNames = filterShop === 'All' ? shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => s.name) : [filterShop];
    activeShopNames.forEach(s => {
      targetGA += Number(targets[s]?.ga || 0);
      targetOC += Number(targets[s]?.oc || 0);
    });
    return {
      totalGA, totalOC, targetGA, targetOC,
      gaAchieved: targetGA > 0 ? (totalGA / targetGA) * 100 : 0,
      ocAchieved: targetOC > 0 ? (totalOC / targetOC) * 100 : 0
    };
  }, [filteredRecords, targets, filterShop, filterManager, shops]);

  const chartDataTrend = useMemo(() => {
    const dailyMap = {};
    filteredRecords.forEach(r => {
      const dateKey = new Date(r.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { name: dateKey, GA: 0, OC: 0 };
      dailyMap[dateKey].GA += r.gaAch;
      dailyMap[dateKey].OC += r.ocAch;
    });
    return Object.values(dailyMap).reverse().slice(-7);
  }, [filteredRecords]);

  const managerShareData = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!map[r.areaManager]) map[r.areaManager] = 0;
      map[r.areaManager] += r.gaAch + r.ocAch;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
          <Activity size={18} className="text-emerald-500" />
          <h2 className="font-black uppercase text-sm tracking-tight">Analytics</h2>
        </div>
        <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
          <option value="All">All Managers</option>
          {managers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
          <option value="All">All Shops</option>
          {shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
           <option>Today</option><option>This Month</option><option>All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Achieved" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#10b981" />
        <KPIBox title="OC Achieved" value={stats.totalOC} target={stats.targetOC} progress={stats.ocAchieved} color="#3b82f6" />
        <KPIBox title="Avg. Progress" value={`${((stats.gaAchieved + stats.ocAchieved) / 2).toFixed(1)}%`} progress={(stats.gaAchieved + stats.ocAchieved) / 2} color="#8b5cf6" />
        <KPIBox title="Total Entries" value={filteredRecords.length} subtext="Entries recorded" color="#64748b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Daily GA Trend (Last 7 Days)
          </h3>
          <div className="h-[250px] w-full">
             <SimpleAreaChart data={chartDataTrend} color="#10b981" dataKey="GA" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2">
            <PieIcon size={16} className="text-purple-500" /> Manager Distribution
          </h3>
          <div className="h-[180px] w-full mb-6">
            <SimplePieChart data={managerShareData} />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[100px] custom-scrollbar">
             {managerShareData.map((m, i) => (
               <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                  <span>{m.name}</span>
                  <span className="text-slate-400">{m.value.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color, subtext }) {
  const isUp = progress >= 100;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 group relative overflow-hidden">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <div className="flex items-baseline gap-2 mb-4">
        <h4 className="text-3xl font-black text-slate-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-bold italic">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined ? (
        <div className="space-y-2">
          <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-emerald-600' : 'text-slate-400'}`}>
            {progress.toFixed(1)}%
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-slate-400 uppercase">{subtext}</p>
      )}
    </div>
  );
}

// --- ALL OTHER COMPONENTS RENDERED BELOW (STABILIZED) ---

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-slate-500 font-bold tracking-tighter">Pyramids Cloud...</p>
      </div>
    </div>
  );
}

function LoginPortal() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setError("Login failed."); }
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Pyramids Sales</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required type="email" placeholder="Email" className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg shadow-xl">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
          {isSignUp ? 'Switch to Login' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

function Onboarding({ user, setView, setUserProfile }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const profile = { username: name, role: 'user', createdAt: Date.now() };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
    setUserProfile(profile);
    setView('dashboard');
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-6 italic">Enter Your Full Name</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl outline-none" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg">CONTINUE</button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Sales Collection', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team', icon: Search, roles: ['admin'] },
    { id: 'admin', label: 'System', icon: Settings, roles: ['admin'] },
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg"><Store className="text-white" size={20} /></div>
        <h1 className="text-lg font-bold text-white tracking-tighter">PYRAMIDS</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'hover:bg-slate-800'}`}>
            <link.icon size={18} /> <span className="font-medium text-sm">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 font-bold text-sm transition-all">
        <LogOut size={18} /> Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl ${view === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
          <item.icon size={22} />
        </button>
      ))}
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, user, db, appId }) {
  const [formData, setFormData] = useState({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const availableShops = useMemo(() => formData.areaManager ? shops.filter(s => s.manager === formData.areaManager) : [], [formData.areaManager, shops]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { ...formData, gaAch: Number(formData.gaAch), ocAch: Number(formData.ocAch), timestamp: Date.now(), submittedBy: user.uid });
      setSuccess(true); setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };
  return (
    <div className="max-w-xl mx-auto py-10">
      <h2 className="text-4xl font-black text-slate-800 mb-8 text-center italic">Daily Entry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-6">
        <select required className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
          <option value="">Manager</option>
          {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select required disabled={!formData.areaManager} className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
          <option value="">Shop</option>
          {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input required type="number" placeholder="GA Ach" className="w-full bg-emerald-50 p-6 rounded-2xl text-2xl font-black text-emerald-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-6 rounded-2xl text-2xl font-black text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-xl shadow-lg">{submitting ? 'Submitting...' : 'CONFIRM'}</button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role, db, appId }) {
  const [filterManager, setFilterManager] = useState('All');
  const filtered = useMemo(() => filterManager === 'All' ? records : records.filter(r => r.areaManager === filterManager), [records, filterManager]);
  const handleDelete = async (id) => { if (confirm("Delete entry?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id)); };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 uppercase italic">Collection Log</h2><select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white p-2 border rounded-xl font-bold text-xs"><option value="All">All</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
      <div className="bg-white rounded-[2rem] border shadow-xl overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-900 text-slate-400"><tr><th className="px-6 py-4 text-[10px] font-black uppercase">Date</th><th className="px-6 py-4 text-[10px] font-black uppercase">Shop</th><th className="px-6 py-4 text-[10px] font-black uppercase">GA</th><th className="px-6 py-4 text-[10px] font-black uppercase">OC</th>{role==='admin'&&<th className="px-6 py-4"></th>}</tr></thead><tbody className="divide-y text-xs font-bold">{filtered.map(r => (<tr key={r.id} className="hover:bg-slate-50"><td className="px-6 py-4 text-slate-400">{new Date(r.timestamp).toLocaleDateString()}</td><td className="px-6 py-4 text-slate-800">{r.shopName}</td><td className="px-6 py-4 text-emerald-600 font-black">+{r.gaAch}</td><td className="px-6 py-4 text-blue-600 font-black">+{r.ocAch}</td>{role==='admin'&&<td className="px-6 py-4 text-right"><button onClick={()=>handleDelete(r.id)} className="text-red-400"><Trash2 size={14} /></button></td>}</tr>))}</tbody></table></div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets, db, appId }) {
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({ ga: 0, oc: 0 });
  const handleSave = async (shopName) => {
    const newTargets = { ...targets, [shopName]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
    setEditingShop(null);
  };
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-slate-800 uppercase italic">Monthly Targets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map(shop => (
          <div key={shop.name} className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-start mb-4"><div><h4 className="font-black">{shop.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">MGR: {shop.manager}</p></div><button onClick={() => {setEditingShop(shop.name); setEditForm({ga: targets[shop.name]?.ga||0, oc: targets[shop.name]?.oc||0})}} className="text-slate-300 hover:text-emerald-500"><Edit3 size={16}/></button></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 p-4 rounded-2xl"><p className="text-[9px] font-black text-emerald-600 uppercase">GA</p>{editingShop===shop.name?<input type="number" className="w-full bg-transparent font-black outline-none border-b border-emerald-500" value={editForm.ga} onChange={e=>setEditForm({...editForm, ga: e.target.value})} />:<span className="font-black text-emerald-700">{targets[shop.name]?.ga||0}</span>}</div>
              <div className="bg-blue-50 p-4 rounded-2xl"><p className="text-[9px] font-black text-blue-600 uppercase">OC</p>{editingShop===shop.name?<input type="number" className="w-full bg-transparent font-black outline-none border-b border-blue-500" value={editForm.oc} onChange={e=>setEditForm({...editForm, oc: e.target.value})} />:<span className="font-black text-blue-700">{targets[shop.name]?.oc||0}</span>}</div>
            </div>
            {editingShop===shop.name && <button onClick={()=>handleSave(shop.name)} className="w-full bg-emerald-600 text-white mt-4 py-2 rounded-xl font-black text-xs uppercase">SAVE</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserSearch({ users, db, appId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-slate-800 uppercase italic">Team Directory</h2>
      <input type="text" placeholder="Search members..." className="w-full bg-white p-4 rounded-2xl shadow-sm outline-none border focus:ring-2 focus:ring-emerald-500/20 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map(u => (
          <div key={u.uid} className="bg-white p-5 rounded-[2rem] border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 uppercase">{u.username?.charAt(0)}</div>
            <div><p className="font-black text-slate-800 leading-none mb-1">{u.username}</p><span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full">{u.role}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, db, appId }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const updateConfig = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets }); };
  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <h2 className="text-4xl font-black text-slate-800 uppercase italic">Structure Control</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
          <h3 className="font-black text-slate-400 text-[10px] uppercase">New Manager</h3>
          <div className="flex gap-2"><input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-bold" placeholder="Name" /><button onClick={() => { if(newManager) { updateConfig([...areaManagers, newManager], null); setNewManager(''); } }} className="bg-indigo-600 text-white px-6 rounded-xl font-black">Add</button></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
          <h3 className="font-black text-slate-400 text-[10px] uppercase">New Shop</h3>
          <div className="flex flex-col gap-2"><input value={newShop} onChange={e => setNewShop(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold" placeholder="Shop Name" /><select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold"><option value="">Select Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select><button onClick={() => { if(newShop && assignManager) { updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); } }} className="bg-emerald-600 text-white py-4 rounded-xl font-black">Assign</button></div>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-900 text-slate-400"><tr><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Manager</th><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Location</th><th className="px-8 py-5"></th></tr></thead><tbody className="divide-y">{shops.map((shop, idx) => (<tr key={idx} className="hover:bg-slate-50"><td className="px-8 py-6 font-black text-slate-800 tracking-tight">{shop.manager}</td><td className="px-8 py-6 font-bold text-slate-600">{shop.name}</td><td className="px-8 py-6 text-right"><button onClick={async () => {const s=shops.filter((_,i)=>i!==idx); await updateConfig(null, s);}} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
    </div>
  );
}
