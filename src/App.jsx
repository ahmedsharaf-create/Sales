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
  Printer
} from 'lucide-react';

// --- Firebase Configuration (CRITICAL FIX FOR INVALID-API-KEY) ---
// We use the environment provided config directly without forcing apiKey to empty
// unless it's absolutely necessary. The error indicates the SDK expects a valid key.
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Failed to parse firebase config", e);
  }
  return {
    apiKey: "", // Fallback
    authDomain: "pyramids-sales.firebaseapp.com",
    projectId: "pyramids-sales",
    storageBucket: "pyramids-sales.firebasestorage.app",
    messagingSenderId: "658795707959",
    appId: "1:658795707959:web:76e44a85011105fd2949b2"
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pyramids-sales-v1';

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

  useEffect(() => {
    // RULE 3: Auth Before Queries
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        setAuthReady(true);
      } catch (err) {
        console.error("Authentication failed during init:", err);
        // Even if it fails, we mark ready to show login or retry
        setAuthReady(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // RULE 1: Strict Paths
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid));
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
          setView('onboarding');
        }
      } else {
        setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Wait for user and auth profile to be ready
    if (!user || !userProfile || !authReady) return;

    // RULE 1 & 2: Listen for changes and handle filtering in memory
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    }, (err) => console.error("Settings listener error:", err));

    const unsubSales = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        // Filter in memory for non-admins
        setSalesRecords(sorted.filter(r => r.areaManager === userProfile.assignedManager || r.submittedBy === user.uid));
      }
    }, (err) => console.error("Sales listener error:", err));

    if (userProfile.role === 'admin') {
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      }, (err) => console.error("Users listener error:", err));
    }

    return () => { unsubSettings(); unsubSales(); };
  }, [user, userProfile, authReady]);

  if (loading || !authReady) return <LoadingScreen />;
  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;
  if (view === 'waiting') return <WaitingRoom onLogout={() => signOut(auth)} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] md:pl-64 transition-all duration-300">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={() => signOut(auth)} />
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto print:p-0">
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

