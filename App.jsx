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
const firebaseConfig = {
  apiKey: "AIzaSyAYb6zn5YulU9Ght-3T2vHFzdbOL94GYqs",
  authDomain: "pyramids-sales.firebaseapp.com",
  projectId: "pyramids-sales",
  storageBucket: "pyramids-sales.firebasestorage.app",
  messagingSenderId: "658795707959",
  appId: "1:658795707959:web:76e44a85011105fd2949b2",
  measurementId: "G-MMZ18E15FX"
};

// Safe initialization
let app, auth, db, analytics;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// Safer environment variable access to prevent build errors
const getAppId = () => {
  try {
    const envId = (typeof process !== 'undefined' && process.env?.VITE_APP_ID) || 'pyramids-sales-v1';
    return envId;
  } catch (e) {
    return 'pyramids-sales-v1';
  }
};

const appId = getAppId();

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Auth Observer - Purely handles the Auth State
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setUserProfile(null);
        setView('login');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Profile Fetcher - Separate effect to handle Firestore queries after Auth is established
  useEffect(() => {
    if (!authReady || !user || !db) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        // Guarded Firestore operation to prevent permission errors during transition
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setView('dashboard');
        } else {
          console.log("No profile found for user:", user.uid);
          setView('onboarding');
        }
      } catch (e) {
        // Detailed logging for debugging permission issues
        console.error("Error fetching user profile:", e);
        // If it's a permission error, we might still be in a state transition
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authReady]);

  // Real-time Data Sync
  useEffect(() => {
    // Only subscribe to data if user is authenticated and has a profile (to check roles)
    if (!user || !userProfile || !db) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    }, (err) => console.error("Settings sync error:", err));

    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
    }, (err) => console.error("Sales sync error:", err));

    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      }, (err) => console.error("User list sync error:", err));
    }

    return () => {
      unsubSettings();
      unsubSales();
      unsubUsers();
    };
  }, [user, userProfile]);

  const handleLogout = () => {
    setLoading(true);
    signOut(auth).catch(err => console.error("Logout error:", err));
  };

  if (loading || !authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-bold tracking-tight">Accessing Secure Portal...</p>
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
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} user={user} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} />}
      </main>

      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- AUTH COMPONENTS ---
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
      setError(err.message.replace('Firebase:', ''));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Pyramids Sales</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enterprise Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input required type="email" placeholder="Email Address" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input required type="password" placeholder="Password" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center border border-red-100">{error}</div>}
          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl">
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-emerald-600 transition-colors">
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
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center italic">Personalize Your Profile</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your display name" className="w-full border-2 border-slate-50 bg-slate-50 p-5 rounded-2xl font-bold mb-6 outline-none focus:ring-2 focus:ring-emerald-500/20 text-center text-xl" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg">
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}

// --- SHARED UI ---
function UserWelcome({ profile, setView }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mb-8">
        <UserIcon className="text-emerald-600" size={48} />
      </div>
      <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tighter">Welcome, {profile.username}</h2>
      <p className="text-slate-400 text-lg mb-12 font-medium text-center">Your account is ready. What would you like to do first?</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button onClick={() => setView('collection')} className="flex-1 bg-slate-900 text-white p-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black shadow-xl">
          <PlusCircle size={24} /> Log Sales
        </button>
        <button onClick={() => setView('reports')} className="flex-1 bg-white border border-slate-200 text-slate-600 p-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-50">
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
        <div className="bg-emerald-500 p-2 rounded-lg shadow-lg"><Store className="text-white" size={18} /></div>
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
          <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl ${view === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
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
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter">Analytics Console</h2><p className="text-slate-400 font-medium">Real-time performance</p></div>
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
        <KPIBox title="Achievement Rate" value={`${((stats.gaP + stats.ocP) / 2).toFixed(1)}%`} progress={(stats.gaP + stats.ocP) / 2} color="purple" />
        <KPIBox title="Active Stores" value={shops.length} color="slate" />
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color }) {
  const bars = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500', slate: 'bg-slate-500' };
  return (
    <div className="p-7 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <div className="flex items-baseline gap-2 mb-5">
        <h4 className="text-3xl font-black text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</h4>
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
      <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-12 text-center">Sales Entry</h2>
      {success && <div className="bg-emerald-600 text-white p-6 rounded-[2rem] text-center font-black mb-8 shadow-2xl">Report Saved Successfully</div>}
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
          <input required type="number" placeholder="GA Ach" className="w-full border-2 border-emerald-50 p-8 rounded-[2rem] font-black text-4xl text-emerald-600" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC Ach" className="w-full border-2 border-blue-50 p-8 rounded-[2rem] font-black text-4xl text-blue-600" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-[0.98]">
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

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter">{role === 'admin' ? 'Operational Audit' : 'My Submission Log'}</h2></div>
        <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200">
          <Filter size={18} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700"><option value="All">Filter Manager</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
      </header>
      <div className="bg-white rounded-[2.5rem] border overflow-x-auto shadow-2xl"><table className="w-full text-left min-w-[1000px]"><thead className="bg-slate-900 text-slate-400"><tr><th className="px-6 py-5">Time</th><th className="px-6 py-5">Location</th><th className="px-6 py-5">GA Ach</th><th className="px-6 py-5">OC Ach</th><th className="px-6 py-5">Notes</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(r => (<tr key={r.id} className="hover:bg-slate-50"><td className="px-6 py-4 text-xs font-black">{new Date(r.timestamp).toLocaleTimeString()}</td><td className="px-6 py-4 font-black">{r.shopName}</td><td className="px-6 py-4 text-emerald-600 font-black">+{r.gaAch}</td><td className="px-6 py-4 text-blue-600 font-black">+{r.ocAch}</td><td className="px-6 py-4 text-slate-400 italic text-xs truncate max-w-[200px]">{r.note || '-'}</td></tr>))}</tbody></table></div>
    </div>
  );
}

