import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken,
  signInAnonymously,
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
  Filter, 
  BarChart3,
  Target,
  Calendar,
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
  Activity,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react';

// --- Environment Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyBGP3RALA1Ym_Bot5L-EhaeJtesdPUuA08",
  authDomain: "pyramids-sales.firebaseapp.com",
  projectId: "pyramids-sales",
  storageBucket: "pyramids-sales.firebasestorage.app",
  messagingSenderId: "658795707959",
  appId: "1:658795707959:web:b85bf34d4f86f5d72949b2",
  measurementId: "G-EXKR6PYZHS"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

// Application ID for Firestore path scoping (Rule 1)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pyramids-sales-v1';

// --- Custom SVG Chart Components ---

const SimpleAreaChart = ({ data, color, dataKey }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No trend data available</div>;
  
  const height = 200;
  const width = 500;
  const maxVal = Math.max(...data.map(d => d[dataKey]), 10);
  const padding = 20;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = height - ((d[dataKey] / maxVal) * (height - padding));
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = data.length > 1 
    ? `0,${height} ${points} ${width},${height}`
    : `${width/2},${height} ${points} ${width/2},${height}`;

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
          cx={data.length > 1 ? (i / (data.length - 1)) * width : width / 2} 
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
  if (total === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No distribution data</div>;

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
        const COLORS = ['#EF4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];
        return <path key={i} d={pathData} fill={COLORS[i % COLORS.length]} />;
      })}
    </svg>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('loading'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data State
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // (1) Auth Initialization (Follows Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("Authentication failed.");
      }
    };
    initAuth();
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

  // (2) Fetch Profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          setView('dashboard');
        } else {
          setView('onboarding');
        }
      } catch (e) {
        setError("Database access error.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // (3) Data Subscriptions (Follows Rule 3 & Rule 1)
  useEffect(() => {
    if (!user || !userProfile) return;

    // Settings/Config Subscription
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    }, (err) => console.error("Settings listener error:", err));

    // Sales Subscription
    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
    }, (err) => console.error("Sales listener error:", err));

    // Admin-only User List
    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      }, (err) => console.error("Users listener error:", err));
    }

    return () => { 
      unsubSettings(); 
      unsubSales(); 
      unsubUsers();
    };
  }, [user, userProfile]);

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  if (loading || view === 'loading') return <LoadingScreen />;

  if (view === 'login') return <LoginPortal onLoginSuccess={() => setView('loading')} />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto transition-all duration-300">
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} userProfile={userProfile} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} managers={areaManagers} />}
      </main>
      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || 'All';
  
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [filterShop, setFilterShop] = useState('All');
  const [dateRange, setDateRange] = useState('This Month');

  const filteredRecords = useMemo(() => {
    let data = [...records];
    const now = new Date();
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    
    if (managerToFilter !== 'All') data = data.filter(r => r.areaManager === managerToFilter);
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
  }, [records, filterManager, filterShop, dateRange, isAdmin, assignedManager]);

  const stats = useMemo(() => {
    const totalGA = filteredRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
    let targetGA = 0; let targetOC = 0;
    
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    const activeShopNames = filterShop === 'All' 
      ? shops.filter(s => managerToFilter === 'All' || s.manager === managerToFilter).map(s => s.name) 
      : [filterShop];
    
    activeShopNames.forEach(s => {
      targetGA += Number(targets[s]?.ga || 0);
      targetOC += Number(targets[s]?.oc || 0);
    });

    return {
      totalGA, totalOC, targetGA, targetOC,
      gaAchieved: targetGA > 0 ? (totalGA / targetGA) * 100 : 0,
      ocAchieved: targetOC > 0 ? (totalOC / targetOC) * 100 : 0
    };
  }, [filteredRecords, targets, filterShop, filterManager, shops, isAdmin, assignedManager]);

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
      map[r.areaManager] += (r.gaAch || 0) + (r.ocAch || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 sticky top-4 z-30">
        <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
          <Activity size={18} className="text-rose-500" />
          <h2 className="font-black uppercase text-xs tracking-widest text-slate-500">Analytics</h2>
        </div>
        {isAdmin && (
          <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="text-xs font-bold p-2 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/10">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="text-xs font-bold p-2 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/10">
          <option value="All">All Shops</option>
          {shops.filter(s => (isAdmin ? filterManager : assignedManager) === 'All' || s.manager === (isAdmin ? filterManager : assignedManager)).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-xs font-bold p-2 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/10 ml-auto">
           <option value="Today">Today</option><option value="This Month">This Month</option><option value="All Time">All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Achieved" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#f43f5e" />
        <KPIBox title="OC Achieved" value={stats.totalOC} target={stats.targetOC} progress={stats.ocAchieved} color="#3b82f6" />
        <KPIBox title="Combined Progress" value={`${((stats.gaAchieved + stats.ocAchieved) / 2).toFixed(1)}%`} progress={(stats.gaAchieved + stats.ocAchieved) / 2} color="#8b5cf6" />
        <KPIBox title="Total Entries" value={filteredRecords.length} subtext="System records found" color="#64748b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-rose-500" /> Daily GA Trend
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase">Last 7 Active Days</span>
          </div>
          <div className="h-[280px] w-full">
             <SimpleAreaChart data={chartDataTrend} color="#f43f5e" dataKey="GA" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
            <PieIcon size={16} className="text-indigo-500" /> Manager Distribution
          </h3>
          <div className="h-[200px] w-full mb-8">
            <SimplePieChart data={managerShareData} />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
             {managerShareData.map((m, i) => (
               <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-slate-50 pb-2 last:border-0">
                 <span className="text-slate-600">{m.name}</span>
                 <span className="text-slate-400 tabular-nums">{m.value.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color, subtext }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 group transition-all hover:shadow-md">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">{title}</p>
      <div className="flex items-baseline gap-2 mb-6">
        <h4 className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-300 font-bold italic">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined ? (
        <div className="space-y-3">
          <div className={`flex items-center justify-between text-[10px] font-black`}>
            <span style={{ color }}>{progress.toFixed(1)}%</span>
            <span className="text-slate-300 uppercase">Utilization</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{subtext}</p>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        </div>
        <p className="text-slate-900 font-black tracking-tighter text-xl italic uppercase">PE Sales Cloud</p>
        <div className="h-1.5 w-32 bg-slate-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-rose-600 w-1/2 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

function LoginPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // In this environment, we use anonymous or custom token usually handled by parent
      // but if the user wants to log in manually, we can support it.
      await signInAnonymously(auth);
    } catch (err) {
      setError("Login failed. Check connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full"></div>
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-slate-50 rounded-3xl mb-6">
            <ShieldCheck size={32} className="text-rose-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2 italic">PE Sales</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Corporate Authentication</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Username / Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required type="text" placeholder="name@company.com" 
                className="w-full bg-slate-50 border border-slate-100 p-5 pl-14 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                value={email} onChange={e => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Secure Key</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required type="password" placeholder="••••••••" 
                className="w-full bg-slate-50 border border-slate-100 p-5 pl-14 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                value={password} onChange={e => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold text-center border border-rose-100">{error}</div>}

          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
            {loading ? <Loader2 className="animate-spin" /> : 'Enter System'}
          </button>
        </form>

        <p className="mt-12 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Authorized Personnel Only &bull; Internal Network
        </p>
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
    const profile = { 
      username: name, 
      role: 'user', 
      assignedManager: '', 
      createdAt: Date.now() 
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
    setUserProfile(profile);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-xl text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <UserIcon size={32} className="text-rose-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 italic">Profile Setup</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Enter your full identification</p>
        
        <input 
          type="text" value={name} placeholder="John Doe"
          onChange={e => setName(e.target.value)} 
          className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl font-black mb-8 text-center text-xl outline-none focus:border-rose-500/30 transition-all" 
        />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-rose-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-rose-600/20 active:scale-95 transition-all">
          Complete Registration
        </button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Analytics', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Activity Logs', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Set Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team Map', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-400 p-8 z-50">
      <div className="mb-14 flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-rose-600/30 italic">PE</div>
        <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Sales</h1>
      </div>
      <div className="space-y-2 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button 
            key={link.id} 
            onClick={() => setView(link.id)} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${view === link.id ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20' : 'hover:bg-slate-800/50 hover:text-white'}`}
          >
            <link.icon size={20} className={view === link.id ? 'text-white' : 'text-slate-500 group-hover:text-rose-400'} /> 
            <span className="font-bold text-sm tracking-tight">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 font-black text-sm transition-all border border-transparent hover:border-rose-500/20">
        <LogOut size={20} /> System Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [
    {id:'dashboard', icon:BarChart3, roles:['admin','user']}, 
    {id:'collection', icon:PlusCircle, roles:['admin','user']}, 
    {id:'reports', icon:ClipboardList, roles:['admin','user']}, 
    {id:'targets', icon:Target, roles:['admin']}, 
    {id:'userSearch', icon:UsersIcon, roles:['admin']}
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center h-20 px-4 md:hidden z-50 rounded-t-[2.5rem] shadow-2xl">
      {icons.map(item => item.roles.includes(role) && (
        <button 
          key={item.id} 
          onClick={() => setView(item.id)} 
          className={`relative p-4 rounded-2xl transition-all ${view === item.id ? 'text-rose-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}
        >
          <item.icon size={24} strokeWidth={view === item.id ? 3 : 2} />
          {view === item.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-600 rounded-full"></div>}
        </button>
      ))}
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, user, userProfile }) {
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

  const availableShops = useMemo(() => {
    const mgr = isAdmin ? formData.areaManager : assigned;
    return mgr ? shops.filter(s => s.manager === mgr) : [];
  }, [formData.areaManager, shops, isAdmin, assigned]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
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
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-slate-900 mb-2 italic">Sales Entry</h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Submission Portal</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8 relative overflow-hidden">
        {success && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <Check size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Data Secured</h3>
            <p className="text-slate-500 font-bold text-sm">Your submission has been logged successfully.</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Assigning Manager</label>
            <select 
              required 
              disabled={!isAdmin}
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all disabled:opacity-50" 
              value={isAdmin ? formData.areaManager : assigned} 
              onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}
            >
              <option value="">Select Region Lead</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Shop Location</label>
            <select 
              required 
              disabled={!isAdmin && !assigned}
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all disabled:opacity-50" 
              value={formData.shopName} 
              onChange={e => setFormData({...formData, shopName: e.target.value})}
            >
              <option value="">Select Target Shop</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Operational Shift</label>
            <div className="relative">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required type="text" placeholder="e.g., 09:00 AM - 06:00 PM" 
                className="w-full bg-slate-50 border border-slate-100 p-5 pl-14 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" 
                value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">GA Achieved</label>
            <input 
              required type="number" placeholder="0" 
              className="w-full bg-rose-50 border border-rose-100 p-8 rounded-3xl text-3xl font-black text-rose-600 outline-none text-center focus:ring-4 focus:ring-rose-500/10 transition-all" 
              value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">OC Achieved</label>
            <input 
              required type="number" placeholder="0" 
              className="w-full bg-blue-50 border border-blue-100 p-8 rounded-3xl text-3xl font-black text-blue-600 outline-none text-center focus:ring-4 focus:ring-blue-500/10 transition-all" 
              value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Feedback & Audit Notes</label>
          <textarea 
            placeholder="Describe any shift details or issues..." 
            className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl min-h-[120px] outline-none font-medium focus:ring-4 focus:ring-rose-500/10 transition-all" 
            value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} 
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting || (!isAdmin && !assigned)} 
          className="w-full bg-[#0F172A] text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-slate-900/10 disabled:opacity-30 active:scale-95 transition-all"
        >
          {!isAdmin && !assigned ? 'Assignment Restricted' : (submitting ? 'Processing...' : 'Confirm Entry')}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role }) {
  const [filterManager, setFilterManager] = useState('All');
  const [filterShop, setFilterShop] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    if (startDate) data = data.filter(r => r.timestamp >= new Date(startDate).getTime());
    if (endDate) data = data.filter(r => r.timestamp <= new Date(endDate).getTime() + 86400000);
    return data;
  }, [records, filterManager, filterShop, startDate, endDate]);

  const shopAggregates = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!map[r.shopName]) map[r.shopName] = { totalGA: 0, totalOC: 0 };
      map[r.shopName].totalGA += (r.gaAch || 0);
      map[r.shopName].totalOC += (r.ocAch || 0);
    });
    return map;
  }, [records]);

  const handleDelete = async (id) => { 
    if (confirm("Permanently remove this entry from logs?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id)); 
    }
  };

  const exportToExcel = () => {
    const headers = [
      'Timestamp', 'Manager', 'Shop', 'GA Goal', 'GA Achieved', 'GA %', 'OC Goal', 'OC Achieved', 'OC %', 'Notes'
    ];
    
    const rows = filtered.map(r => {
      const target = targets[r.shopName] || { ga: 0, oc: 0 };
      const shopTotals = shopAggregates[r.shopName] || { totalGA: 0, totalOC: 0 };
      const gaPercent = target.ga > 0 ? ((shopTotals.totalGA / target.ga) * 100).toFixed(1) : '0';
      const ocPercent = target.oc > 0 ? ((shopTotals.totalOC / target.oc) * 100).toFixed(1) : '0';

      return [
        new Date(r.timestamp).toLocaleString(),
        r.areaManager,
        r.shopName,
        target.ga,
        r.gaAch,
        gaPercent + '%',
        target.oc,
        r.ocAch,
        ocPercent + '%',
        r.note || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Audit Logs</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Historical Sales Data & Performance Tracking</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-100 gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase px-2">Range</span>
            <input type="date" className="bg-transparent text-[11px] font-bold outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-slate-200">/</span>
            <input type="date" className="bg-transparent text-[11px] font-bold outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="bg-white p-3 border border-slate-100 rounded-2xl font-black text-[11px] shadow-sm outline-none px-6">
            <option value="All">All Leads</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#0F172A] text-white px-6 py-4 rounded-2xl font-black text-[11px] hover:bg-black shadow-lg transition-all active:scale-95">
            <FileSpreadsheet size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1200px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-6">Incident Date</th>
                <th className="px-8 py-6">Shop Location</th>
                <th className="px-6 py-6 text-center bg-rose-50/20 text-rose-500">GA Status</th>
                <th className="px-6 py-6 text-center bg-blue-50/20 text-blue-500">OC Status</th>
                <th className="px-8 py-6">Personnel</th>
                {role === 'admin' && <th className="px-8 py-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[11px] font-bold">
              {filtered.map(r => {
                const target = targets[r.shopName] || { ga: 0, oc: 0 };
                const shopTotals = shopAggregates[r.shopName] || { totalGA: 0, totalOC: 0 };
                const gaPercent = target.ga > 0 ? ((shopTotals.totalGA / target.ga) * 100).toFixed(0) : '0';
                const ocPercent = target.oc > 0 ? ((shopTotals.totalOC / target.oc) * 100).toFixed(0) : '0';

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-all tabular-nums group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-slate-900 text-[13px]">{new Date(r.timestamp).toLocaleDateString()}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[13px] text-slate-800 tracking-tight font-black">{r.shopName}</span>
                    </td>
                    
                    {/* GA STATS */}
                    <td className="px-4 py-6 bg-rose-50/10">
                      <div className="flex flex-col items-center">
                        <span className="text-rose-600 font-black text-[14px]">+{r.gaAch}</span>
                        <div className="flex items-center gap-1 text-[9px] text-slate-300">
                           <span>{gaPercent}% of {target.ga}</span>
                        </div>
                      </div>
                    </td>

                    {/* OC STATS */}
                    <td className="px-4 py-6 bg-blue-50/10">
                      <div className="flex flex-col items-center">
                        <span className="text-blue-600 font-black text-[14px]">+{r.ocAch}</span>
                        <div className="flex items-center gap-1 text-[9px] text-slate-300">
                           <span>{ocPercent}% of {target.oc}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 uppercase">{r.areaManager.charAt(0)}</div>
                        <span className="text-slate-500 uppercase tracking-tighter">{r.areaManager}</span>
                      </div>
                    </td>

                    {role === 'admin' && (
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => handleDelete(r.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-24 text-center">
              <ClipboardList size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-300 font-black uppercase tracking-widest text-sm italic">No entries match your search criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets }) {
  const [filterManager, setFilterManager] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({ ga: 0, oc: 0 });
  const [status, setStatus] = useState(null);

  const filteredShops = useMemo(() => 
    shops.filter(s => 
      (filterManager === 'All' || s.manager === filterManager) && 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [shops, filterManager, searchTerm]
  );

  const handleSave = async (shopName) => {
    const newTargets = { ...targets, [shopName]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
    setEditingShop(null);
    setStatus("System target recalibrated.");
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 italic">Target Grid</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Operational Goal Management</p>
        </div>
      </header>
      
      {status && (
        <div className="bg-rose-600 text-white p-4 rounded-3xl text-center text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20">
          {status}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
          <input 
            type="text" placeholder="Filter by shop name..." 
            className="w-full bg-white p-5 pl-14 rounded-[2rem] shadow-sm outline-none border border-slate-100 font-bold focus:ring-4 focus:ring-rose-500/5 transition-all" 
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white px-8 py-5 rounded-[2rem] shadow-sm font-black text-xs border border-slate-100 outline-none">
          <option value="All">All Lead Regions</option>
          {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.map(shop => (
          <div key={shop.name} className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-6 transition-all hover:shadow-lg">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="font-black text-xl tracking-tight text-slate-900">{shop.name}</h4>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{shop.manager}</p>
                </div>
              </div>
              <button 
                onClick={() => {setEditingShop(shop.name); setEditForm({ga: targets[shop.name]?.ga||0, oc: targets[shop.name]?.oc||0})}} 
                className="text-slate-300 hover:text-rose-600 p-3 bg-slate-50 rounded-2xl transition-all"
              >
                <Edit3 size={18}/>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100/50">
                <p className="text-[9px] font-black text-rose-500 uppercase mb-3 tracking-widest">GA Benchmark</p>
                {editingShop === shop.name ? 
                  <input type="number" className="w-full bg-transparent font-black text-2xl border-b-2 border-rose-500 outline-none text-rose-700" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} autoFocus /> : 
                  <span className="text-3xl font-black text-rose-700 tracking-tighter tabular-nums">{targets[shop.name]?.ga?.toLocaleString() || 0}</span>
                }
              </div>
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                <p className="text-[9px] font-black text-blue-500 uppercase mb-3 tracking-widest">OC Benchmark</p>
                {editingShop === shop.name ? 
                  <input type="number" className="w-full bg-transparent font-black text-2xl border-b-2 border-blue-500 outline-none text-blue-700" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : 
                  <span className="text-3xl font-black text-blue-700 tracking-tighter tabular-nums">{targets[shop.name]?.oc?.toLocaleString() || 0}</span>
                }
              </div>
            </div>

            {editingShop === shop.name && (
              <div className="flex gap-3 pt-2">
                <button onClick={() => handleSave(shop.name)} className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-rose-600/20 transition-all hover:bg-rose-700">
                  <Check size={20}/> Deploy
                </button>
                <button onClick={() => setEditingShop(null)} className="bg-slate-100 text-slate-400 px-6 rounded-2xl font-black hover:bg-slate-200 transition-all">
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserSearch({ users, managers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user', assignedManager: '' });
  const [updating, setUpdating] = useState(false);

  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleUpdate = async (uid) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), editForm);
      setEditingId(null);
    } catch (err) { console.error(err); }
    setUpdating(false);
  };

  const handleDeleteUser = async (uid) => {
    if (!confirm("Terminate this user profile from the system?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 italic">Personnel Map</h2>
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"/>
        <input 
          type="text" placeholder="Search team members by name..." 
          className="w-full bg-white p-6 pl-16 rounded-[2.5rem] shadow-sm outline-none border border-slate-100 focus:ring-4 focus:ring-rose-500/5 font-bold transition-all" 
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(u => (
          <div key={u.uid} className={`bg-white p-10 rounded-[4rem] border transition-all duration-300 relative group ${editingId === u.uid ? 'border-rose-500 shadow-2xl shadow-rose-500/10' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center font-black text-slate-300 text-4xl uppercase border-4 border-white shadow-lg">
                  {u.username?.charAt(0)}
                </div>
                {u.role === 'admin' && (
                  <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-2 rounded-xl shadow-lg">
                    <ShieldCheck size={16} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {editingId === u.uid ? 
                  <input className="w-full font-black text-center text-xl border-b-2 border-rose-500 outline-none py-1 bg-transparent" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /> : 
                  <p className="font-black text-slate-900 text-2xl tracking-tighter">{u.username}</p>
                }
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${u.role === 'admin' ? 'text-rose-600' : 'text-slate-400'}`}>
                    Level: {u.role}
                  </span>
                  {u.assignedManager && (
                    <span className="text-[10px] font-bold text-slate-300 uppercase italic">Active Region: {u.assignedManager}</span>
                  )}
                </div>
              </div>

              {editingId === u.uid ? (
                <div className="w-full space-y-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1 text-left">
                     <label className="text-[9px] font-black uppercase text-slate-300 ml-2">System Clearance</label>
                     <select className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-none outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                       <option value="user">Operational User</option>
                       <option value="admin">System Administrator</option>
                     </select>
                  </div>
                  <div className="space-y-1 text-left">
                     <label className="text-[9px] font-black uppercase text-slate-300 ml-2">Regional Assignment</label>
                     <select className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-none outline-none" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                       <option value="">No Global Assignment</option>
                       {managers.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-rose-600 text-white p-4 rounded-2xl shadow-xl shadow-rose-600/20 flex justify-center hover:bg-rose-700 transition-all">
                      {updating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-400 p-4 rounded-2xl hover:bg-slate-200 transition-all"><X size={20}/></button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex gap-2">
                  <button onClick={() => {setEditingId(u.uid); setEditForm({username: u.username, role: u.role, assignedManager: u.assignedManager || ''})}} className="flex-1 bg-slate-50 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                    <UserCog size={14}/> Modify Profile
                  </button>
                  <button onClick={() => handleDeleteUser(u.uid)} className="p-4 bg-rose-50 text-rose-300 hover:text-rose-600 rounded-2xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const [editingManager, setEditingManager] = useState(null);
  const [editValue, setEditValue] = useState('');

  const updateConfig = async (m, s) => { 
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { 
        areaManagers: m || areaManagers, 
        shops: s || shops, 
        targets 
      }); 
    } catch (e) { console.error(e); }
  };

  const handleAddManager = () => {
    if (!newManager.trim()) return;
    updateConfig([...areaManagers, newManager.trim()], null);
    setNewManager('');
  };

  const handleEditManager = (m) => {
    setEditingManager(m);
    setEditValue(m);
  };

  const saveEditManager = async (oldName) => {
    const updatedM = areaManagers.map(m => m === oldName ? editValue : m);
    const updatedS = shops.map(s => s.manager === oldName ? { ...s, manager: editValue } : s);
    await updateConfig(updatedM, updatedS);
    setEditingManager(null);
  };

  const handleDeleteManager = (name) => {
    if (!confirm(`Delete lead "${name}"? This will dissolve their shop linkages.`)) return;
    const updatedM = areaManagers.filter(m => m !== name);
    const updatedS = shops.filter(s => s.manager !== name);
    updateConfig(updatedM, updatedS);
  };

  const handleDeleteShop = (name) => {
    if (!confirm(`Permanently decommission shop location "${name}"?`)) return;
    const updatedS = shops.filter(s => s.name !== name);
    updateConfig(null, updatedS);
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Infrastructure</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Core Entity Management</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-4"><UserPlus className="text-rose-600" size={28} /><h3 className="font-black text-slate-800 tracking-tight uppercase text-lg">Lead Generation</h3></div>
          <div className="flex gap-3">
            <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/5 transition-all" placeholder="Enter Full Name" />
            <button onClick={handleAddManager} className="bg-rose-600 text-white px-8 rounded-2xl font-black shadow-lg shadow-rose-600/20 active:scale-95 transition-all">Add Lead</button>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-4"><Store className="text-rose-600" size={28} /><h3 className="font-black text-slate-800 tracking-tight uppercase text-lg">Shop Activation</h3></div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-500/5 transition-all" placeholder="Location Name" />
            <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none cursor-pointer">
              <option value="">Select Regional Lead</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => { if (newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); }} className="bg-[#0F172A] text-white px-8 py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">Deploy</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Regional Lead</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Shop Location</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Entity Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shops.length === 0 ? (
                <tr><td colSpan="3" className="p-32 text-center text-slate-300 font-black italic uppercase tracking-widest text-sm">No active shop nodes identified</td></tr>
              ) : shops.map((shop, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                    {editingManager === shop.manager ? (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                        <input className="bg-white border-2 border-rose-500 rounded-xl font-bold outline-none p-3 shadow-xl shadow-rose-500/10" value={editValue} onChange={e => setEditValue(e.target.value)} />
                        <button onClick={() => saveEditManager(shop.manager)} className="text-green-500 bg-green-50 p-3 rounded-xl hover:bg-green-100 transition-all"><Check size={20} /></button>
                        <button onClick={() => setEditingManager(null)} className="text-slate-300 bg-slate-50 p-3 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <span className="font-black text-slate-900 text-xl tracking-tighter">{shop.manager}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => handleEditManager(shop.manager)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl"><Edit3 size={16} /></button>
                          <button onClick={() => handleDeleteManager(shop.manager)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-10 py-8">
                    <span className="font-bold text-slate-600 tracking-tight text-[15px]">{shop.name}</span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => handleDeleteShop(shop.name)} className="p-4 bg-slate-50 text-slate-300 rounded-3xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
