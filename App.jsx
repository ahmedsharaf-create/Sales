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
  updateDoc
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
  Clock, 
  TrendingUp, 
  Settings,
  Trash2,
  ChevronRight,
  Loader2,
  Download,
  Filter,
  BarChart3,
  Target,
  Calendar,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Database,
  Info,
  LogOut,
  User as UserIcon,
  Search,
  Lock,
  Mail
} from 'lucide-react';

// --- Firebase Configuration ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
    if (window && window.__firebase_config) {
      return typeof window.__firebase_config === 'string' 
        ? JSON.parse(window.__firebase_config) 
        : window.__firebase_config;
    }
  } catch (e) {
    console.warn("Firebase config parsing failed:", e);
  }
  return { apiKey: "" };
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;

if (firebaseConfig && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'cash-shop-sales-v3';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Auth Observer
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setUserProfile(profile);
          setView('dashboard');
        } else {
          setView('onboarding');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Sync
  useEffect(() => {
    if (!user || !userProfile || !db) return;

    // Config Sync
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    });

    // Sales Sync
    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
    });

    // User Directory Sync (Admin Only)
    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubSettings();
      unsubSales();
      unsubUsers();
    };
  }, [user, userProfile]);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-bold tracking-tight">Accessing Secure Portal...</p>
        </div>
      </div>
    );
  }

  if (view === 'login') return <LoginPortal appId={appId} db={db} auth={auth} setView={setView} />;
  if (view === 'onboarding') return <Onboarding appId={appId} db={db} user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {/* View Routing */}
        {view === 'dashboard' && (
          userProfile?.role === 'admin' ? (
            <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} />
          ) : (
            <UserWelcome profile={userProfile} setView={setView} />
          )
        )}
        
        {view === 'collection' && (
          <SalesCollectionForm areaManagers={areaManagers} shops={shops} appId={appId} db={db} user={user} />
        )}
        
        {view === 'reports' && (
          <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />
        )}
        
        {view === 'admin' && userProfile?.role === 'admin' && (
          <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} appId={appId} db={db} user={user} />
        )}

        {view === 'userSearch' && userProfile?.role === 'admin' && (
          <UserSearch users={allUsers} />
        )}
      </main>

      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- AUTH COMPONENTS ---