// --- DASHBOARD COMPONENT ---
function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [timeRange, setTimeRange] = useState('This Month');

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    let data = [...records];
    const targetMgr = isAdmin ? filterManager : assignedManager;
    
    if (targetMgr !== 'All') {
      data = data.filter(r => r.areaManager === targetMgr);
    }

    const now = new Date();
    if (timeRange === 'Today') {
      data = data.filter(r => new Date(r.timestamp).toDateString() === now.toDateString());
    } else if (timeRange === 'This Month') {
      data = data.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return data;
  }, [records, filterManager, timeRange, isAdmin, assignedManager]);

  // Calculated Stats
  const stats = useMemo(() => {
    const targetMgr = isAdmin ? filterManager : assignedManager;
    const relevantShops = shops.filter(s => targetMgr === 'All' ? true : s.manager === targetMgr);
    
    let targetGA = 0, targetOC = 0;
    relevantShops.forEach(s => {
      targetGA += (targets[s.name]?.ga || 0);
      targetOC += (targets[s.name]?.oc || 0);
    });

    const totalGA = filteredRecords.reduce((acc, r) => acc + (Number(r.gaAch) || 0), 0);
    const totalOC = filteredRecords.reduce((acc, r) => acc + (Number(r.ocAch) || 0), 0);
    const totalHours = filteredRecords.reduce((acc, r) => acc + (Number(r.workingHours) || 0), 0);
    const avgHours = filteredRecords.length > 0 ? (totalHours / filteredRecords.length).toFixed(1) : 0;

    return {
      totalGA, totalOC, targetGA, targetOC,
      gaProgress: targetGA > 0 ? (totalGA / targetGA * 100).toFixed(1) : 0,
      ocProgress: targetOC > 0 ? (totalOC / targetOC * 100).toFixed(1) : 0,
      avgHours,
      shopCount: relevantShops.length
    };
  }, [filteredRecords, targets, shops, filterManager, isAdmin, assignedManager]);

  const shopPerformanceList = useMemo(() => {
    const targetMgr = isAdmin ? filterManager : assignedManager;
    const relevantShops = shops.filter(s => targetMgr === 'All' ? true : s.manager === targetMgr);
    
    return relevantShops.map(s => {
      const sRecords = filteredRecords.filter(r => r.shopName === s.name);
      const achGA = sRecords.reduce((acc, r) => acc + (Number(r.gaAch) || 0), 0);
      const targetGA = targets[s.name]?.ga || 0;
      return {
        name: s.name,
        achGA,
        targetGA,
        percent: targetGA > 0 ? (achGA / targetGA * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.percent - a.percent);
  }, [filteredRecords, shops, targets, filterManager, isAdmin, assignedManager]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 no-print">
        <div>
          <h2 className="text-4xl font-black text-slate-800 uppercase italic leading-none tracking-tighter">
            {filterManager === 'All' ? 'Global Stats' : `${filterManager} Region`}
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">نظام تحليل أداء المناطق المباشر</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white border-2 border-slate-100 p-2 rounded-2xl shadow-sm">
              <UsersIcon size={14} className="text-red-500 ml-2" />
              <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
                <option value="All">All Regions</option>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-white border-2 border-slate-100 p-3 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-red-500 transition-all">
            <option>Today</option><option>This Month</option><option>All Time</option>
          </select>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95">
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Achievement" value={stats.totalGA} target={stats.targetGA} progress={stats.gaProgress} color="#EF4444" icon={TrendingUp} />
        <KPIBox title="OC Achievement" value={stats.totalOC} target={stats.targetOC} progress={stats.ocProgress} color="#3B82F6" icon={Activity} />
        <KPIBox title="Avg Shift" value={stats.avgHours + 'h'} subtext="Average working hours" color="#10B981" icon={Clock} />
        <KPIBox title="Active Shops" value={stats.shopCount} subtext="Total shops in region" color="#64748B" icon={Store} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <LayoutDashboard size={16} className="text-red-600" /> ملخص أداء الوحدات
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0F172A] text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-5">Location</th>
                    <th className="px-2 py-5 text-right text-red-400">GA Target</th>
                    <th className="px-2 py-5 text-right text-red-200">GA Ach</th>
                    <th className="px-2 py-5 text-right">%</th>
                    <th className="px-6 py-5 text-right text-emerald-400">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[10px] font-bold tabular-nums">
                  {shopPerformanceList.map((shop, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">{shop.name}</td>
                      <td className="px-2 py-4 text-right text-slate-400">{shop.targetGA.toLocaleString()}</td>
                      <td className="px-2 py-4 text-right text-red-600 font-black">{shop.achGA.toLocaleString()}</td>
                      <td className="px-2 py-4 text-right text-red-800 font-black">{shop.percent}%</td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${Math.min(shop.percent, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shopPerformanceList.length === 0 && (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold uppercase italic">No records found for this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 space-y-6">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> المنطقة الأكثر إنجازاً
            </h3>
            {shopPerformanceList.length > 0 ? (
              <div className="text-center py-4">
                <div className="inline-flex p-4 bg-emerald-50 rounded-3xl mb-4">
                  <ArrowUpRight className="text-emerald-500" size={32} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 uppercase italic">{shopPerformanceList[0].name}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">محقق بنسبة {shopPerformanceList[0].percent}%</p>
              </div>
            ) : (
              <p className="text-center text-slate-300 font-bold text-xs italic">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color, icon: Icon, subtext }) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <h4 className="text-2xl font-black text-slate-800 tabular-nums">{value}</h4>
        {target > 0 && <span className="text-xs text-slate-300 font-bold italic">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[9px] font-black uppercase">
            <span style={{ color }}>{progress}% Done</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight italic">{subtext}</p>
      )}
    </div>
  );
}

// --- REMAINING COMPONENTS ---

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
      // RULE 1: Public path
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        workingHours: Number(formData.workingHours), 
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
    } catch (err) { 
      console.error("Submission failed:", err); 
    } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-4xl font-black text-slate-800 mb-8 text-center italic uppercase tracking-tighter">Daily Entry</h2>
      {success && <div className="bg-emerald-600 text-white p-6 rounded-[2rem] text-center font-black shadow-2xl mb-8 animate-bounce">RECORD SAVED ✓</div>}
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Area Manager</label>
            <select required className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-red-500 transition-all outline-none" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})} disabled={!isAdmin}>
              <option value="">Select</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Shop Location</label>
            <select required className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-red-500 transition-all outline-none" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Select</option>{availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-8">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-red-500 ml-2">GA Achieved</label>
            <input required type="number" placeholder="0" className="w-full bg-red-50 p-8 rounded-[2rem] text-4xl font-black text-red-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-blue-500 ml-2">OC Achieved</label>
            <input required type="number" placeholder="0" className="w-full bg-blue-50 p-8 rounded-[2rem] text-4xl font-black text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Total Hours Worked</label>
          <input required type="number" step="0.5" placeholder="8" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-2xl outline-none focus:bg-white transition-all" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
        </div>
        <textarea placeholder="Optional notes about this shift..." className="w-full bg-slate-50 p-6 rounded-[2rem] min-h-[140px] font-bold outline-none focus:bg-white transition-all" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-black active:scale-95 transition-all">
          {submitting ? '...' : 'Confirm Submission'}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, role }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-800 uppercase italic">Operational Log</h2>
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden overflow-x-auto border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr><th className="px-8 py-5">Timestamp</th><th className="px-8 py-5">Manager</th><th className="px-8 py-5">Shop Entity</th><th className="px-8 py-5 text-right text-red-400">GA</th><th className="px-8 py-5 text-right text-blue-400">OC</th><th className="px-8 py-5 text-right">Hrs</th>{role === 'admin' && <th className="px-8 py-5 text-right">Action</th>}</tr>
          </thead>
          <tbody className="divide-y text-xs font-bold tabular-nums">
            {records.map(r => (<tr key={r.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-8 py-4 text-slate-400 font-medium">{new Date(r.timestamp).toLocaleString()}</td>
              <td className="px-8 py-4">{r.areaManager}</td>
              <td className="px-8 py-4 font-black text-slate-900 uppercase">{r.shopName}</td>
              <td className="px-8 py-4 text-right text-red-600 font-black">+{r.gaAch}</td>
              <td className="px-8 py-4 text-right text-blue-600 font-black">+{r.ocAch}</td>
              <td className="px-8 py-4 text-right">{r.workingHours}h</td>
              {role === 'admin' && <td className="px-8 py-4 text-right"><button onClick={async () => { if(confirm("Delete this entry?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} className="text-red-200 hover:text-red-600 transition-colors p-2"><Trash2 size={16}/></button></td>}
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets }) {
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState({ ga: 0, oc: 0 });

  const handleSave = async (shopName) => {
    try {
      const newTargets = { ...targets, [shopName]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
      setEditingShop(null);
    } catch (err) { console.error("Target save failed:", err); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase italic">Deployment Quotas</h2>
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase">
            <tr><th className="px-8 py-6">Unit</th><th className="px-8 py-6">Supervisor</th><th className="px-8 py-6 text-right">GA Target</th><th className="px-8 py-6 text-right">OC Target</th><th className="px-8 py-6 text-right">Settings</th></tr>
          </thead>
          <tbody className="divide-y text-xs font-bold tabular-nums">
            {shops.map(s => (<tr key={s.name} className="hover:bg-slate-50 transition-colors">
              <td className="px-8 py-5 font-black uppercase">{s.name}</td>
              <td className="px-8 py-5 text-slate-400 uppercase tracking-tighter">{s.manager}</td>
              <td className="px-8 py-5 text-right">
                {editingShop === s.name ? <input type="number" className="w-24 bg-slate-50 p-2 rounded-xl border-2 border-red-500 font-black text-right outline-none" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : <span className="text-red-600 font-black">{(targets[s.name]?.ga || 0).toLocaleString()}</span>}
              </td>
              <td className="px-8 py-5 text-right">
                {editingShop === s.name ? <input type="number" className="w-24 bg-slate-50 p-2 rounded-xl border-2 border-blue-500 font-black text-right outline-none" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : <span className="text-blue-600 font-black">{(targets[s.name]?.oc || 0).toLocaleString()}</span>}
              </td>
              <td className="px-8 py-5 text-right">
                {editingShop === s.name ? <button onClick={() => handleSave(s.name)} className="text-emerald-500 p-2"><Check /></button> : <button onClick={() => { setEditingShop(s.name); setEditForm({ ga: targets[s.name]?.ga || 0, oc: targets[s.name]?.oc || 0 }); }} className="text-slate-300 hover:text-red-600 transition-colors p-2"><Edit3 size={18} /></button>}
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets }) {
  const [newM, setNewM] = useState(''); const [newS, setNewS] = useState(''); const [assignedM, setAssignedM] = useState('');
  const update = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets }); };
  return (
    <div className="space-y-10 pb-20">
      <h2 className="text-4xl font-black italic uppercase tracking-tighter">Architecture</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><UsersIcon className="text-red-500"/> Regional Supervisors</h3>
          <div className="flex gap-2"><input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-5 rounded-2xl font-bold border-none outline-none focus:bg-white transition-all" placeholder="New Manager" /><button onClick={() => { if(newM) update([...areaManagers, newM], null); setNewM(''); }} className="bg-red-600 text-white px-8 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all">Add</button></div>
          <div className="space-y-2">{areaManagers.map((m, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-xs uppercase"><span>{m}</span><button onClick={() => update(areaManagers.filter((_, idx) => idx !== i), null)} className="text-red-300 hover:text-red-600 transition-all"><X size={16}/></button></div>)}</div>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><Store className="text-red-500"/> Operational Entities</h3>
          <div className="space-y-3"><input value={newS} onChange={e => setNewS(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none" placeholder="Entity Name" /><select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs uppercase"><option value="">Supervisor Link</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select><button onClick={() => { if(newS && assignedM) update(null, [...shops, {name: newS, manager: assignedM}]); setNewS(''); }} className="bg-[#0F172A] text-white w-full py-5 rounded-2xl font-black shadow-lg uppercase text-[10px] active:scale-95 transition-all">Register Unit</button></div>
          <div className="space-y-2">{shops.map((s, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-xs uppercase"><span>{s.name} <span className="text-[9px] text-slate-300 ml-2">[{s.manager}]</span></span><button onClick={() => update(null, shops.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-600 transition-all"><X size={16}/></button></div>)}</div>
        </div>
      </div>
    </div>
  );
}

function UserSearch({ users, managers }) {
  const handleUpdate = async (uid, data) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), data);
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase italic">Staff Profiles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 group hover:border-red-100 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 uppercase text-xl group-hover:bg-red-50 group-hover:text-red-400 transition-all">{u.username?.charAt(0)}</div>
              <div><p className="font-black text-slate-800 text-lg leading-none mb-1">{u.username}</p><p className="text-[10px] font-black uppercase text-red-600 tracking-widest">{u.role}</p></div>
            </div>
            <select className="w-full bg-slate-50 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-red-500 transition-all" value={u.assignedManager || ''} onChange={e => handleUpdate(u.uid, { assignedManager: e.target.value })}>
              <option value="">No Assignment</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={async () => { if(confirm("Terminate profile?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid)); }} className="w-full text-red-300 hover:text-red-600 font-black text-[9px] uppercase tracking-[0.2em] pt-2">Delete Account</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- LOGIC HELPERS ---

function LoginPortal() {
  const [mode, setMode] = useState('login'); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { 
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password); 
      else if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, password); 
      else { await sendPasswordResetEmail(auth, email); setErr("Reset link dispatched!"); } 
    } catch (e) { 
      setErr(e.message.replace('Firebase:', '').trim()); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.5)] space-y-8 animate-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex p-5 bg-red-50 rounded-[1.5rem] mb-4 shadow-inner">
            <Store className="text-red-600" size={40}/>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-800">Sales Network</h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Operational Portal</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <input required type="email" placeholder="Corporate Email" className="w-full bg-slate-50 p-5 rounded-3xl font-bold outline-none border-2 border-transparent focus:border-red-500/20 focus:bg-white transition-all" value={email} onChange={e => setEmail(e.target.value)} />
          {mode !== 'forgot' && <input required type="password" placeholder="Encryption Key" className="w-full bg-slate-50 p-5 rounded-3xl font-bold outline-none border-2 border-transparent focus:border-red-500/20 focus:bg-white transition-all" value={password} onChange={e => setPassword(e.target.value)} />}
          {err && <div className="text-red-500 text-[10px] font-black uppercase text-center bg-red-50 p-3 rounded-xl border border-red-100">{err}</div>}
          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-black uppercase tracking-widest active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : (mode === 'login' ? 'Verify & Enter' : mode === 'signup' ? 'Create Profile' : 'Send Link')}
          </button>
        </form>
        <div className="flex justify-between items-center px-4">
          <button onClick={() => setMode('forgot')} className="text-[9px] font-black uppercase text-red-500 hover:underline">Lost Key?</button>
          <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-800">{mode === 'signup' ? 'Back to Login' : 'Register Access'}</button>
        </div>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [ 
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] }, 
    { id: 'collection', label: 'Data Entry', icon: PlusCircle, roles: ['admin', 'user'] }, 
    { id: 'reports', label: 'History', icon: ClipboardList, roles: ['admin', 'user'] }, 
    { id: 'targets', label: 'Quotas', icon: Target, roles: ['admin'] }, 
    { id: 'userSearch', label: 'Team', icon: UsersIcon, roles: ['admin'] }, 
    { id: 'admin', label: 'Setup', icon: Settings, roles: ['admin'] } 
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-400 p-8 z-40 border-r border-white/5 shadow-2xl">
      <div className="mb-14 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white italic font-black shadow-lg shadow-red-600/30">PE</div>
        <h1 className="text-xl font-black text-white italic uppercase tracking-tighter">Pyramids</h1>
      </div>
      <div className="space-y-2 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button 
            key={link.id} 
            onClick={() => setView(link.id)} 
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${view === link.id ? 'bg-white text-slate-900 shadow-2xl translate-x-1' : 'hover:bg-white/5 hover:text-white'}`}
          >
            <link.icon size={18} /> <span>{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-4 px-6 py-4 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-400/10 rounded-2xl transition-all active:scale-95">
        <LogOut size={18}/> Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}];
  return ( 
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] no-print">
      {icons.map(item => item.roles.includes(role) && ( 
        <button 
          key={item.id} 
          onClick={() => setView(item.id)} 
          className={`p-4 rounded-3xl transition-all active:scale-90 ${view === item.id ? 'text-red-600 bg-red-50 shadow-inner scale-110' : 'text-slate-300'}`}
        >
          <item.icon size={24} />
        </button> 
      ))}
    </div> 
  );
}

function LoadingScreen() { 
  return ( 
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Syncing Network...</p>
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
    setUserProfile(profile); setView('waiting'); 
  };
  return ( 
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
        <div className="inline-flex p-4 bg-red-50 rounded-2xl"><UserCog className="text-red-600" size={40}/></div>
        <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">New Profile</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 p-6 rounded-3xl font-black text-center text-xl outline-none border focus:border-red-500/20" />
        <button onClick={handleSave} className="w-full bg-red-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-red-600/20 active:scale-95 transition-all">Establish Access</button>
      </div>
    </div> 
  );
}

function WaitingRoom({ onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in zoom-in">
        <div className="inline-flex p-4 bg-red-50 rounded-2xl animate-pulse"><ShieldCheck className="text-red-600" size={60} /></div>
        <h2 className="text-2xl font-black text-slate-800 italic uppercase tracking-tight">Access Pending</h2>
        <p className="text-slate-500 font-bold leading-relaxed text-sm">Welcome to the Network. Your profile is active, but access is restricted until an administrator <span className="text-red-600 font-black">(Ahmed Sharaf)</span> assigns your region.</p>
        <div className="pt-4">
          <button onClick={onLogout} className="text-slate-400 font-black text-[10px] uppercase hover:text-red-600 tracking-widest transition-colors flex items-center gap-2 mx-auto"><ArrowLeft size={14}/> Sign Out</button>
        </div>
      </div>
    </div>
  );
}
