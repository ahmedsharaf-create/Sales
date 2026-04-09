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
  ChevronDown, 
  Archive,
  History
} from 'lucide-react';

// --- Firebase Configuration (Using environment variables to fix API Key error) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "", // Key provided at runtime
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    };

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'pyramids-sales-v1';
const appId = rawAppId.replace(/\//g, '_');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper: Get current month in YYYY-MM format
const getCurrentMonth = () => new Date().toISOString().substring(0, 7);

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

  // (1) Mandatory Auth Pattern: Initial connection to Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // If no custom token, we sign in anonymously first to satisfy Firestore rules
          // while waiting for the user to log in via the LoginPortal
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Firebase Auth Init Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // We only consider it "logged out" if the user was anonymous and we want them to login,
      // or if they explicitly signed out.
      if (!u) {
        setUserProfile(null);
        setView('login');
        setLoading(false);
      } else if (u.isAnonymous && view === 'login') {
        // Stay on login if anonymous but haven't fetched profile
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // (2) Fetch User Profile
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    
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

  // (3) Real-time Data Listeners with error handling
  useEffect(() => {
    if (!user || !userProfile) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAreaManagers(data.areaManagers || []);
          setShops(data.shops || []);
          setTargets(data.targets || {});
        }
      },
      (err) => console.error("Settings listener error:", err)
    );

    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, 
      (snapshot) => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        if (userProfile.role === 'admin') {
          setSalesRecords(sorted);
        } else {
          setSalesRecords(sorted.filter(r => 
            r.areaManager === userProfile.assignedManager || r.submittedBy === user.uid
          ));
        }
      },
      (err) => console.error("Sales listener error:", err)
    );

    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      unsubUsers = onSnapshot(usersRef, 
        (snapshot) => {
          setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
        },
        (err) => console.error("Users listener error:", err)
      );
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
    // After sign out, system instruction says we should ideally sign in anonymously again 
    // to maintain a session for Firestore rules if needed, but onAuthStateChanged handles UI.
    setLoading(false);
  };

  if (loading) return <LoadingScreen />;
  if (view === 'login') return <LoginPortal onSignIn={() => setView('dashboard')} />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;
  if (view === 'waiting') return <WaitingRoom onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {view === 'dashboard' && <Dashboard setView={setView} records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'archive' && <SalesArchive records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
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

// --- Dashboard Component (Current Month Performance) ---
function Dashboard({ setView, records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';
  const currentMonth = getCurrentMonth();

  const currentMonthRecords = useMemo(() => {
    return records.filter(r => r.date && r.date.startsWith(currentMonth));
  }, [records, currentMonth]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const relevantShops = isAdmin ? shops : shops.filter(s => s.manager === assignedManager);
    
    const totalGA = currentMonthRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
    const totalOC = currentMonthRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
    
    const activeTodayNames = new Set(records.filter(r => r.date === today).map(r => r.shopName));
    const closedShopsToday = relevantShops.filter(s => !activeTodayNames.has(s.name)).length;
    const totalTargetGA = relevantShops.reduce((acc, s) => acc + (targets[s.name]?.ga || 0), 0);
    
    return { totalGA, totalOC, closedShopsToday, totalTargetGA };
  }, [currentMonthRecords, records, shops, targets, isAdmin, assignedManager]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">Performance Dashboard</h2>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} Status</p>
          </div>
        </div>
        <button 
          onClick={() => setView('archive')}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
        >
          <Archive size={16} /> Open Sales Archive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-red-100">
          <p className="text-xs font-black uppercase text-red-100 mb-1">GA Achieved (This Month)</p>
          <h4 className="text-4xl font-black italic">{stats.totalGA.toLocaleString()}</h4>
          <div className="mt-4 pt-4 border-t border-red-500">
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
              <span>Goal Progress</span>
              <span>{stats.totalTargetGA > 0 ? ((stats.totalGA / stats.totalTargetGA) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="h-1.5 bg-red-700 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-700" style={{ width: `${Math.min(100, (stats.totalGA / (stats.totalTargetGA || 1)) * 100)}%` }}></div>
            </div>
          </div>
        </div>
        <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
          <p className="text-xs font-black uppercase text-blue-100 mb-1">OC Achieved (This Month)</p>
          <h4 className="text-4xl font-black italic">{stats.totalOC.toLocaleString()}</h4>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <p className="text-xs font-black uppercase text-slate-400 mb-1">Shops Pending Today</p>
          <h4 className="text-4xl font-black italic">{stats.closedShopsToday}</h4>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-6">Recent Sales Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-black uppercase text-slate-400 border-b border-slate-50">
              <tr>
                <th className="pb-4 px-2">Date</th>
                <th className="pb-4 px-2">Shop</th>
                <th className="pb-4 px-2 text-center">GA</th>
                <th className="pb-4 px-2 text-center">OC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentMonthRecords.slice(0, 8).map(r => (
                <tr key={r.id} className="text-sm font-bold">
                  <td className="py-4 px-2 text-slate-400">{r.date}</td>
                  <td className="py-4 px-2 text-slate-700 font-black">{r.shopName}</td>
                  <td className="py-4 px-2 text-center text-red-600">{r.gaAch}</td>
                  <td className="py-4 px-2 text-center text-blue-600">{r.ocAch}</td>
                </tr>
              ))}
              {currentMonthRecords.length === 0 && (
                <tr><td colSpan="4" className="py-12 text-center text-slate-300 italic">No sales activity reported yet for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Sales Archive Component ---
function SalesArchive({ records, targets, shops, managers, userProfile }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const currentMonth = getCurrentMonth();

  const months = useMemo(() => {
    const uniqueMonths = [...new Set(records.map(r => r.date?.substring(0, 7)))];
    return uniqueMonths.filter(m => m !== currentMonth).sort().reverse();
  }, [records, currentMonth]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return [];
    return records.filter(r => r.date?.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  const stats = useMemo(() => {
    const totalGA = filteredRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
    return { totalGA, totalOC };
  }, [filteredRecords]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
            <Archive className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Sales Archive</h2>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Historical Performance Access</p>
          </div>
        </div>
        <select 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)}
          className="p-4 bg-white border border-slate-100 rounded-2xl font-black text-xs uppercase outline-none shadow-sm cursor-pointer min-w-[220px]"
        >
          <option value="">Select Month</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {!selectedMonth ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-4 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
          <History size={48} className="opacity-20" />
          <p className="font-black text-xs uppercase tracking-widest">Select a period to view archives</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400 mb-1">Archived GA Total</p>
              <h4 className="text-3xl font-black text-red-600 italic">{stats.totalGA.toLocaleString()}</h4>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400 mb-1">Archived OC Total</p>
              <h4 className="text-3xl font-black text-blue-600 italic">{stats.totalOC.toLocaleString()}</h4>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                Records for {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <span className="bg-slate-100 text-slate-500 px-4 py-1 rounded-full text-[10px] font-black">{filteredRecords.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs font-black uppercase text-slate-400 bg-slate-50">
                  <tr>
                    <th className="py-5 px-8">Date</th>
                    <th className="py-5 px-4">Manager</th>
                    <th className="py-5 px-4">Branch</th>
                    <th className="py-5 px-4 text-center">GA</th>
                    <th className="py-5 px-4 text-center">OC</th>
                    <th className="py-5 px-8 text-center">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8 text-slate-400 text-xs">{r.date}</td>
                      <td className="py-4 px-4 text-slate-800 text-sm">{r.areaManager}</td>
                      <td className="py-4 px-4 text-slate-600 italic text-sm">{r.shopName}</td>
                      <td className="py-4 px-4 text-center text-red-600 font-black">+{r.gaAch}</td>
                      <td className="py-4 px-4 text-center text-blue-600 font-black">+{r.ocAch}</td>
                      <td className="py-4 px-8 text-center text-slate-300 text-xs">{r.workingHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Login Portal ---
function LoginPortal({ onSignIn }) {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault(); 
    setError(''); 
    setMessage(''); 
    setLoading(true);
    try { 
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset instructions sent!");
      } 
      onSignIn();
    } catch (err) { 
      setError(err.message.replace('Firebase:', '').replace('Error (auth/', '').replace(').', '')); 
    } 
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 text-center">
      <div className="w-full max-w-sm bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-500">
        <div className="space-y-2">
          <ShieldCheck className="text-red-600 mx-auto" size={56} />
          <h1 className="text-3xl font-black text-slate-800 italic tracking-tighter uppercase">Sales System</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Authenticated Access Only</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input required type="email" placeholder="Email Address" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border-none outline-none text-center" value={email} onChange={e => setEmail(e.target.value)} />
          {authMode !== 'forgot' && <input required type="password" placeholder="Password" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border-none outline-none text-center" value={password} onChange={e => setPassword(e.target.value)} />}
          {error && <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-wider">{error}</div>}
          {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-wider">{message}</div>}
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : (authMode === 'forgot' ? 'Reset Password' : authMode === 'signup' ? 'Create Account' : 'Authenticate')}
          </button>
        </form>
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
          <button onClick={() => setAuthMode(authMode === 'forgot' ? 'login' : 'forgot')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors">{authMode === 'forgot' ? 'Back to Login' : 'Forgot Password?'}</button>
          <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors">{authMode === 'login' ? 'New here? Join the team' : 'Have an account? Login'}</button>
        </div>
      </div>
    </div>
  );
}

// --- Sales Collection Form ---
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
    e.preventDefault(); 
    setSubmitting(true);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        areaManager: isAdmin ? formData.areaManager : assigned, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        workingHours: Number(formData.workingHours), 
        timestamp: Date.now(), 
        submittedBy: user.uid 
      }); 
      setSuccess(true); 
      setFormData({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: new Date().toISOString().split('T')[0] }); 
      setTimeout(() => setSuccess(false), 3000); 
    } catch (err) { console.error("Submit error:", err); } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h2 className="text-3xl font-black text-slate-800 mb-8 text-center italic uppercase tracking-tighter">Daily Sales Registry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shift Date</label>
            <input required type="date" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Area Leader</label>
            <select required disabled={!isAdmin} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-none" value={isAdmin ? formData.areaManager : assigned} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Branch</label>
            <select required className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-none" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Select Branch</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Hours</label>
            <input required type="number" step="0.5" placeholder="e.g. 8" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-4">
          <div className="space-y-1 text-center">
             <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-1">GA Achieved</label>
             <input required type="number" placeholder="0" className="w-full bg-red-50 p-6 rounded-3xl text-3xl font-black text-red-600 outline-none border border-red-100 text-center" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-1 text-center">
             <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">OC Achieved</label>
             <input required type="number" placeholder="0" className="w-full bg-blue-50 p-6 rounded-3xl text-3xl font-black text-blue-600 outline-none border border-blue-100 text-center" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>
        <textarea placeholder="Observations or shift notes..." className="w-full bg-slate-50 p-5 rounded-2xl min-h-[100px] outline-none font-bold" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-bounce">Registry Entry Successful</div>}
        <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl">Commit Entry</button>
      </form>
    </div>
  );
}

// --- Navigation Helpers ---
function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'archive', label: 'Archive', icon: Archive, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Log Sales', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Audit Trail', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Goal Setting', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team Manager', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'Configuration', icon: Settings, roles: ['admin'] }
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40 border-r border-white/5">
      <div className="mb-10 px-2 flex items-center gap-3">
        <Store className="text-red-600" size={24} />
        <h1 className="text-xl font-black text-white italic tracking-tighter">CASH SHOP</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${view === link.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'hover:bg-slate-800 text-slate-400'}`}>
            <link.icon size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-4 text-red-400 font-black text-[10px] uppercase tracking-widest transition-all">
        <LogOut size={18} /> Exit System
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [
    {id:'dashboard', icon:BarChart3, roles:['admin','user']},
    {id:'archive', icon:Archive, roles:['admin','user']},
    {id:'collection', icon:PlusCircle, roles:['admin','user']},
    {id:'reports', icon:ClipboardList, roles:['admin','user']},
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 rounded-t-3xl shadow-2xl">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-2xl transition-all ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}>
          <item.icon size={22} />
        </button>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 space-y-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto" />
        <Store className="absolute inset-0 m-auto text-red-100" size={16} />
      </div>
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Establishing Connection...</p>
    </div>
  );
}

function WaitingRoom({ onLogout }) { 
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white p-12 text-center space-y-6">
      <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
        <ShieldCheck size={48} />
      </div>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">Awaiting Activation</h2>
      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Admin approval required for account activation.</p>
      <button onClick={onLogout} className="text-red-500 underline text-xs uppercase font-black tracking-widest">Logout</button>
    </div>
  ); 
}

// Remaining Admin/Manager components follow the same pattern...
function SalesList({ records, targets, shops, managers, role, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const [filterShop, setFilterShop] = useState('All');
  const filtered = useMemo(() => filterShop === 'All' ? records : records.filter(r => r.shopName === filterShop), [records, filterShop]);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase">Audit Trail</h2>
        <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="p-3 bg-white border border-slate-100 rounded-xl font-black text-[10px] uppercase outline-none shadow-sm">
           <option value="All">All Branches</option>
           {shops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Timestamp</th><th className="px-8 py-6">Date</th><th className="px-8 py-6">Manager</th><th className="px-8 py-6">Shop</th><th className="px-8 py-6 text-center">GA</th><th className="px-8 py-6 text-center">OC</th>{isAdmin && <th className="px-8 py-6 text-right">Del</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-slate-400 text-xs">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-8 py-5 text-slate-700 text-sm">{r.date}</td>
                <td className="px-8 py-5 text-slate-800 text-sm font-black">{r.areaManager}</td>
                <td className="px-8 py-5 text-slate-500 italic text-sm">{r.shopName}</td>
                <td className="px-8 py-5 text-center text-red-600">+{r.gaAch}</td>
                <td className="px-8 py-5 text-center text-blue-600">+{r.ocAch}</td>
                {isAdmin && <td className="px-8 py-5 text-right"><button onClick={async () => { if(window.confirm("Confirm deletion?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button></td>}
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
      <h2 className="text-3xl font-black uppercase italic">Monthly Targets</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr><th className="px-8 py-5">Shop</th><th className="px-4 py-5 text-center">GA Goal</th><th className="px-4 py-5 text-center">OC Goal</th><th className="px-8 py-5 text-right">Edit</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shops.map(shop => (
              <tr key={shop.name} className="hover:bg-slate-50">
                <td className="px-8 py-5 font-black text-slate-800 italic">{shop.name}</td>
                <td className="px-4 py-5 text-center font-black">
                  {editingShop === shop.name ? <input type="number" className="w-24 bg-slate-50 p-2 text-center rounded-lg outline-none" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : (targets[shop.name]?.ga || 0)}
                </td>
                <td className="px-4 py-5 text-center font-black">
                  {editingShop === shop.name ? <input type="number" className="w-24 bg-slate-50 p-2 text-center rounded-lg outline-none" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : (targets[shop.name]?.oc || 0)}
                </td>
                <td className="px-8 py-5 text-right">
                  {editingShop === shop.name ? 
                    <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: { ...targets, [shop.name]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } } }, { merge: true }); setEditingShop(null); }} className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><Check size={18}/></button> : 
                    <button onClick={() => { setEditingShop(shop.name); setEditForm({ ga: targets[shop.name]?.ga || 0, oc: targets[shop.name]?.oc || 0 }); }} className="text-slate-200 hover:text-red-500"><Edit3 size={18} /></button>
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
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase italic">Team Approvals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 uppercase shadow-inner">{u.username?.charAt(0)}</div>
              <div className="flex-1">
                <p className="font-black text-slate-800">{u.username}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">{u.assignedManager || 'Pending Assignment'}</span>
              </div>
            </div>
            {editingId === u.uid ? (
              <div className="space-y-2">
                <select className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="user">USER</option><option value="admin">ADMIN</option>
                </select>
                <select className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                  <option value="">No Region</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid), editForm); setEditingId(null); }} className="w-full bg-slate-900 text-white p-3 rounded-xl font-black uppercase tracking-widest">Update</button>
              </div>
            ) : ( 
              <button onClick={() => { setEditingId(u.uid); setEditForm({ username: u.username, role: u.role, assignedManager: u.assignedManager || '' }); }} className="w-full bg-slate-50 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Modify Permissions</button> 
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, db, appId }) {
  const [newM, setNewM] = useState(''); const [newS, setNewS] = useState(''); const [assignedM, setAssignedM] = useState('');
  const update = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops }, { merge: true }); };
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black italic uppercase">System Setup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-red-600 uppercase text-[10px] tracking-widest flex items-center gap-2">Add Manager <UserPlus size={16} /></h3>
          <div className="flex gap-2">
            <input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-bold" placeholder="Manager Name" />
            <button onClick={() => { update([...areaManagers, newM], null); setNewM(''); }} className="bg-red-600 text-white px-6 rounded-xl font-black shadow-lg shadow-red-50">ADD</button>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-red-600 uppercase text-[10px] tracking-widest flex items-center gap-2">Add Branch <Store size={16} /></h3>
          <input value={newS} onChange={e => setNewS(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold" placeholder="Branch Name" />
          <select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold">
            <option value="">Responsible Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => { if(newS && assignedM) update(null, [...shops, {name: newS, manager: assignedM}]); setNewS(''); }} className="bg-slate-900 text-white p-4 rounded-xl font-black text-[10px] tracking-widest uppercase">Deploy Branch</button>
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 text-center">
      <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl space-y-8">
        <h2 className="text-2xl font-black text-slate-800 italic">Account Setup</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Full Name" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-center text-lg outline-none" />
        <button onClick={handleSave} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">Setup Identity</button>
      </div>
    </div>
  );
}

// Global Styles
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    .animate-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(styleTag);
}