function LoginPortal({ appId, db, auth, setView }) {
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
      setError(err.message.replace('Firebase:', ''));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Cash Shop System</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enterprise Sales Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              required type="email" placeholder="Email Address" 
              className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              required type="password" placeholder="Password" 
              className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center border border-red-100">{error}</div>}

          <button 
            disabled={loading}
            className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-emerald-600 transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

function Onboarding({ appId, db, user, setView, setUserProfile }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const profile = { username: name, role: 'user', createdAt: Date.now() };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
    setUserProfile(profile);
    setView('dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center italic">Personalize Your Profile</h2>
        <input 
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Enter your display name"
          className="w-full border-2 border-slate-50 bg-slate-50 p-5 rounded-2xl font-bold mb-6 outline-none focus:ring-2 focus:ring-emerald-500/20 text-center text-xl"
        />
        <button 
          onClick={handleSave} disabled={loading || !name}
          className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}

// --- UI COMPONENTS ---

function UserWelcome({ profile, setView }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
      <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner">
        <UserIcon className="text-emerald-600" size={48} />
      </div>
      <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tighter">Welcome, {profile.username}</h2>
      <p className="text-slate-400 text-lg mb-12 font-medium">Your account is ready. What would you like to do first?</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button onClick={() => setView('collection')} className="flex-1 bg-slate-900 text-white p-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
          <PlusCircle size={24} /> Log Sales
        </button>
        <button onClick={() => setView('reports')} className="flex-1 bg-white border border-slate-200 text-slate-600 p-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
          <ClipboardList size={24} /> History
        </button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Audit Log', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'userSearch', label: 'Team Search', icon: Search, roles: ['admin'] },
    { id: 'admin', label: 'System Admin', icon: Settings, roles: ['admin'] },
  ];

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="bg-emerald-500 p-2 rounded-lg shadow-lg">
          <Store className="text-white" size={18} />
        </div>
        <h1 className="text-lg font-bold text-white uppercase tracking-wider">Cash Shop</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map((link) => {
          if (!link.roles.includes(role)) return null;
          return (
            <button
              key={link.id}
              onClick={() => setView(link.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                view === link.id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'hover:bg-slate-800'
              }`}
            >
              <link.icon size={18} />
              <span className="font-medium text-sm">{link.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all font-bold text-sm">
        <LogOut size={18} /> Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [
    { id: 'dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'userSearch', icon: Search, roles: ['admin'] },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-3 md:hidden z-50">
      {icons.map(item => {
        if (!item.roles.includes(role)) return null;
        return (
          <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl transition-colors ${view === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
            <item.icon size={22} />
          </button>
        );
      })}
    </div>
  );
}

// --- CORE FEATURE VIEWS ---

function Dashboard({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
  
  const stats = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    
    const gaAch = data.reduce((a, b) => a + (b.gaAch || 0), 0);
    const ocAch = data.reduce((a, b) => a + (b.ocAch || 0), 0);
    
    let gaTarget = 0; let ocTarget = 0;
    shops.filter(s => filterManager === 'All' || s.manager === filterManager).forEach(s => {
      gaTarget += Number(targets[s.name]?.ga || 0);
      ocTarget += Number(targets[s.name]?.oc || 0);
    });

    return { gaAch, ocAch, gaTarget, ocTarget, gaP: gaTarget > 0 ? (gaAch / gaTarget) * 100 : 0, ocP: ocTarget > 0 ? (ocAch / ocTarget) * 100 : 0 };
  }, [records, targets, shops, filterManager]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Analytics Console</h2>
          <p className="text-slate-400 font-medium">Real-time performance across all locations</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm self-start">
          <Filter size={16} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700 text-sm">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="Total GA Achieved" value={stats.gaAch} target={stats.gaTarget} progress={stats.gaP} color="emerald" />
        <KPIBox title="Total OC Achieved" value={stats.ocAch} target={stats.ocTarget} progress={stats.ocP} color="blue" />
        <KPIBox title="Overall Achievement" value={`${((stats.gaP + stats.ocP) / 2).toFixed(1)}%`} progress={(stats.gaP + stats.ocP) / 2} color="purple" />
        <KPIBox title="Active Stores" value={shops.length} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-500" /> Shop Performance Rankings
          </h3>
          <div className="space-y-8">
            {shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(shop => {
              const shopRecords = records.filter(r => r.shopName === shop.name);
              const ga = shopRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
              const target = Number(targets[shop.name]?.ga || 0);
              const percent = target > 0 ? (ga / target) * 100 : 0;
              return (
                <div key={shop.name} className="space-y-3 group">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-base font-black text-slate-700">{shop.name}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manager: {shop.manager}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-[#0F172A] text-white rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2"><UsersIcon size={24} className="text-emerald-400"/> Manager Audit</h3>
          <div className="space-y-4">
            {managers.map(m => {
              const count = records.filter(r => r.areaManager === m).length;
              return (
                <div key={m} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="font-bold text-sm">{m}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-tighter">{count} entries</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color }) {
  const bars = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500', slate: 'bg-slate-500' };
  return (
    <div className="p-7 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <div className="flex items-baseline gap-2 mb-5">
        <h4 className="text-3xl font-black text-slate-900 leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-bold">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${bars[color]} transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, appId, db, user }) {
  const [formData, setFormData] = useState({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const availableShops = useMemo(() => formData.areaManager ? shops.filter(s => s.manager === formData.areaManager) : [], [formData.areaManager, shops]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        gaAch: Number(formData.gaAch) || 0, 
        ocAch: Number(formData.ocAch) || 0, 
        timestamp: Date.now(), 
        submittedBy: user.uid 
      });
      setSuccess(true);
      setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-12 text-center">Sales Entry</h2>
      {success && <div className="bg-emerald-600 text-white p-6 rounded-[2rem] text-center font-black mb-8 shadow-2xl animate-bounce">Report Saved Successfully</div>}
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Area Manager</label>
            <select required className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              <option value="">Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Shop Location</label>
            <select required disabled={!formData.areaManager} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg disabled:opacity-30" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Location</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-emerald-500">GA Achievement</label>
            <input required type="number" className="w-full border-2 border-emerald-50 p-8 rounded-[2rem] font-black text-4xl text-emerald-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-500">OC Achievement</label>
            <input required type="number" className="w-full border-2 border-blue-50 p-8 rounded-[2rem] font-black text-4xl text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400">Shift Feed</label>
          <textarea className="w-full border-2 border-slate-50 p-8 rounded-[2rem] font-medium h-40 bg-slate-50" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Context about today's performance..."/>
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl hover:bg-black active:scale-[0.98] transition-all shadow-2xl">
          {submitting ? 'Submitting...' : 'Confirm Report'}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role }) {
  const [filterManager, setFilterManager] = useState('All');

  const filtered = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    return data;
  }, [records, filterManager]);

  const aggregates = useMemo(() => {
    const map = {};
    records.filter(r => new Date(r.timestamp).getMonth() === new Date().getMonth()).forEach(r => {
      if (!map[r.shopName]) map[r.shopName] = { ga: 0, oc: 0 };
      map[r.shopName].ga += (r.gaAch || 0);
      map[r.shopName].oc += (r.ocAch || 0);
    });
    return map;
  }, [records]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{role === 'admin' ? 'Operational Audit' : 'My Submission Log'}</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Detailed performance tracking (12 Columns)</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm text-sm">
          <Filter size={18} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700">
            <option value="All">Filter Manager</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[1500px]">
          <thead>
            <tr className="bg-slate-900 text-slate-400">
              <th className="px-6 py-5 text-[10px] font-black uppercase">Timestamp</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase">Manager</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase">Date</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase">Location</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-emerald-900/10">GA Target</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-emerald-900/10 text-emerald-400">GA Ach</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-emerald-900/10">GA %</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-emerald-900/10">GA Rem.</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-blue-900/10">OC Target</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-blue-900/10 text-blue-400">OC Ach</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-blue-900/10">OC %</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase text-right bg-blue-900/10">OC Rem.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const t = targets[r.shopName] || { ga: 0, oc: 0 };
              const agg = aggregates[r.shopName] || { ga: 0, oc: 0 };
              const gaP = t.ga > 0 ? (agg.ga / t.ga * 100).toFixed(1) : 0;
              const ocP = t.oc > 0 ? (agg.oc / t.oc * 100).toFixed(1) : 0;
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group tabular-nums">
                  <td className="px-6 py-4 text-[10px] font-black text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{r.areaManager}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(r.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">{r.shopName}</td>
                  <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-emerald-50/5">{t.ga.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-sm font-black text-emerald-600 bg-emerald-50/10">+{r.gaAch.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-xs font-black bg-emerald-50/5">{gaP}%</td>
                  <td className="px-4 py-4 text-right text-xs font-bold bg-emerald-50/5 text-slate-400">{Math.max(0, t.ga - agg.ga).toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-blue-50/5">{t.oc.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-sm font-black text-blue-600 bg-blue-50/10">+{r.ocAch.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-xs font-black bg-blue-50/5">{ocP}%</td>
                  <td className="px-4 py-4 text-right text-xs font-bold bg-blue-50/5 text-slate-400">{Math.max(0, t.oc - agg.oc).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserSearch({ users }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Personnel Directory</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Cross-system user lookup</p>
      </header>
      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" placeholder="Lookup by username..."
          className="w-full bg-white border border-slate-200 p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(u => (
          <div key={u.uid} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors uppercase">
              {u.username?.charAt(0)}
            </div>
            <div>
              <p className="font-black text-slate-800">{u.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                  {u.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, appId, db, user }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const [seeding, setSeeding] = useState(false);

  const updateConfig = async (m, s, t) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets: t || targets });
  };

  const seedTestData = async () => {
    setSeeding(true);
    const testManagers = ["Sarah Thompson", "David Miller", "Jessica Wu"];
    const testShops = [{ name: "Downtown Mall", manager: "Sarah Thompson" }, { name: "Ocean Hub", manager: "David Miller" }];
    const testTargets = { "Downtown Mall": { ga: 25000, oc: 15000 }, "Ocean Hub": { ga: 18000, oc: 12000 } };
    await updateConfig(testManagers, testShops, testTargets);
    setSeeding(false);
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = evt.target.result.split('\n').map(r => r.split(','));
      const newT = { ...targets };
      rows.slice(1).forEach(row => {
        if (row.length >= 3) {
          const name = row[0].trim().replace(/"/g, '');
          if (shops.some(s => s.name === name)) newT[name] = { ga: parseFloat(row[1]) || 0, oc: parseFloat(row[2]) || 0 };
        }
      });
      updateConfig(null, null, newT);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Controls</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Global structure management</p>
        </div>
        <button onClick={seedTestData} disabled={seeding} className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center gap-3 shadow-2xl active:scale-95 transition-all">
          {seeding ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />} Generate Sandbox Data
        </button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3"><UsersIcon size={20} className="text-slate-400"/> Territory Managers</h3>
          <div className="flex gap-2 mb-6">
            <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Manager Name" />
            <button onClick={() => {if(newManager) updateConfig([...areaManagers, newManager], null, null); setNewManager('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black transition-transform active:scale-95">Add</button>
          </div>
          <div className="space-y-2">
            {areaManagers.map((m, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 text-sm">{m}</div>)}
          </div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3"><Store size={20} className="text-slate-400"/> Location Mapping</h3>
          <div className="space-y-3">
            <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-slate-50 outline-none text-sm">
              <option value="">Select Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Shop Name" />
              <button onClick={() => {if(newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}], null); setNewShop('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black active:scale-95">Add</button>
            </div>
          </div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3"><FileSpreadsheet size={20} className="text-emerald-500"/> Bulk Targets Upload</h3>
          <div className="flex-1 border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 text-center flex flex-col items-center justify-center relative hover:bg-slate-50 transition-all cursor-pointer group">
            <input type="file" accept=".csv" onChange={handleCSV} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload size={48} className="text-slate-200 mb-4 group-hover:text-emerald-500 transition-colors" />
            <p className="font-black text-slate-400 uppercase text-xs group-hover:text-emerald-600">Drop CSV File Here</p>
          </div>
        </section>
      </div>
    </div>
  );
}
