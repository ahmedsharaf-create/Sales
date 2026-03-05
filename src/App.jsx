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
  Mail,
  Printer,
  FileText
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

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase initialization error:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'pyramids-sales-v1';

const PELogo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 420 300" className={className} xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(10, 10)">
      <path 
        d="M135 110 A 65 65 0 1 1 135 240 A 65 65 0 0 1 135 110 Z M65 110 L 65 285" 
        stroke="#E61E26" strokeWidth="48" fill="none" strokeLinecap="round" strokeLinejoin="round" 
      />
      <path 
        d="M285 175 A 65 65 0 1 1 285 174.9 L 195 175" 
        stroke="#E61E26" strokeWidth="48" fill="none" strokeLinecap="round" strokeLinejoin="round" 
      />
    </g>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); 
  const [targets, setTargets] = useState({}); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
            setView('dashboard');
          } else {
            setView('onboarding');
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
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
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
    });

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
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-slate-500 font-bold tracking-tight uppercase text-xs">Initializing...</p>
        </div>
      </div>
    );
  }

  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto print:p-0">
        {view === 'dashboard' && (
          <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />
        )}
        
        {view === 'collection' && (
          <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} />
        )}
        
        {view === 'reports' && (
          <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />
        )}
        
        {view === 'admin' && userProfile?.role === 'admin' && (
          <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} user={user} />
        )}

        {view === 'userSearch' && userProfile?.role === 'admin' && (
          <UserSearch users={allUsers} />
        )}
      </main>

      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- DASHBOARD COMPONENTS ---

