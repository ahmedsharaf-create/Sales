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
  Mail,
  ShieldCheck,
  UserCog,
  Save,
  X,
  Edit3,
  Check,
  UserPlus,
  Plus
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

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authentication Observer
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

  // Profile Fetching Logic
  useEffect(() => {
    if (!user || !db) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
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
        console.error("Critical Profile Fetch Error:", e);
        setError("Permission denied or database error. Please check your Firestore Rules.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Data Subscription (Settings & Records)
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

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
    }, (err) => console.error("Snapshot error (settings):", err));

    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
    }, (err) => console.error("Snapshot error (sales):", err));

    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      }, (err) => console.error("Snapshot error (users):", err));
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Connecting to Pyramids Cloud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md text-center border border-red-100">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-800 mb-2">Access Error</h2>
          <p className="text-slate-500 mb-6 text-sm">{error}</p>
          <button onClick={handleLogout} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Try Signing Out</button>
        </div>
      </div>
    );
  }

  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {view === 'dashboard' && (
          userProfile?.role === 'admin' ? (
            <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} />
          ) : (
            <UserWelcome profile={userProfile} setView={setView} />
          )
        )}
        
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} />}
      </main>

      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- COMPONENTS ---

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
      console.error("Auth Action Error:", err);
      setError(err.message.includes('auth/user-not-found') ? "User not found." : err.message.replace('Firebase:', ''));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Pyramids Sales</h1>
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

