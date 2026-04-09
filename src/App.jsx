import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
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
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  signInWithCustomToken,
  signInAnonymously
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
  Activity,
  FileSpreadsheet,
  KeyRound,
  ArrowLeft,
  FileText,
  Clock,
  LayoutDashboard,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYb6zn5YulU9Ght-3T2vHFzdbOL94GYqs",
  authDomain: "pyramids-sales.firebaseapp.com",
  projectId: "pyramids-sales",
  storageBucket: "pyramids-sales.firebasestorage.app",
  messagingSenderId: "658795707959",
  appId: "1:658795707959:web:76e44a85011105fd2949b2",
  measurementId: "G-MMZ18E15FX"
};

const appId = 'pyramids-sales-v1';

// Firebase initialization logic
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Auth Listener
  useEffect(() => {
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

  // Profile Fetching
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
          if (data.role !== 'admin' && !data.assignedManager) {
            setView('waiting');
          } else {
            setView('dashboard');
          }
        } else {
          setView('onboarding');
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
        setError("Database access error.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Data Subscriptions
  useEffect(() => {
    if (!user || !userProfile) return;

    // Config Listener
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    }, (err) => console.error("Settings listener error:", err));

    // Sales Listener
    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (userProfile.role === 'admin') setSalesRecords(sorted);
      else setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
    }, (err) => console.error("Sales listener error:", err));

    // Users Listener (Admin only)
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

  if (loading) return <LoadingScreen />;
  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;
  if (view === 'waiting') return <WaitingRoom onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} db={db} appId={appId} userProfile={userProfile} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} db={db} appId={appId} userProfile={userProfile} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} managers={areaManagers} />}
      </main>
      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// UI Components
function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Processing Cloud Assets...</p>
      </div>
    </div>
  );
}

function LoginPortal() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try { 
      if (authMode === 'signup') await createUserWithEmailAndPassword(auth, email, password); 
      else if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password); 
      else { await sendPasswordResetEmail(auth, email); setMessage("Reset link sent to your email!"); } 
    } catch (err) { setError(err.message.replace('Firebase:', '')); } 
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl">
        <div className="text-center mb-10">
          <ShieldCheck className="text-red-600 mx-auto mb-6" size={60} />
          <h1 className="text-3xl font-black text-slate-800 italic tracking-tighter">Cash Shop Portal</h1>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">{authMode === 'forgot' ? 'Recovery Mode' : 'Secured Access'}</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 px-1">Email</label>
            <input required type="email" placeholder="email@company.com" className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {authMode !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-400 px-1">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none outline-none" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}
          {error && <div className="p-4 bg-red-50 text-red-500 rounded-xl text-xs font-black text-center">{error}</div>}
          {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black text-center">{message}</div>}
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : (authMode === 'forgot' ? 'Send Link' : authMode === 'signup' ? 'Create Account' : 'Login')}
          </button>
        </form>
        <div className="mt-8 text-center flex flex-col gap-2">
          <button onClick={() => setAuthMode(authMode === 'forgot' ? 'login' : 'forgot')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-600">
            {authMode === 'forgot' ? 'Back to Login' : 'Forgot Password?'}
          </button>
          <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-600">
            {authMode === 'login' ? 'Create Account' : 'Back to Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Onboarding({ user, setView, setUserProfile }) {
  const [name, setName] = useState(''); 
  const handleSave = async () => { 
    if (!name.trim()) return; 
    const profile = { username: name, role: 'user', assignedManager: '', createdAt: Date.now() }; 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile); 
    setUserProfile(profile); 
    setView('waiting'); 
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-8 italic">Profile Setup</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl outline-none" />
        <button onClick={handleSave} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg">Continue</button>
      </div>
    </div>
  );
}