function Dashboard({ records, targets, shops, managers, role }) {
  const [filterManager, setFilterManager] = useState('All');
  const [timeRange, setTimeRange] = useState('This Month');

  const filteredRecords = useMemo(() => {
    let data = [...records];
    const now = new Date();
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    
    if (timeRange === 'Today') {
      data = data.filter(r => new Date(r.timestamp).toDateString() === now.toDateString());
    } else if (timeRange === 'This Month') {
      data = data.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return data;
  }, [records, filterManager, timeRange]);

  // Aggregation for Summary Table
  const summaryData = useMemo(() => {
    const isFiltered = filterManager !== 'All';
    const groupKey = isFiltered ? 'shopName' : 'areaManager';
    const map = {};

    // Prep populate the map to ensure all relevant items show up even with 0 sales
    if (isFiltered) {
      shops.filter(s => s.manager === filterManager).forEach(s => {
        map[s.name] = { 
          name: s.name, 
          gaAch: 0, 
          ocAch: 0, 
          gaTarget: Number(targets[s.name]?.ga || 0), 
          ocTarget: Number(targets[s.name]?.oc || 0) 
        };
      });
    } else {
      managers.forEach(m => {
        let mGaT = 0; let mOcT = 0;
        shops.filter(s => s.manager === m).forEach(s => {
          mGaT += Number(targets[s.name]?.ga || 0);
          mOcT += Number(targets[s.name]?.oc || 0);
        });
        map[m] = { name: m, gaAch: 0, ocAch: 0, gaTarget: mGaT, ocTarget: mOcT };
      });
    }

    // Accumulate actuals
    filteredRecords.forEach(r => {
      const key = r[groupKey];
      if (map[key]) {
        map[key].gaAch += (r.gaAch || 0);
        map[key].ocAch += (r.ocAch || 0);
      }
    });

    return Object.values(map);
  }, [filteredRecords, filterManager, shops, targets, managers]);

  const stats = useMemo(() => {
    const gaAch = summaryData.reduce((a, b) => a + b.gaAch, 0);
    const ocAch = summaryData.reduce((a, b) => a + b.ocAch, 0);
    const gaTarget = summaryData.reduce((a, b) => a + b.gaTarget, 0);
    const ocTarget = summaryData.reduce((a, b) => a + b.ocTarget, 0);
    return {
      gaAch, ocAch, gaTarget, ocTarget,
      gaP: gaTarget > 0 ? (gaAch / gaTarget) * 100 : 0,
      ocP: ocTarget > 0 ? (ocAch / ocTarget) * 100 : 0
    };
  }, [summaryData]);

  const exportSummaryCSV = () => {
    const headers = ['Name', 'GA Target', 'GA Achieved', 'GA %', 'GA Remaining', 'OC Target', 'OC Achieved', 'OC %', 'OC Remaining'];
    const rows = summaryData.map(d => {
      const gaP = d.gaTarget > 0 ? (d.gaAch / d.gaTarget * 100).toFixed(1) : 0;
      const ocP = d.ocTarget > 0 ? (d.ocAch / d.ocTarget * 100).toFixed(1) : 0;
      return [
        d.name, d.gaTarget, d.gaAch, gaP + '%', Math.max(0, d.gaTarget - d.gaAch),
        d.ocTarget, d.ocAch, ocP + '%', Math.max(0, d.ocTarget - d.ocAch)
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Performance_Summary_${filterManager.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 print:space-y-4">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Executive Dashboard</h2>
          <p className="text-slate-400 font-bold text-[10px] tracking-widest">Real-time performance audit</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-sm">
            <Filter size={16} className="text-slate-400" />
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700">
              <option value="All">Global View</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-sm">
            <Calendar size={16} className="text-slate-400" />
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700">
              <option>Today</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-2">
        <KPIBox title="GA ACHIEVEMENT" value={stats.gaAch} target={stats.gaTarget} progress={stats.gaP} color="rose" />
        <KPIBox title="OC ACHIEVEMENT" value={stats.ocAch} target={stats.ocTarget} progress={stats.ocP} color="blue" />
        <KPIBox title="OVERALL RATE" value={`${((stats.gaP + stats.ocP) / 2).toFixed(1)}%`} progress={(stats.gaP + stats.ocP) / 2} color="indigo" />
        <KPIBox title="TOTAL ENTRIES" value={filteredRecords.length} color="slate" />
      </div>

      {/* Summary Table Section */}
      <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden print:border-none print:shadow-none">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:p-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={22} className="text-red-500" /> 
              {filterManager === 'All' ? 'Managerial Achievement Summary' : `Shop Performance: ${filterManager}`}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aggregated performance analytics</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button 
              onClick={exportSummaryCSV}
              className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
              title="Export to Excel"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20"
              title="Print to PDF"
            >
              <Printer size={16} /> Print / PDF
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px] print:min-w-0 print:text-[8px]">
            <thead className="bg-slate-900 text-slate-400">
              <tr className="text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5 print:px-2 print:py-2">{filterManager === 'All' ? 'Area Manager' : 'Shop Location'}</th>
                {/* GA Section */}
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-400 print:bg-transparent print:text-slate-900">GA Target</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-200 print:bg-transparent print:text-slate-900">GA Ach.</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-500 print:bg-transparent print:text-slate-900">GA %</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-white print:bg-transparent print:text-slate-900">GA Rem.</th>
                {/* OC Section */}
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-400 print:bg-transparent print:text-slate-900">OC Target</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-200 print:bg-transparent print:text-slate-900">OC Ach.</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-500 print:bg-transparent print:text-slate-900">OC %</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-white print:bg-transparent print:text-slate-900">OC Rem.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-20 text-center text-slate-300 font-bold italic uppercase tracking-widest">No matching data found</td>
                </tr>
              ) : summaryData.map((d, i) => {
                const gaP = d.gaTarget > 0 ? (d.gaAch / d.gaTarget * 100).toFixed(1) : 0;
                const ocP = d.ocTarget > 0 ? (d.ocAch / d.ocTarget * 100).toFixed(1) : 0;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors tabular-nums">
                    <td className="px-8 py-5 font-black text-slate-800 print:px-2 print:py-1">{d.name}</td>
                    {/* GA Row */}
                    <td className="px-4 py-5 text-right text-xs font-bold text-slate-400 print:px-1">{d.gaTarget.toLocaleString()}</td>
                    <td className="px-4 py-5 text-right text-sm font-black text-red-600 print:px-1">{d.gaAch.toLocaleString()}</td>
                    <td className="px-4 py-5 text-right text-xs font-black text-red-700 print:px-1">{gaP}%</td>
                    <td className="px-4 py-5 text-right text-xs font-bold text-slate-500 print:px-1">{Math.max(0, d.gaTarget - d.gaAch).toLocaleString()}</td>
                    {/* OC Row */}
                    <td className="px-4 py-5 text-right text-xs font-bold text-slate-400 print:px-1">{d.ocTarget.toLocaleString()}</td>
                    <td className="px-4 py-5 text-right text-sm font-black text-blue-600 print:px-1">{d.ocAch.toLocaleString()}</td>
                    <td className="px-4 py-5 text-right text-xs font-black text-blue-700 print:px-1">{ocP}%</td>
                    <td className="px-4 py-5 text-right text-xs font-bold text-slate-500 print:px-1">{Math.max(0, d.ocTarget - d.ocAch).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            {summaryData.length > 0 && (
              <tfoot className="bg-slate-50">
                <tr className="font-black text-slate-900">
                  <td className="px-8 py-5 uppercase text-[10px]">Grand Totals</td>
                  <td className="px-4 py-5 text-right text-xs">{stats.gaTarget.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-sm text-red-600">{stats.gaAch.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs text-red-700">{stats.gaP.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-500">{Math.max(0, stats.gaTarget - stats.gaAch).toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs">{stats.ocTarget.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-sm text-blue-600">{stats.ocAch.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs text-blue-700">{stats.ocP.toFixed(1)}%</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-500">{Math.max(0, stats.ocTarget - stats.ocAch).toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color }) {
  const bars = { rose: 'bg-red-500', blue: 'bg-blue-500', indigo: 'bg-indigo-500', slate: 'bg-slate-500' };
  return (
    <div className="p-7 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all print:p-2 print:rounded-lg print:border-slate-300">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 print:mb-1">{title}</p>
      <div className="flex items-baseline gap-2 mb-5 print:mb-1">
        <h4 className="text-3xl font-black text-slate-900 leading-none print:text-base">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-bold print:hidden">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden print:h-1">
          <div className={`h-full ${bars[color]} transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
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
          <PELogo className="w-24 h-24 mx-auto mb-4" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enterprise Sales Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input required type="email" placeholder="Email" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input required type="password" placeholder="Password" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl font-bold" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center border border-red-100">{error}</div>}
          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl">
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-600">
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
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
    setUserProfile(profile);
    setView('dashboard');
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-6 italic uppercase tracking-tighter">Enter Profile Name</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full border-2 bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl outline-none" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg">Activate Profile</button>
      </div>
    </div>
  );
}

// --- CORE FEATURE VIEWS ---

function SalesCollectionForm({ areaManagers, shops, user }) {
  const [formData, setFormData] = useState({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const availableShops = useMemo(() => formData.areaManager ? shops.filter(s => s.manager === formData.areaManager) : [], [formData.areaManager, shops]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, gaAch: Number(formData.gaAch) || 0, ocAch: Number(formData.ocAch) || 0, 
        timestamp: Date.now(), submittedBy: user.uid 
      });
      setSuccess(true);
      setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-12 text-center uppercase">Daily Sales Log</h2>
      {success && <div className="bg-red-600 text-white p-6 rounded-[2rem] text-center font-black mb-8 shadow-2xl animate-bounce">ENTRY RECORDED</div>}
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Area Context</label>
            <select required className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              <option value="">Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Target Location</label>
            <select required disabled={!formData.areaManager} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg disabled:opacity-30" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Location</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-red-600">GA ACHIEVEMENT</label>
            <input required type="number" className="w-full border-2 border-red-50 p-8 rounded-[2rem] font-black text-4xl text-red-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">OC ACHIEVEMENT</label>
            <input required type="number" className="w-full border-2 border-blue-50 p-8 rounded-[2rem] font-black text-4xl text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>
        <textarea className="w-full border-2 border-slate-50 p-8 rounded-[2rem] font-medium h-40 bg-slate-50 outline-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Submission notes or feedback..."/>
        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl hover:bg-black transition-all shadow-2xl">
          {submitting ? 'RECORDING...' : 'CONFIRM ENTRY'}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role }) {
  const [filterManager, setFilterManager] = useState('All');
  const filtered = useMemo(() => filterManager !== 'All' ? records.filter(r => r.areaManager === filterManager) : records, [records, filterManager]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Submission History</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Detailed Log (12 Columns)</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm text-sm">
          <Filter size={18} className="text-slate-400" />
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-700">
            <option value="All">All Regions</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[1500px]">
          <thead>
            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-black">
              <th className="px-6 py-5">Time</th><th className="px-6 py-5">Manager</th><th className="px-6 py-5">Date</th><th className="px-6 py-5">Location</th>
              <th className="px-4 py-5 text-right bg-red-950/20">GA Target</th><th className="px-4 py-5 text-right bg-red-950/20 text-red-400">GA Ach</th><th className="px-4 py-5 text-right bg-red-950/20">GA %</th><th className="px-4 py-5 text-right bg-red-950/20">GA Rem.</th>
              <th className="px-4 py-5 text-right bg-blue-950/20">OC Target</th><th className="px-4 py-5 text-right bg-blue-950/20 text-blue-400">OC Ach</th><th className="px-4 py-5 text-right bg-blue-950/20">OC %</th><th className="px-4 py-5 text-right bg-blue-950/20">OC Rem.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {filtered.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-[10px] font-black text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">{r.areaManager}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(r.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-black text-slate-900">{r.shopName}</td>
                <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-red-50/10">{(targets[r.shopName]?.ga || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-sm font-black text-red-600 bg-red-50/20">+{r.gaAch.toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-xs font-black bg-red-50/10">{targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) : 0}%</td>
                <td className="px-4 py-4 text-right text-xs font-bold bg-red-50/10 text-slate-400">{Math.max(0, (targets[r.shopName]?.ga || 0) - r.gaAch).toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-blue-50/10">{(targets[r.shopName]?.oc || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-sm font-black text-blue-600 bg-blue-50/20">+{r.ocAch.toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-xs font-black bg-blue-50/10">{targets[r.shopName]?.oc > 0 ? (r.ocAch / targets[r.shopName].oc * 100).toFixed(1) : 0}%</td>
                <td className="px-4 py-4 text-right text-xs font-bold bg-blue-50/10 text-slate-400">{Math.max(0, (targets[r.shopName]?.oc || 0) - r.ocAch).toLocaleString()}</td>
              </tr>
            ))}
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
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Personnel Directory</h2>
      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input type="text" placeholder="Lookup username..." className="w-full bg-white border p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(u => (
          <div key={u.uid} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase">{u.username?.charAt(0)}</div>
            <div><p className="font-black text-slate-800">{u.username}</p><span className="text-[9px] font-black uppercase text-red-600 tracking-widest">{u.role}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, targets, user }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const updateConfig = async (m, s, t) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets: t || targets });
  };
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">System Configuration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 uppercase text-xs tracking-widest"><UsersIcon size={20} className="text-slate-400"/> Territor Managers</h3>
          <div className="flex gap-2 mb-6">
            <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Manager Name" />
            <button onClick={() => {if(newManager) updateConfig([...areaManagers, newManager], null, null); setNewManager('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black">Add</button>
          </div>
          <div className="space-y-2">{areaManagers.map((m, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 text-xs">{m}</div>)}</div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 uppercase text-xs tracking-widest"><Store size={20} className="text-slate-400"/> Location Linkage</h3>
          <div className="space-y-3">
            <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-slate-50 outline-none text-sm">
              <option value="">Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 border p-4 rounded-2xl text-sm font-bold bg-slate-50 outline-none" placeholder="Shop Name" />
              <button onClick={() => {if(newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}], null); setNewShop('')}} className="bg-slate-900 text-white px-6 rounded-2xl font-black">Add</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- NAVIGATION ---

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'History', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'userSearch', label: 'Team', icon: Search, roles: ['admin'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40 print:hidden">
      <div className="mb-10 flex items-center gap-3 px-2">
        <PELogo className="w-12 h-12" />
      </div>
      <div className="space-y-1 flex-1">
        {links.map((link) => {
          if (!link.roles.includes(role)) return null;
          return (
            <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === link.id ? 'bg-red-600/10 text-red-400 border border-red-600/20' : 'hover:bg-slate-800'}`}>
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
  const icons = [{ id: 'dashboard', icon: BarChart3, roles: ['admin', 'user'] }, { id: 'collection', icon: PlusCircle, roles: ['admin', 'user'] }, { id: 'reports', icon: ClipboardList, roles: ['admin', 'user'] }, { id: 'userSearch', icon: Search, roles: ['admin'] }];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-3 md:hidden z-50 print:hidden">
      {icons.map(item => {
        if (!item.roles.includes(role)) return null;
        return (
          <button key={item.id} onClick={() => setView(item.id)} className={`p-2 rounded-xl transition-colors ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}>
            <item.icon size={22} />
          </button>
        );
      })}
    </div>
  );
}