function Onboarding({ user, setView, setUserProfile }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const profile = { username: name, role: 'user', createdAt: Date.now() };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
      setUserProfile(profile);
      setView('dashboard');
    } catch (e) {
      console.error("Profile Creation Failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-6 italic">Welcome! What's your name?</h2>
        <input 
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full border-2 border-slate-50 bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center outline-none focus:ring-2 focus:ring-emerald-500/20 text-xl"
        />
        <button 
          onClick={handleSave} disabled={loading || !name}
          className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}

// --- SHARED UI ---
function UserWelcome({ profile, setView }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
      <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner">
        <UserIcon className="text-emerald-600" size={48} />
      </div>
      <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tighter text-center">Hello, {profile.username}</h2>
      <p className="text-slate-400 text-lg mb-12 font-medium">Your session is active. How can we help you today?</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button onClick={() => setView('collection')} className="flex-1 bg-slate-900 text-white p-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
          <PlusCircle size={24} /> New Entry
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
    { id: 'targets', label: 'Monthly Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team Search', icon: Search, roles: ['admin'] },
    { id: 'admin', label: 'System Admin', icon: Settings, roles: ['admin'] },
  ];

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="bg-emerald-500 p-2 rounded-lg shadow-lg"><Store className="text-white" size={20} /></div>
        <h1 className="text-lg font-bold text-white uppercase tracking-wider">Pyramids</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map((link) => {
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
  const icons = [
    { id: 'dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', icon: Target, roles: ['admin'] },
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter">Analytics Console</h2><p className="text-slate-400 font-medium italic">Performance overview</p></div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 self-start">
          <Filter size={16} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700 text-sm">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="GA Achieved" value={stats.gaAch} target={stats.gaTarget} progress={stats.gaP} color="emerald" />
        <KPIBox title="OC Achieved" value={stats.ocAch} target={stats.ocTarget} progress={stats.ocP} color="blue" />
        <KPIBox title="Total Rate" value={`${((stats.gaP + stats.ocP) / 2).toFixed(1)}%`} progress={(stats.gaP + stats.ocP) / 2} color="purple" />
        <KPIBox title="Locations" value={shops.length} color="slate" />
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
        <h4 className="text-3xl font-black text-slate-900 leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</h4>
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

function SalesCollectionForm({ areaManagers, shops, user }) {
  const [formData, setFormData] = useState({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const availableShops = useMemo(() => formData.areaManager ? shops.filter(s => s.manager === formData.areaManager) : [], [formData.areaManager, shops]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { ...formData, gaAch: Number(formData.gaAch) || 0, ocAch: Number(formData.ocAch) || 0, timestamp: Date.now(), submittedBy: user.uid });
      setSuccess(true);
      setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-12 text-center italic">Sales Entry</h2>
      {success && <div className="bg-emerald-600 text-white p-6 rounded-[2rem] text-center font-black mb-8 shadow-2xl animate-bounce">Report Saved Successfully</div>}
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <select required className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
            <option value="">Manager</option>
            {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select required disabled={!formData.areaManager} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg disabled:opacity-30" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
            <option value="">Location</option>
            {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
          <input required type="number" placeholder="GA" className="w-full border-2 border-emerald-50 p-8 rounded-[2rem] font-black text-4xl text-emerald-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC" className="w-full border-2 border-blue-50 p-8 rounded-[2rem] font-black text-4xl text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-[0.98]">
          {submitting ? 'Submitting...' : 'Confirm'}
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

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter">{role === 'admin' ? 'Global Audit' : 'My Entries'}</h2></div>
        <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 text-sm">
          <Filter size={18} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700"><option value="All">Filter Manager</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
      </header>
      <div className="bg-white rounded-[2.5rem] border overflow-x-auto shadow-2xl">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-900 text-slate-400"><tr><th className="px-6 py-5">Time</th><th className="px-6 py-5">Location</th><th className="px-6 py-5">GA</th><th className="px-6 py-5">OC</th><th className="px-6 py-5">Notes</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map(r => (<tr key={r.id} className="hover:bg-slate-50 tabular-nums"><td className="px-6 py-4 text-xs font-black text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</td><td className="px-6 py-4 font-black">{r.shopName}</td><td className="px-6 py-4 text-emerald-600 font-black">+{r.gaAch}</td><td className="px-6 py-4 text-blue-600 font-black">+{r.ocAch}</td><td className="px-6 py-4 text-slate-400 italic text-xs">{r.note || '-'}</td></tr>))}</tbody>
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
  const [status, setStatus] = useState(null);

  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      const matchManager = filterManager === 'All' || s.manager === filterManager;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchManager && matchSearch;
    });
  }, [shops, filterManager, searchTerm]);

  const handleEdit = (shop) => {
    setEditingShop(shop.name);
    setEditForm({
      ga: targets[shop.name]?.ga || 0,
      oc: targets[shop.name]?.oc || 0
    });
  };

  const handleSaveManual = async (shopName) => {
    try {
      const newTargets = { 
        ...targets, 
        [shopName]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } 
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { 
        targets: newTargets,
        areaManagers,
        shops
      }, { merge: true });
      setEditingShop(null);
      setStatus("Target updated successfully!");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(r => r.split(','));
        const newTargets = { ...targets };
        
        rows.slice(1).forEach(row => {
          if (row.length >= 3) {
            const name = row[0].trim().replace(/"/g, '');
            const ga = parseFloat(row[1]) || 0;
            const oc = parseFloat(row[2]) || 0;
            if (shops.some(s => s.name === name)) {
              newTargets[name] = { ga, oc };
            }
          }
        });

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { 
          targets: newTargets,
          areaManagers,
          shops
        }, { merge: true });
        
        setStatus("Bulk update completed!");
        setTimeout(() => setStatus(null), 3000);
      } catch (err) {
        setStatus("Error processing CSV.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Target Control</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Adjust monthly goals and upload bulk data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm text-sm">
            <Filter size={16} className="text-slate-400" />
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700">
              <option value="All">All Managers</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="relative bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-emerald-700 transition-all cursor-pointer">
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload CSV Template" />
            <div className="flex items-center gap-2"><Upload size={18} /> Bulk CSV Upload</div>
          </div>
        </div>
      </header>

      {status && (
        <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 p-4 rounded-2xl font-black text-center animate-bounce">
          {status}
        </div>
      )}

      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input 
          type="text" 
          placeholder="Filter by shop name..." 
          className="w-full bg-white border border-slate-200 p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredShops.map(shop => (
          <div key={shop.name} className={`bg-white p-8 rounded-[2.5rem] border transition-all shadow-sm flex flex-col gap-6 ${editingShop === shop.name ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-100 hover:shadow-xl'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-black text-xl text-slate-800 leading-none mb-2">{shop.name}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MGR: {shop.manager}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => handleEdit(shop)}>
                <Edit3 size={18} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-50">
                <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">GA Target</p>
                {editingShop === shop.name ? (
                  <input 
                    type="number" 
                    className="w-full bg-transparent font-black text-2xl text-emerald-700 outline-none border-b-2 border-emerald-200"
                    value={editForm.ga}
                    onChange={e => setEditForm({...editForm, ga: e.target.value})}
                    autoFocus
                  />
                ) : (
                  <span className="text-2xl font-black text-emerald-700">{targets[shop.name]?.ga?.toLocaleString() || 0}</span>
                )}
              </div>
              <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-50">
                <p className="text-[9px] font-black text-blue-600 uppercase mb-2">OC Target</p>
                {editingShop === shop.name ? (
                  <input 
                    type="number" 
                    className="w-full bg-transparent font-black text-2xl text-blue-700 outline-none border-b-2 border-blue-200"
                    value={editForm.oc}
                    onChange={e => setEditForm({...editForm, oc: e.target.value})}
                  />
                ) : (
                  <span className="text-2xl font-black text-blue-700">{targets[shop.name]?.oc?.toLocaleString() || 0}</span>
                )}
              </div>
            </div>

            {editingShop === shop.name && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleSaveManual(shop.name)}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  <Check size={20} /> Save Changes
                </button>
                <button 
                  onClick={() => setEditingShop(null)}
                  className="bg-slate-100 text-slate-400 px-6 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
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

function UserSearch({ users, db, appId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user' });
  const [updating, setUpdating] = useState(false);

  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));

  const startEdit = (u) => {
    setEditingId(u.uid);
    setEditForm({ username: u.username || '', role: u.role || 'user' });
  };

  const handleUpdate = async (uid) => {
    setUpdating(true);
    try {
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
      await updateDoc(userDocRef, {
        username: editForm.username,
        role: editForm.role
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error updating user:", err);
    }
    setUpdating(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Team Directory</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manage signed-up staff roles and display names</p>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input 
          type="text" 
          placeholder="Search team members..." 
          className="w-full bg-white border border-slate-200 p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(u => (
          <div key={u.uid} className={`bg-white p-6 rounded-[2.5rem] border transition-all shadow-sm flex flex-col gap-4 ${editingId === u.uid ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                {u.username?.charAt(0)}
              </div>
              <div className="flex-1">
                {editingId === u.uid ? (
                  <input 
                    className="w-full border-b-2 border-emerald-500 font-black text-slate-800 outline-none text-lg"
                    value={editForm.username}
                    onChange={e => setEditForm({...editForm, username: e.target.value})}
                    autoFocus
                  />
                ) : (
                  <p className="font-black text-slate-800 text-lg">{u.username}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {u.role === 'admin' ? <ShieldCheck size={12} className="text-purple-500" /> : <UserIcon size={12} className="text-slate-400" />}
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'text-purple-600' : 'text-slate-400'}`}>
                    {u.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              {editingId === u.uid ? (
                <>
                  <select 
                    className="flex-1 bg-slate-50 border-none p-2 rounded-xl text-xs font-bold text-slate-600 outline-none"
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                  >
                    <option value="user">USER Role</option>
                    <option value="admin">ADMIN Role</option>
                  </select>
                  <button 
                    disabled={updating}
                    onClick={() => handleUpdate(u.uid)} 
                    className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    {updating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  </button>
                  <button 
                    onClick={() => setEditingId(null)} 
                    className="bg-slate-100 text-slate-400 p-2 rounded-xl hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => startEdit(u)} 
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-3 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                  <UserCog size={16} /> Manage User
                </button>
              )}
            </div>
            
            <div className="mt-2 text-[9px] text-slate-300 font-mono break-all text-center">
              ID: {u.uid}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, db, appId }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [editingManager, setEditingManager] = useState(null);
  const [editingShop, setEditingShop] = useState(null);
  const [editValue, setEditValue] = useState('');

  const updateConfig = async (m, s) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { 
        areaManagers: m || areaManagers, 
        shops: s || shops, 
        targets: targets 
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteManager = (name) => {
    const updatedM = areaManagers.filter(m => m !== name);
    // When deleting manager, we keep the shops but they will be unassigned in logic if needed, 
    // or we delete them. Let's filter shops too for a clean state.
    const updatedS = shops.filter(s => s.manager !== name);
    updateConfig(updatedM, updatedS);
  };

  const deleteShop = (name) => {
    const updatedS = shops.filter(s => s.name !== name);
    updateConfig(null, updatedS);
  };

  const startEditManager = (m) => {
    setEditingManager(m);
    setEditValue(m);
  };

  const saveEditManager = (oldName) => {
    const updatedM = areaManagers.map(m => m === oldName ? editValue : m);
    const updatedS = shops.map(s => s.manager === oldName ? { ...s, manager: editValue } : s);
    updateConfig(updatedM, updatedS);
    setEditingManager(null);
  };

  const startEditShop = (s) => {
    setEditingShop(s.name);
    setEditValue(s.name);
  };

  const saveEditShop = (oldName) => {
    const updatedS = shops.map(s => s.name === oldName ? { ...s, name: editValue } : s);
    // Update target key too
    const newTargets = { ...targets };
    if (newTargets[oldName]) {
      newTargets[editValue] = newTargets[oldName];
      delete newTargets[oldName];
    }
    // We update config with new shops and updated targets
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { 
      areaManagers, 
      shops: updatedS, 
      targets: newTargets 
    });
    setEditingShop(null);
  };

  const addShopToManager = (managerName) => {
    if (!newShop.trim()) return;
    const updatedS = [...shops, { name: newShop.trim(), manager: managerName }];
    updateConfig(null, updatedS);
    setNewShop('');
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Structure Admin</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manage managers and their assigned shop locations</p>
      </header>

      {/* Manager Creation */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
          <UserPlus size={24} />
        </div>
        <input 
          value={newManager} 
          onChange={e => setNewManager(e.target.value)}
          className="flex-1 bg-slate-50 border-none p-5 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500/20" 
          placeholder="Enter New Area Manager Name..." 
        />
        <button 
          onClick={() => { if(newManager.trim()) { updateConfig([...areaManagers, newManager.trim()], null); setNewManager(''); } }}
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition-all"
        >
          Add Manager
        </button>
      </div>

      {/* Detailed Manager/Shop List */}
      <div className="grid grid-cols-1 gap-8">
        {areaManagers.map(manager => (
          <div key={manager} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-xl"><UsersIcon size={20} /></div>
                {editingManager === manager ? (
                  <div className="flex items-center gap-2">
                    <input 
                      value={editValue} 
                      onChange={e => setEditValue(e.target.value)}
                      className="bg-white/10 border-b border-white outline-none font-black text-xl"
                    />
                    <button onClick={() => saveEditManager(manager)} className="text-emerald-400"><Check size={20} /></button>
                    <button onClick={() => setEditingManager(null)} className="text-red-400"><X size={20} /></button>
                  </div>
                ) : (
                  <h3 className="text-2xl font-black tracking-tight">{manager}</h3>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startEditManager(manager)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Edit3 size={18} /></button>
                <button onClick={() => deleteManager(manager)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned Shops</span>
                <div className="flex gap-2">
                   <input 
                    placeholder="New shop name..."
                    className="bg-slate-50 border-none p-2 rounded-xl text-xs font-bold outline-none"
                    value={editingShop === null ? newShop : ''}
                    onChange={e => setNewShop(e.target.value)}
                   />
                   <button 
                    onClick={() => addShopToManager(manager)}
                    className="bg-slate-900 text-white p-2 rounded-xl"
                   >
                    <Plus size={16} />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.filter(s => s.manager === manager).map(shop => (
                  <div key={shop.name} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group/item hover:border-indigo-200 transition-all">
                    {editingShop === shop.name ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          value={editValue} 
                          onChange={e => setEditValue(e.target.value)}
                          className="w-full bg-white border-b-2 border-indigo-500 font-bold outline-none"
                        />
                        <button onClick={() => saveEditManager(shop.name)} className="text-emerald-500"><Check size={16}/></button>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-700">{shop.name}</span>
                    )}
                    
                    <div className="flex items-center gap-2 opacity-0 group-item-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditShop(shop)} className="text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                      <button onClick={() => deleteShop(shop.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