function WaitingRoom({ onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-red-50 rounded-full">
            <ShieldCheck className="text-red-600" size={60} />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-800 italic tracking-tighter leading-tight">
            Welcome to the Cash Shops Sales System
          </h2>
          <p className="text-slate-500 font-bold leading-relaxed">
            Please Contact The System Admin <br/> 
            <span className="text-red-600 font-black text-lg">( Ahmed Sharaf )</span>
          </p>
        </div>
        <div className="pt-6 border-t border-slate-100">
          <p className="text-slate-400 font-black italic uppercase tracking-[0.2em] text-xs">
            ONE Team One Goal
          </p>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-all pt-4 border-none bg-transparent cursor-pointer"
        >
          <LogOut size={16} /> Logout and Check Later
        </button>
      </div>
    </div>
  );
}

function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [selectedManager, setSelectedManager] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('All');
  const [showClosedModal, setShowClosedModal] = useState(false);

  const isSingleManagerView = isAdmin && filterManager !== 'All';

  const filteredRecords = useMemo(() => {
    let data = [...records];
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    if (managerToFilter && managerToFilter !== 'All') {
      data = data.filter(r => r.areaManager === managerToFilter);
    }
    return data;
  }, [records, filterManager, isAdmin, assignedManager]);

  const managerSummary = useMemo(() => {
    const summary = {};
    const activeManagers = isAdmin
      ? (filterManager === 'All' ? managers : [filterManager])
      : managers.filter(m => m === assignedManager);

    activeManagers.forEach(m => {
      summary[m] = { name: m, totalGA: 0, totalOC: 0, entryCount: 0, totalHours: 0, targetGA: 0, targetOC: 0, lastActivity: null };
    });
    shops.forEach(s => {
      if (summary[s.manager]) {
        summary[s.manager].targetGA += (targets[s.name]?.ga || 0);
        summary[s.manager].targetOC += (targets[s.name]?.oc || 0);
      }
    });
    filteredRecords.forEach(r => {
      if (summary[r.areaManager]) {
        summary[r.areaManager].totalGA += (r.gaAch || 0);
        summary[r.areaManager].totalOC += (r.ocAch || 0);
        summary[r.areaManager].entryCount += 1;
        summary[r.areaManager].totalHours += parseFloat(r.workingHours || 0);
        if (!summary[r.areaManager].lastActivity || r.timestamp > summary[r.areaManager].lastActivity) {
          summary[r.areaManager].lastActivity = r.timestamp;
        }
      }
    });
    return Object.values(summary).map(m => ({
      ...m,
      avgHours: m.entryCount > 0 ? (m.totalHours / m.entryCount).toFixed(1) : 0,
      completionGA: m.targetGA > 0 ? ((m.totalGA / m.targetGA) * 100).toFixed(1) : 0,
      remainingGA: Math.max(0, m.targetGA - m.totalGA),
      completionOC: m.targetOC > 0 ? ((m.totalOC / m.targetOC) * 100).toFixed(1) : 0
    }));
  }, [filteredRecords, managers, shops, targets, isAdmin, assignedManager, filterManager]);

  const filteredManagerSummary = useMemo(() => {
    if (isSingleManagerView) return managerSummary;
    return managerSummary.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(tableSearch.toLowerCase());
      const numCompletion = parseFloat(m.completionGA);
      if (performanceFilter === 'Under') return matchesSearch && numCompletion < 50;
      if (performanceFilter === 'Good') return matchesSearch && numCompletion >= 50 && numCompletion < 100;
      if (performanceFilter === 'Full') return matchesSearch && numCompletion >= 100;
      return matchesSearch;
    });
  }, [managerSummary, tableSearch, performanceFilter, isSingleManagerView]);

  const operationalStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const relevantShops = isSingleManagerView
      ? shops.filter(s => s.manager === filterManager)
      : (isAdmin ? shops : shops.filter(s => s.manager === assignedManager));
    const activeShopNamesSet = new Set(records.filter(r => r.date === today).map(r => r.shopName));
    const totalGA = filteredRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
    const closedShopsList = relevantShops.filter(s => !activeShopNamesSet.has(s.name));
    const totalTargetGA = relevantShops.reduce((acc, s) => acc + (targets[s.name]?.ga || 0), 0);
    const totalTargetOC = relevantShops.reduce((acc, s) => acc + (targets[s.name]?.oc || 0), 0);
    return { totalGA, totalOC, totalTargetGA, totalTargetOC, closedShopsToday: closedShopsList.length, closedShopsList };
  }, [records, shops, targets, filteredRecords, isAdmin, assignedManager, filterManager, isSingleManagerView]);

  const getShopDetails = (managerName) => {
    return shops.filter(s => s.manager === managerName).map(s => {
      const shopRecords = filteredRecords.filter(r => r.shopName === s.name);
      const totalGA = shopRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
      const totalOC = shopRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
      const totalHours = shopRecords.reduce((acc, r) => acc + parseFloat(r.workingHours || 0), 0);
      const target = targets[s.name] || { ga: 0, oc: 0 };
      return {
        name: s.name, targetGA: target.ga, totalGA,
        completionGA: target.ga > 0 ? ((totalGA / target.ga) * 100).toFixed(1) : 0,
        remainingGA: Math.max(0, target.ga - totalGA), targetOC: target.oc, totalOC,
        completionOC: target.oc > 0 ? ((totalOC / target.oc) * 100).toFixed(1) : 0,
        avgHours: shopRecords.length > 0 ? (totalHours / shopRecords.length).toFixed(1) : 0
      };
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200"><LayoutDashboard className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">{isAdmin ? "Performance Hub" : "Your Performance"}</h2>
            {isSingleManagerView && <p className="text-xs font-black uppercase text-red-500 tracking-widest mt-0.5">{filterManager}</p>}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400">View Region:</span>
            <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setSelectedManager(null); }} className="text-xs font-black uppercase tracking-widest p-3 bg-white border border-slate-100 rounded-xl shadow-sm outline-none cursor-pointer">
              <option value="All">All Regions</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-red-500" /> Latest Activity</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
              <tr><th className="px-6 py-4">Area Manager</th><th className="px-6 py-4">Last Entry</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {managerSummary.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-700">{m.name}</td>
                  <td className="px-6 py-4 font-bold text-slate-400">
                    {m.lastActivity ? `${new Date(m.lastActivity).toLocaleDateString()} ${new Date(m.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="bg-red-600 p-6 rounded-3xl text-white shadow-xl shadow-red-100">
            <p className="text-xs font-black uppercase text-red-100 mb-1">GA Achievement</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalGA.toLocaleString()}</h4>
            <div className="mt-2 h-1.5 bg-red-500 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all" style={{ width: operationalStats.totalTargetGA > 0 ? Math.min(100, (operationalStats.totalGA / operationalStats.totalTargetGA * 100)) + '%' : '0%' }} />
            </div>
            <p className="text-[10px] font-black uppercase text-red-200 mt-2">Target: {operationalStats.totalTargetGA.toLocaleString()}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
            <p className="text-xs font-black uppercase text-blue-100 mb-1">OC Achievement</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalOC.toLocaleString()}</h4>
            <div className="mt-2 h-1.5 bg-blue-500 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all" style={{ width: operationalStats.totalTargetOC > 0 ? Math.min(100, (operationalStats.totalOC / operationalStats.totalTargetOC * 100)) + '%' : '0%' }} />
            </div>
            <p className="text-[10px] font-black uppercase text-blue-200 mt-2">Target: {operationalStats.totalTargetOC.toLocaleString()}</p>
          </div>
          <button onClick={() => setShowClosedModal(true)} className="w-full bg-slate-900 p-6 rounded-3xl text-white hover:bg-slate-800 transition-all text-left">
            <p className="text-xs font-black uppercase text-slate-400 mb-1">Closed Today</p>
            <h4 className="text-3xl font-black italic">{operationalStats.closedShopsToday}</h4>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-2">View List →</p>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
           <h3 className="font-black text-slate-800 text-lg tracking-tight">Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
              <tr>
                <th className="px-8 py-5">Unit</th>
                <th className="px-4 py-5 text-center">GA Ach.</th>
                <th className="px-4 py-5 text-center">OC Ach.</th>
                <th className="px-4 py-5 text-center">GA %</th>
                <th className="px-8 py-5 text-center">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredManagerSummary.map((m, idx) => (
                <React.Fragment key={idx}>
                  <tr 
                    onClick={() => setSelectedManager(selectedManager === m.name ? null : m.name)}
                    className={`cursor-pointer transition-colors ${selectedManager === m.name ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-8 py-5 font-black text-slate-800 flex items-center gap-2">
                       {selectedManager === m.name ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {m.name}
                    </td>
                    <td className="px-4 py-5 text-center font-bold text-red-600">{m.totalGA}</td>
                    <td className="px-4 py-5 text-center font-bold text-blue-600">{m.totalOC}</td>
                    <td className="px-4 py-5 text-center font-bold">{m.completionGA}%</td>
                    <td className="px-8 py-5 text-center font-bold text-slate-400">{m.avgHours}h</td>
                  </tr>
                  {selectedManager === m.name && getShopDetails(m.name).map((s, si) => (
                    <tr key={`shop-${si}`} className="bg-slate-50/50 text-xs italic">
                      <td className="px-12 py-3 border-l-4 border-red-500 text-slate-500">{s.name}</td>
                      <td className="px-4 py-3 text-center text-red-400">{s.totalGA}</td>
                      <td className="px-4 py-3 text-center text-blue-400">{s.totalOC}</td>
                      <td className="px-4 py-3 text-center">{s.completionGA}%</td>
                      <td className="px-8 py-3 text-center">{s.avgHours}h</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showClosedModal && (
        <ClosedShopsModal shops={operationalStats.closedShopsList} onClose={() => setShowClosedModal(false)} />
      )}
    </div>
  );
}

function ClosedShopsModal({ shops, onClose }) {
  const [exporting, setExporting] = useState(false);
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const exportAsPng = () => {
    setExporting(true);
    try {
      const scale = 2;
      const W = 480;
      const rowH = 52;
      const headerH = 90;
      const titleBarH = 56;
      const footerH = 44;
      const paddingX = 24;
      const listPaddingY = 16;
      const emptyH = 120;
      const bodyH = shops.length === 0 ? emptyH : (shops.length * rowH + (shops.length - 1) * 8 + listPaddingY * 2);
      const totalH = titleBarH + headerH + bodyH + footerH;

      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = totalH * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, W, totalH);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, titleBarH);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(paddingX + 6, titleBarH / 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillText('Cash Shop', paddingX + 20, titleBarH / 2 + 5);
      
      let y = titleBarH;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, W, headerH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'italic 900 20px system-ui, sans-serif';
      ctx.fillText('The Closed CashShops', paddingX, y + 32);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText('FOR ' + dateStr.toUpperCase(), paddingX, y + 52);

      y = titleBarH + headerH;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, y, W, bodyH);

      if (shops.length === 0) {
        ctx.fillStyle = '#1E293B';
        ctx.font = '900 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('All Shops Active!', W / 2, y + emptyH / 2);
        ctx.textAlign = 'left';
      } else {
        let ry = y + listPaddingY;
        shops.forEach((shop, i) => {
          ctx.fillStyle = '#F8FAFC';
          roundRect(paddingX, ry, W - paddingX * 2, rowH - 4, 10);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(paddingX, ry, 3, rowH - 4);
          ctx.fillStyle = '#1E293B';
          ctx.font = '900 13px system-ui, sans-serif';
          ctx.fillText(shop.name, paddingX + 52, ry + 22);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.fillText(shop.manager.toUpperCase(), paddingX + 52, ry + 36);
          ry += rowH + 8;
        });
      }

      const link = document.createElement('a');
      link.download = `Closed_Shops_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { console.error('PNG export failed:', err); }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0F172A] p-6 flex justify-between items-center text-white">
          <div>
            <h4 className="font-black italic text-lg leading-none">Closed Shops</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{dateStr}</p>
          </div>
          <div className="bg-red-600 px-3 py-1 rounded-lg font-black">{shops.length}</div>
        </div>
        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
          {shops.length === 0 ? (
            <p className="text-center py-10 font-bold text-slate-400 italic">No closed shops today.</p>
          ) : (
            shops.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border-l-4 border-red-500">
                <div>
                  <p className="font-black text-slate-800 text-sm">{s.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{s.manager}</p>
                </div>
                <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded">No Data</span>
              </div>
            ))
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t flex gap-2">
          <button onClick={exportAsPng} disabled={exporting} className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-black text-xs uppercase shadow-sm flex items-center justify-center gap-2 hover:bg-slate-100">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
          <button onClick={onClose} className="p-3 bg-slate-800 text-white rounded-xl"><X size={16}/></button>
        </div>
      </div>
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, user, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [formData, setFormData] = useState({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableShops = useMemo(() => { 
    const mgr = isAdmin ? formData.areaManager : assigned; 
    return mgr ? shops.filter(s => s.manager === mgr) : []; 
  }, [formData.areaManager, shops, isAdmin, assigned]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        workingHours: Number(formData.workingHours), 
        timestamp: Date.now(), 
        submittedBy: user.uid 
      }); 
      setSuccess(true); 
      setFormData(prev => ({ ...prev, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' })); 
      setTimeout(() => setSuccess(false), 3000); 
    } catch (err) { console.error("Submit error:", err); } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto py-6">
      <h2 className="text-2xl font-black text-slate-800 mb-6 italic uppercase text-center">Sales Entry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl space-y-6 border border-slate-100">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block px-1">Date</label>
              <input required type="date" className="w-full bg-slate-50 p-3 rounded-xl font-bold border-none outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block px-1">Manager</label>
              <select required disabled={!isAdmin} className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={isAdmin ? formData.areaManager : assigned} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
                <option value="">Select Manager</option>
                {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block px-1">Shop</label>
            <select required className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Select Shop</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required type="number" placeholder="GA Ach" className="w-full bg-red-50 p-4 rounded-xl text-xl font-black text-red-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
            <input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-4 rounded-xl text-xl font-black text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
          <input required type="number" step="0.1" placeholder="Working Hours" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          <textarea placeholder="Notes (Optional)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none min-h-[80px]" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        </div>
        {success && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-center text-[10px] font-black uppercase">Saved successfully</div>}
        <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-black transition-all">
          {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Submit Entry'}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, role, db, appId }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black italic uppercase">Sales History</h2>
      </div>
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Shop</th>
              <th className="px-6 py-4 text-center">GA</th>
              <th className="px-6 py-4 text-center">OC</th>
              <th className="px-6 py-4 text-center">Hours</th>
              {role === 'admin' && <th className="px-6 py-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-500 text-xs">{r.date}</td>
                <td className="px-6 py-4 font-black text-slate-800">{r.shopName}</td>
                <td className="px-6 py-4 text-center font-bold text-red-600">+{r.gaAch}</td>
                <td className="px-6 py-4 text-center font-bold text-blue-600">+{r.ocAch}</td>
                <td className="px-6 py-4 text-center font-bold text-slate-400">{r.workingHours}h</td>
                {role === 'admin' && (
                  <td className="px-6 py-4 text-right">
                    <button onClick={async () => { if(confirm("Delete?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets, db, appId }) {
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({ ga: 0, oc: 0 });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase italic">Monthly Targets</h2>
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr><th className="px-8 py-4">Shop</th><th className="px-4 py-4 text-center">GA Target</th><th className="px-4 py-4 text-center">OC Target</th><th className="px-8 py-4 text-right">Edit</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shops.map(shop => (
              <tr key={shop.name} className="hover:bg-slate-50">
                <td className="px-8 py-4 font-black text-slate-800">{shop.name}</td>
                <td className="px-4 py-4 text-center font-black text-red-600">
                  {editingShop === shop.name ? <input type="number" className="w-16 bg-slate-50 p-1 text-center" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : (targets[shop.name]?.ga || 0)}
                </td>
                <td className="px-4 py-4 text-center font-black text-blue-600">
                  {editingShop === shop.name ? <input type="number" className="w-16 bg-slate-50 p-1 text-center" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : (targets[shop.name]?.oc || 0)}
                </td>
                <td className="px-8 py-4 text-right">
                  {editingShop === shop.name ? 
                    <button onClick={async () => { const newT = { ...targets, [shop.name]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } }; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newT, areaManagers, shops }, { merge: true }); setEditingShop(null); }} className="text-emerald-500"><Check size={18}/></button> : 
                    <button onClick={() => { setEditingShop(shop.name); setEditForm({ ga: targets[shop.name]?.ga || 0, oc: targets[shop.name]?.oc || 0 }); }} className="text-slate-300 hover:text-red-500"><Edit3 size={16}/></button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserSearch({ users, db, appId, managers }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user', assignedManager: '' });
  const handleUpdate = async (uid) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), editForm); setEditingId(null); };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase italic">Team Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">{u.username?.charAt(0)}</div>
              <div>
                <p className="font-black text-slate-800 text-sm">{u.username}</p>
                <p className="text-[10px] font-bold text-red-500 uppercase">{u.assignedManager || 'Pending Assignment'}</p>
              </div>
            </div>
            {editingId === u.uid ? (
              <div className="space-y-2">
                <select className="w-full bg-slate-50 p-2 rounded-lg text-[10px] font-bold outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="user">USER</option><option value="admin">ADMIN</option>
                </select>
                <select className="w-full bg-slate-50 p-2 rounded-lg text-[10px] font-bold outline-none" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                  <option value="">Select Manager</option>
                  {managers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-slate-900 text-white p-2 rounded-lg text-[10px] font-bold">Save</button>
                  <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 rounded-lg"><X size={14}/></button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setEditingId(u.uid); setEditForm({ username: u.username, role: u.role, assignedManager: u.assignedManager || '' }); }} className="w-full bg-slate-50 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100">Modify Access</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, db, appId }) {
  const [newM, setNewM] = useState(''); const [newS, setNewS] = useState(''); const [assignedM, setAssignedM] = useState('');
  const update = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets }); };
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black italic uppercase">System Config</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-black text-xs uppercase mb-4 text-red-600">Add Manager</h3>
          <div className="flex gap-2">
            <input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-3 rounded-xl font-bold text-sm" placeholder="Name" />
            <button onClick={() => { if(newM) update([...areaManagers, newM], null); setNewM(''); }} className="bg-red-600 text-white px-4 rounded-xl font-black">Add</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-black text-xs uppercase mb-4 text-red-600">Link Shop</h3>
          <div className="space-y-2">
            <input value={newS} onChange={e => setNewS(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" placeholder="Shop Name" />
            <select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm">
              <option value="">Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => { if(newS && assignedM) update(null, [...shops, {name: newS, manager: assignedM}]); setNewS(''); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black">Add Link</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
         <table className="w-full text-left text-sm">
           <thead className="bg-[#0F172A] text-slate-400 text-[10px] uppercase font-black">
             <tr><th className="px-6 py-4">Manager</th><th className="px-6 py-4">Shop</th><th className="px-6 py-4 text-right">Delete</th></tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
             {shops.map((s, idx) => (
               <tr key={idx}>
                 <td className="px-6 py-4 font-black">{s.manager}</td>
                 <td className="px-6 py-4 font-bold text-slate-400">{s.name}</td>
                 <td className="px-6 py-4 text-right"><button onClick={() => update(null, shops.filter(x => x.name !== s.name))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button></td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Home', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Daily Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'History', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'Setup', icon: Settings, roles: ['admin'] }
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 px-2 flex items-center gap-3">
        <Store className="text-red-600" size={24} />
        <h1 className="text-xl font-black text-white italic tracking-tighter">Cash Shop</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            <link.icon size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-4 text-red-400 font-black text-xs uppercase hover:text-red-300">
        <LogOut size={18} /> Logout
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
  if (!role) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden z-50 rounded-t-2xl shadow-2xl">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-xl ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}>
          <item.icon size={20} />
        </button>
      ))}
    </div>
  );
}