function UserSearch({ users }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Personnel Directory</h2>
      <div className="relative max-w-xl"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Lookup by username..." className="w-full bg-white border p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filtered.map(u => (<div key={u.uid} className="bg-white p-6 rounded-[2rem] border flex items-center gap-4 hover:shadow-xl transition-all"><div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl uppercase">{u.username?.charAt(0)}</div><div><p className="font-black text-slate-800">{u.username}</p><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>{u.role}</span></div></div>))}</div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, user }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const [seeding, setSeeding] = useState(false);
  const updateConfig = async (m, s, t) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets: t || targets }); };
  const seedTestData = async () => { setSeeding(true); const testManagers = ["Sarah Thompson", "David Miller"]; const testShops = [{ name: "Pyramid View", manager: "Sarah Thompson" }]; const testTargets = { "Pyramid View": { ga: 25000, oc: 15000 } }; await updateConfig(testManagers, testShops, testTargets); setSeeding(false); };
  const handleCSV = (e) => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (evt) => { const rows = evt.target.result.split('\n').map(r => r.split(',')); const newT = { ...targets }; rows.slice(1).forEach(row => { if (row.length >= 3) { const name = row[0].trim().replace(/"/g, ''); if (shops.some(s => s.name === name)) newT[name] = { ga: parseFloat(row[1]) || 0, oc: parseFloat(row[2]) || 0 }; } }); updateConfig(null, null, newT); }; reader.readAsText(file); };
  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4"><div><h2 className="text-3xl font-black text-slate-800 tracking-tight">System Controls</h2></div><button onClick={seedTestData} disabled={seeding} className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center gap-3 shadow-2xl active:scale-95 transition-all">{seeding ? <Loader2 className="animate-spin" /> : <Database />} Generate Sandbox Data</button></header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm"><h3 className="font-black mb-6 flex items-center gap-3 text-slate-700"><UsersIcon size={20}/> Territory Managers</h3><div className="flex gap-2 mb-6"><input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Manager Name" /><button onClick={() => {if(newManager) updateConfig([...areaManagers, newManager], null, null); setNewManager('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black">Add</button></div><div className="space-y-2">{areaManagers.map((m, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 text-sm">{m}</div>)}</div></section>
        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm"><h3 className="font-black mb-6 flex items-center gap-3 text-slate-700"><Store size={20}/> Location Mapping</h3><div className="space-y-3"><select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-slate-50 outline-none text-sm"><option value="">Select Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select><div className="flex gap-2"><input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Shop Name" /><button onClick={() => {if(newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}], null); setNewShop('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black">Add</button></div></div></section>
        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col"><h3 className="font-black mb-6 flex items-center gap-3 text-slate-700"><FileSpreadsheet size={20}/> Bulk Targets</h3><div className="flex-1 border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 text-center flex flex-col items-center justify-center relative hover:bg-slate-50 cursor-pointer group"><input type="file" accept=".csv" onChange={handleCSV} className="absolute inset-0 opacity-0 cursor-pointer" /><Upload size={48} className="text-slate-200 mb-4 group-hover:text-emerald-500 transition-colors" /><p className="font-black text-slate-400 uppercase text-xs">Drop CSV Here</p></div></section>
      </div>
    </div>
  );
}
