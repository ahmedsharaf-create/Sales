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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, Legend 
} from 'recharts';

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

// --- DASHBOARD (POWER BI STYLE) ---

function Dashboard({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
  const [filterShop, setFilterShop] = useState('All');
  const [dateRange, setDateRange] = useState('This Month');

  // Filter Logic
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

  // KPI Calculations
  const stats = useMemo(() => {
    const totalGA = filteredRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
    
    let targetGA = 0;
    let targetOC = 0;
    const activeShopNames = filterShop === 'All' 
      ? shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => s.name) 
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
  }, [filteredRecords, targets, filterShop, filterManager, shops]);

  // Chart Data: Daily Trend
  const chartData = useMemo(() => {
    const dailyMap = {};
    filteredRecords.forEach(r => {
      const dateKey = new Date(r.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { name: dateKey, GA: 0, OC: 0 };
      dailyMap[dateKey].GA += r.gaAch;
      dailyMap[dateKey].OC += r.ocAch;
    });
    return Object.values(dailyMap).reverse().slice(-10);
  }, [filteredRecords]);

  // Chart Data: Manager Distribution
  const managerData = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!map[r.areaManager]) map[r.areaManager] = 0;
      map[r.areaManager] += r.gaAch + r.ocAch;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
          <Activity size={18} className="text-emerald-500" />
          <h2 className="font-black uppercase text-sm tracking-tight">Sales Analytics</h2>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter size={14} />
          <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }} className="bg-slate-50 border-none rounded-lg p-2 outline-none">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Store size={14} />
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="bg-slate-50 border-none rounded-lg p-2 outline-none">
            <option value="All">All Shops</option>
            {shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Calendar size={14} />
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-slate-50 border-none rounded-lg p-2 outline-none">
            <option>Today</option>
            <option>This Month</option>
            <option>All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Total Achievement" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#10b981" />
        <KPIBox title="OC Total Achievement" value={stats.totalOC} target={stats.targetOC} progress={stats.ocAchieved} color="#3b82f6" />
        <KPIBox title="Avg Success Rate" value={`${((stats.gaAchieved + stats.ocAchieved) / 2).toFixed(1)}%`} progress={(stats.gaAchieved + stats.ocAchieved) / 2} color="#8b5cf6" />
        <KPIBox title="Total Submissions" value={filteredRecords.length} subtext="Entries recorded" color="#64748b" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-700 text-sm uppercase flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Daily Achievement Trend
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="GA" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGA)" />
                <Area type="monotone" dataKey="OC" stroke="#3b82f6" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Manager Distribution */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-700 text-sm uppercase mb-6 flex items-center gap-2">
            <PieIcon size={18} className="text-purple-500" /> Manager Share
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={managerData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {managerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {managerData.map((m, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-bold text-slate-600">{m.name}</span>
                </div>
                <span className="text-xs font-black">{m.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-700 text-sm uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> Top Performing Shops (GA)
          </h3>
          <div className="space-y-4">
            {shops.slice(0, 5).map(shop => {
              const shopAch = filteredRecords.filter(r => r.shopName === shop.name).reduce((a, b) => a + b.gaAch, 0);
              const shopTarget = targets[shop.name]?.ga || 0;
              const p = shopTarget > 0 ? (shopAch / shopTarget) * 100 : 0;
              return (
                <div key={shop.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800">{shop.name}</span>
                    <span className={p >= 100 ? 'text-emerald-600' : 'text-slate-400'}>{p.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
           <h3 className="font-black text-slate-700 text-sm uppercase mb-6 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {filteredRecords.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <Store size={14} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">{r.shopName}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">+{r.gaAch} GA</p>
                  <p className="text-[10px] text-blue-500 font-bold">+{r.ocAch} OC</p>
                </div>
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
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 hover:shadow-xl transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <div className="flex items-baseline gap-2 mb-4 relative">
        <h4 className="text-3xl font-black text-slate-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-bold italic">/ {target.toLocaleString()}</span>}
      </div>
      
      {progress !== undefined ? (
        <div className="space-y-2 relative">
          <div className="flex justify-between items-center">
            <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {progress.toFixed(1)}%
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{subtext}</p>
      )}
    </div>
  );
}

// --- LOADING & LOGIN ---

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-slate-500 font-bold tracking-tighter">Pyramids Analytics...</p>
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
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError("Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Pyramids Sales</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enterprise Sales Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required type="email" placeholder="Email" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

// --- OTHER COMPONENTS (UNCHANGED LOGIC, STYLED) ---

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-6 italic tracking-tighter">Enter Your Name</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl border-none outline-none focus:ring-2 focus:ring-emerald-500/20" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black">CONTINUE</button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Sales Collection', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Monthly Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team Search', icon: Search, roles: ['admin'] },
    { id: 'admin', label: 'System Admin', icon: Settings, roles: ['admin'] },
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="bg-emerald-500 p-2 rounded-lg"><Store className="text-white" size={20} /></div>
        <h1 className="text-lg font-bold text-white uppercase tracking-tighter">Pyramids</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map(link => {
          if (!link.roles.includes(role)) return null;
          return (
            <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'hover:bg-slate-800'}`}>
              <link.icon size={18} /> <span className="font-medium text-sm">{link.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 font-bold text-sm">
        <LogOut size={18} /> Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 shadow-2xl">
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
    if (!user) return;
    setSubmitting(true);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { ...formData, gaAch: Number(formData.gaAch), ocAch: Number(formData.ocAch), timestamp: Date.now(), submittedBy: user.uid });
    setSuccess(true);
    setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
    setTimeout(() => setSuccess(false), 3000);
    setSubmitting(false);
  };
  return (
    <div className="max-w-2xl mx-auto py-6">
      <h2 className="text-4xl font-black text-[#0F172A] mb-8 text-center italic uppercase">Daily Entry</h2>
      {success && <div className="bg-emerald-600 text-white p-5 rounded-3xl text-center font-black mb-6">SAVED!</div>}
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select required className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
            <option value="">Manager</option>
            {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select required disabled={!formData.areaManager} className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
            <option value="">Shop</option>
            {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <input required type="text" placeholder="Working Hours" className="w-full bg-slate-50 p-4 rounded-xl font-bold" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
        <div className="grid grid-cols-2 gap-6">
          <input required type="number" placeholder="GA Ach" className="w-full bg-emerald-50 p-6 rounded-2xl text-2xl font-black text-emerald-600" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-6 rounded-2xl text-2xl font-black text-blue-600" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <textarea placeholder="Feedback" className="w-full bg-slate-50 p-4 rounded-xl min-h-[100px]" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-xl">{submitting ? '...' : 'SUBMIT'}</button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role, db, appId }) {
  const [filterManager, setFilterManager] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filtered = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (startDate) data = data.filter(r => r.timestamp >= new Date(startDate).getTime());
    if (endDate) data = data.filter(r => r.timestamp <= new Date(endDate).getTime());
    return data;
  }, [records, filterManager, startDate, endDate]);
  const handleDelete = async (id) => {
    if (confirm("Delete?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id));
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Sales Collection</h2>
        <div className="flex gap-2">
          <input type="date" className="bg-white p-2 rounded-xl text-xs border" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="bg-white p-2 rounded-xl text-xs border" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white p-2 rounded-xl text-xs border font-bold">
            <option value="All">All</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>
      <div className="bg-white rounded-3xl border shadow-xl overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-900 text-slate-400">
            <tr className="text-[10px] font-black uppercase">
              <th className="px-6 py-4">Date</th><th className="px-6 py-4">Shop</th><th className="px-6 py-4 text-emerald-400 text-center">GA</th><th className="px-6 py-4 text-blue-400 text-center">OC</th><th className="px-6 py-4">Manager</th>{role==='admin'&&<th className="px-6 py-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y text-xs font-bold">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-400">{new Date(r.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4">{r.shopName}</td>
                <td className="px-6 py-4 text-center text-emerald-600">+{r.gaAch}</td>
                <td className="px-6 py-4 text-center text-blue-600">+{r.ocAch}</td>
                <td className="px-6 py-4 text-slate-400 uppercase tracking-tighter">{r.areaManager}</td>
                {role==='admin' && <td className="px-6 py-4 text-right"><button onClick={()=>handleDelete(r.id)} className="text-red-400"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets, db, appId }) {
  const [filterManager, setFilterManager] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({ ga: '', oc: '' });
  const filteredShops = useMemo(() => shops.filter(s => (filterManager === 'All' || s.manager === filterManager) && s.name.toLowerCase().includes(searchTerm.toLowerCase())), [shops, filterManager, searchTerm]);
  const handleSave = async (shopName) => {
    const newTargets = { ...targets, [shopName]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
    setEditingShop(null);
  };
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center"><h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Target Control</h2></header>
      <div className="flex gap-4">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" placeholder="Search shops..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white px-4 rounded-2xl shadow-sm font-bold text-sm"><option value="All">All Managers</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.map(shop => (
          <div key={shop.name} className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
            <div className="flex justify-between items-start"><div><h4 className="font-black text-lg">{shop.name}</h4><p className="text-[10px] text-slate-400 uppercase font-black">MGR: {shop.manager}</p></div><button onClick={() => {setEditingShop(shop.name); setEditForm({ga: targets[shop.name]?.ga||0, oc: targets[shop.name]?.oc||0})}} className="text-slate-300 hover:text-emerald-500"><Edit3 size={18}/></button></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-4 rounded-2xl"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">GA</p>{editingShop===shop.name?<input type="number" className="w-full bg-transparent font-black border-b border-emerald-500 outline-none" value={editForm.ga} onChange={e=>setEditForm({...editForm, ga: e.target.value})} />:<span className="text-xl font-black text-emerald-700">{targets[shop.name]?.ga||0}</span>}</div>
              <div className="bg-blue-50/50 p-4 rounded-2xl"><p className="text-[9px] font-black text-blue-600 uppercase mb-1">OC</p>{editingShop===shop.name?<input type="number" className="w-full bg-transparent font-black border-b border-blue-500 outline-none" value={editForm.oc} onChange={e=>setEditForm({...editForm, oc: e.target.value})} />:<span className="text-xl font-black text-blue-700">{targets[shop.name]?.oc||0}</span>}</div>
            </div>
            {editingShop===shop.name && <button onClick={()=>handleSave(shop.name)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2"><Check size={18}/> SAVE</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserSearch({ users, db, appId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user' });
  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleUpdate = async (uid) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), editForm);
    setEditingId(null);
  };
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase tracking-tighter">Team Search</h2>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/><input type="text" placeholder="Search members..." className="w-full bg-white p-4 pl-12 rounded-2xl shadow-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map(u => (
          <div key={u.uid} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400">{u.username?.charAt(0)}</div>
              <div className="flex-1">
                {editingId===u.uid?<input className="w-full font-black border-b border-emerald-500 outline-none" value={editForm.username} onChange={e=>setEditForm({...editForm, username: e.target.value})} />:<p className="font-black text-slate-800">{u.username}</p>}
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{u.role}</span>
              </div>
            </div>
            {editingId===u.uid ? <div className="flex gap-2"><select className="flex-1 bg-slate-50 rounded-lg p-2 text-xs font-bold" value={editForm.role} onChange={e=>setEditForm({...editForm, role: e.target.value})}><option value="user">USER</option><option value="admin">ADMIN</option></select><button onClick={()=>handleUpdate(u.uid)} className="bg-emerald-600 text-white p-2 rounded-lg"><Save size={16}/></button></div> : <button onClick={()=>{setEditingId(u.uid); setEditForm({username:u.username, role:u.role})}} className="w-full bg-slate-50 text-slate-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"><UserCog size={14} className="inline mr-2"/> Manage</button>}
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
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <header><h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Structure Admin</h2></header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2"><UserPlus className="text-indigo-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Manager</h3></div>
          <div className="flex gap-2"><input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold outline-none" placeholder="Manager Name" /><button onClick={() => { if(newManager.trim()) { updateConfig([...areaManagers, newManager.trim()], null); setNewManager(''); } }} className="bg-indigo-600 text-white px-6 rounded-xl font-black">Add</button></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2"><Store className="text-emerald-600" size={24} /><h3 className="font-black text-slate-700 tracking-tight uppercase">New Cashshop</h3></div>
          <div className="flex gap-2 flex-col sm:flex-row"><input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold outline-none" placeholder="Shop Name" /><select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="bg-slate-50 border-none p-4 rounded-xl font-bold outline-none cursor-pointer"><option value="">Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select><button onClick={() => {if (newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop('');}} className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black">Link</button></div>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-900 text-slate-400"><tr><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Area Manager</th><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Cashshop</th><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th></tr></thead><tbody className="divide-y">{shops.map((shop, idx) => (<tr key={idx} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-6 font-black text-slate-800 text-lg tracking-tight">{shop.manager}</td><td className="px-8 py-6 font-bold text-slate-600">{shop.name}</td><td className="px-8 py-6 text-right"><button onClick={async () => {const s=shops.filter((_,i)=>i!==idx); await updateConfig(null, s);}} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div>
    </div>
  );
}
