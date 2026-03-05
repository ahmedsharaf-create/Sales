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
  Filter, 
  BarChart3,
  Target,
  Calendar,
  FileSpreadsheet,
  LogOut,
  Search,
  Lock,
  Mail,
  Printer,
  Save,
  X,
  Edit3,
  Check,
  UserPlus,
  UserCog,
  Activity,
  Download,
  Upload,
  PieChart as PieIcon,
  Clock
} from 'lucide-react';

// --- Firebase Configuration ---
// Note: apiKey must be an empty string; the environment provides the valid key at runtime.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "",
      authDomain: "pyramids-sales.firebaseapp.com",
      projectId: "pyramids-sales",
      storageBucket: "pyramids-sales.firebasestorage.app",
      messagingSenderId: "658795707959",
      appId: "1:658795707959:web:76e44a85011105fd2949b2",
      measurementId: "G-MMZ18E15FX"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          // Attempt anonymous sign in if no user is present to ensure rules pass
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication failed:", err);
      }
    };
    initAuth();

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
    if (!user || !userProfile) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    }, (err) => console.error("Settings listener error:", err));

    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        const assigned = userProfile.assignedManager;
        setSalesRecords(sorted.filter(r => r.areaManager === assigned || r.submittedBy === user.uid));
      }
    }, (err) => console.error("Sales listener error:", err));

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

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (view === 'login') return <LoginPortal />;
  if (view === 'onboarding') return <Onboarding user={user} setView={setView} setUserProfile={setUserProfile} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} role={userProfile?.role} onLogout={handleLogout} />
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto print:p-0">
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} userProfile={userProfile} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} managers={areaManagers} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} />}
      </main>
      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || 'All';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assigned);
  const [timeRange, setTimeRange] = useState('This Month');

  const filteredRecords = useMemo(() => {
    let data = [...records];
    const now = new Date();
    const activeFilter = isAdmin ? filterManager : assigned;
    if (activeFilter !== 'All') data = data.filter(r => r.areaManager === activeFilter);
    if (timeRange === 'Today') data = data.filter(r => new Date(r.timestamp).toDateString() === now.toDateString());
    else if (timeRange === 'This Month') data = data.filter(r => new Date(r.timestamp).getMonth() === now.getMonth());
    return data;
  }, [records, filterManager, timeRange, isAdmin, assigned]);

  const summaryData = useMemo(() => {
    const activeFilter = isAdmin ? filterManager : assigned;
    const isFiltered = activeFilter !== 'All';
    const groupKey = isFiltered ? 'shopName' : 'areaManager';
    const map = {};

    if (isFiltered) {
      shops.filter(s => s.manager === activeFilter).forEach(s => {
        map[s.name] = { 
          name: s.name, 
          gaAch: 0, 
          ocAch: 0, 
          workingHours: 0, 
          entryCount: 0,
          gaTarget: Number(targets[s.name]?.ga || 0), 
          ocTarget: Number(targets[s.name]?.oc || 0) 
        };
      });
    } else {
      managers.forEach(m => {
        let mGaT = 0; let mOcT = 0;
        shops.filter(s => s.manager === m).forEach(s => {
          mGaT += Number(targets[s.name]?.ga || 0); mOcT += Number(targets[s.name]?.oc || 0);
        });
        map[m] = { name: m, gaAch: 0, ocAch: 0, workingHours: 0, entryCount: 0, gaTarget: mGaT, ocTarget: mOcT };
      });
    }

    filteredRecords.forEach(r => {
      const key = r[groupKey];
      if (map[key]) {
        map[key].gaAch += (r.gaAch || 0);
        map[key].ocAch += (r.ocAch || 0);
        map[key].workingHours += Number(r.workingHours || 0);
        map[key].entryCount += 1;
      }
    });

    return Object.values(map);
  }, [filteredRecords, filterManager, shops, targets, managers, isAdmin, assigned]);

  const stats = useMemo(() => {
    const gaAch = summaryData.reduce((a, b) => a + b.gaAch, 0);
    const ocAch = summaryData.reduce((a, b) => a + b.ocAch, 0);
    const gaTarget = summaryData.reduce((a, b) => a + b.gaTarget, 0);
    const ocTarget = summaryData.reduce((a, b) => a + b.ocTarget, 0);
    return { gaAch, ocAch, gaTarget, ocTarget, gaP: gaTarget > 0 ? (gaAch / gaTarget) * 100 : 0, ocP: ocTarget > 0 ? (ocAch / ocTarget) * 100 : 0 };
  }, [summaryData]);

  const chartDataTrend = useMemo(() => {
    const dailyMap = {};
    filteredRecords.slice(0, 15).forEach(r => {
      const dateKey = new Date(r.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { name: dateKey, GA: 0, OC: 0 };
      dailyMap[dateKey].GA += r.gaAch;
      dailyMap[dateKey].OC += r.ocAch;
    });
    return Object.values(dailyMap).reverse();
  }, [filteredRecords]);

  const exportCSV = () => {
    const headers = ['Name', 'GA Target', 'GA Ach', 'GA %', 'GA Rem', 'OC Target', 'OC Ach', 'OC %', 'OC Rem', 'Avg Whs'];
    const rows = summaryData.map(d => [
      d.name, 
      d.gaTarget, 
      d.gaAch, 
      (d.gaTarget > 0 ? (d.gaAch/d.gaTarget*100).toFixed(1) : 0) + '%', 
      Math.max(0, d.gaTarget-d.gaAch), 
      d.ocTarget, 
      d.ocAch, 
      (d.ocTarget > 0 ? (d.ocAch/d.ocTarget*100).toFixed(1) : 0) + '%', 
      Math.max(0, d.ocTarget-d.ocAch),
      d.entryCount > 0 ? (d.workingHours / d.entryCount).toFixed(1) : 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "Sales_Summary.csv";
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <h2 className="text-4xl font-black text-slate-800 uppercase italic">Dashboard</h2>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
              <Filter size={16} className="text-slate-400" />
              <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold">
                <option value="All">All Regions</option>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
            <Calendar size={16} className="text-slate-400" />
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-transparent focus:outline-none font-bold">
              <option>Today</option><option>This Month</option><option>All Time</option>
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-2">
        <KPIBox title="GA ACHIEVEMENT" value={stats.gaAch} target={stats.gaTarget} progress={stats.gaP} color="rose" />
        <KPIBox title="OC ACHIEVEMENT" value={stats.ocAch} target={stats.ocTarget} progress={stats.ocP} color="blue" />
        <KPIBox title="OVERALL RATE" value={`${((stats.gaP + stats.ocP) / 2).toFixed(1)}%`} progress={(stats.gaP + stats.ocP) / 2} color="indigo" />
        <KPIBox title="LOGS" value={filteredRecords.length} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2 tracking-widest">
            <TrendingUp size={16} className="text-red-500" /> 15-Entry GA Trend
          </h3>
          <div className="h-[250px] w-full">
            <SimpleAreaChart data={chartDataTrend} color="#EF4444" dataKey="GA" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2 tracking-widest">
            <Activity size={16} className="text-blue-500" /> Manager GA Split
          </h3>
          <div className="flex-1 space-y-4">
            {summaryData.slice(0, 5).map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>{m.name}</span>
                  <span>{m.gaAch.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min((m.gaAch/Math.max(stats.gaAch, 1))*100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center print:p-4">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Activity size={22} className="text-red-500" /> Summary Matrix
          </h3>
          <div className="flex gap-2 print:hidden">
            <button onClick={exportCSV} className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-slate-200">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={() => window.print()} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg">
              <Printer size={16} /> Export PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px] print:min-w-0 print:text-[8px]">
            <thead className="bg-slate-900 text-slate-400">
              <tr className="text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5 print:px-2">Entity Name</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-400">GA Target</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-200">GA Ach.</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-red-500">GA %</th>
                <th className="px-4 py-5 text-right bg-red-950/20 text-white">GA Rem.</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-400">OC Target</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-200">OC Ach.</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-blue-500">OC %</th>
                <th className="px-4 py-5 text-right bg-blue-950/20 text-white">OC Rem.</th>
                <th className="px-4 py-5 text-right text-slate-300">Avg Whs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {summaryData.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-800 print:px-2">{d.name}</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-400">{d.gaTarget.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-sm font-black text-red-600">{d.gaAch.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs font-black text-red-700">{(d.gaTarget > 0 ? (d.gaAch/d.gaTarget*100).toFixed(1) : 0)}%</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-500">{Math.max(0, d.gaTarget-d.gaAch).toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-400">{d.ocTarget.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-sm font-black text-blue-600">{d.ocAch.toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs font-black text-blue-700">{(d.ocTarget > 0 ? (d.ocAch/d.ocTarget*100).toFixed(1) : 0)}%</td>
                  <td className="px-4 py-5 text-right text-xs text-slate-500">{Math.max(0, d.ocTarget-d.ocAch).toLocaleString()}</td>
                  <td className="px-4 py-5 text-right text-xs font-bold text-slate-800">{d.entryCount > 0 ? (d.workingHours / d.entryCount).toFixed(1) : 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-slate-900">
              <tr>
                <td className="px-8 py-5 uppercase text-[10px]">Grand Totals</td>
                <td className="px-4 py-5 text-right">{stats.gaTarget.toLocaleString()}</td>
                <td className="px-4 py-5 text-right text-red-600">{stats.gaAch.toLocaleString()}</td>
                <td className="px-4 py-5 text-right text-red-700">{stats.gaP.toFixed(1)}%</td>
                <td className="px-4 py-5 text-right">{Math.max(0, stats.gaTarget-stats.gaAch).toLocaleString()}</td>
                <td className="px-4 py-5 text-right">{stats.ocTarget.toLocaleString()}</td>
                <td className="px-4 py-5 text-right text-blue-600">{stats.ocAch.toLocaleString()}</td>
                <td className="px-4 py-5 text-right text-blue-700">{stats.ocP.toFixed(1)}%</td>
                <td className="px-4 py-5 text-right">{Math.max(0, stats.ocTarget-stats.ocAch).toLocaleString()}</td>
                <td className="px-4 py-5 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color }) {
  const bars = { rose: 'bg-red-500', blue: 'bg-blue-500', indigo: 'bg-indigo-500', slate: 'bg-slate-500' };
  return (
    <div className="p-7 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm print:p-2 print:rounded-lg">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <h4 className="text-3xl font-black text-slate-900 leading-none mb-5 print:text-base">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {target > 0 && <span className="text-xs text-slate-400 font-bold ml-2 print:hidden">/ {target.toLocaleString()}</span>}
      </h4>
      {progress !== undefined && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden print:h-1">
          <div className={`h-full ${bars[color]} transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

// --- SALES ENTRY ---
function SalesCollectionForm({ areaManagers, shops, user, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [formData, setFormData] = useState({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableShops = useMemo(() => {
    const mgr = isAdmin ? formData.areaManager : assigned;
    return mgr ? shops.filter(s => s.manager === mgr) : [];
  }, [formData.areaManager, shops, isAdmin, assigned]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        areaManager: isAdmin ? formData.areaManager : assigned,
        gaAch: Number(formData.gaAch) || 0, ocAch: Number(formData.ocAch) || 0, workingHours: Number(formData.workingHours) || 0, timestamp: Date.now(), submittedBy: user.uid 
      });
      setSuccess(true); setFormData({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-12 text-center uppercase">Daily Entry</h2>
      {success && <div className="bg-red-600 text-white p-6 rounded-[2rem] text-center font-black mb-8 shadow-2xl">LOGGED SUCCESSFUL</div>}
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Regional Context</label>
            <select required disabled={!isAdmin} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg disabled:opacity-60" value={isAdmin ? formData.areaManager : assigned} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              <option value="">Choose Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Target Location</label>
            <select required disabled={!isAdmin && !assigned} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-lg disabled:opacity-30" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Choose Shop</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-red-600">GA ACH</label>
            <input required type="number" className="w-full border-2 border-red-50 p-6 rounded-2xl font-black text-2xl text-red-600 outline-none" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">OC ACH</label>
            <input required type="number" className="w-full border-2 border-blue-50 p-6 rounded-2xl font-black text-2xl text-blue-600 outline-none" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-600">Working Hours</label>
            <input required type="number" placeholder="e.g. 8" className="w-full border-2 border-slate-50 p-6 rounded-2xl font-black text-2xl text-slate-700 outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          </div>
        </div>
        <textarea className="w-full border-2 border-slate-50 p-8 rounded-[2.5rem] font-medium h-40 bg-slate-50 outline-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Shift Notes..."/>
        <button type="submit" disabled={submitting || (!isAdmin && !assigned)} className="w-full bg-[#0F172A] text-white py-8 rounded-[2.5rem] font-black text-2xl hover:bg-black transition-all shadow-2xl disabled:opacity-50">
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <h2 className="text-4xl font-black text-slate-800 uppercase italic">Audit Log</h2>
        {role === 'admin' && (
          <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm text-sm">
            <Filter size={18} className="text-slate-400" />
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-transparent focus:outline-none font-bold">
              <option value="All">All Regions</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </header>
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl overflow-x-auto print:border-none print:shadow-none">
        <table className="w-full text-left min-w-[1200px] print:min-w-0 print:text-[8px]">
          <thead>
            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-black tracking-widest">
              <th className="px-6 py-5">Time</th><th className="px-6 py-5">Manager</th><th className="px-6 py-5">Date</th><th className="px-6 py-5">Location</th>
              <th className="px-4 py-5 text-right bg-red-950/20 text-red-400">GA Ach</th><th className="px-4 py-5 text-right bg-blue-950/20 text-blue-400">OC Ach</th>
              <th className="px-6 py-5">Whs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {filtered.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-[10px] font-black text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">{r.areaManager}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(r.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-black text-slate-900">{r.shopName}</td>
                <td className="px-4 py-4 text-right text-sm font-black text-red-600 bg-red-50/10">+{r.gaAch.toLocaleString()}</td>
                <td className="px-4 py-4 text-right text-sm font-black text-blue-600 bg-blue-50/10">+{r.ocAch.toLocaleString()}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.workingHours || 0}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TARGET SETTING ---
function TargetSetting({ shops, areaManagers, targets }) {
  const [editTarget, setEditTarget] = useState({ shop: '', ga: '', oc: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    if (!editTarget.shop) return;
    const updated = { ...targets, [editTarget.shop]: { ga: Number(editTarget.ga), oc: Number(editTarget.oc) } };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers, shops, targets: updated }, { merge: true });
    setEditTarget({ shop: '', ga: '', oc: '' });
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
            if (shops.some(s => s.name === name)) newTargets[name] = { ga, oc };
          }
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
        setStatus("Excel Targets Uploaded Success!");
        setTimeout(() => setStatus(null), 3000);
      } catch (err) { setStatus("Error processing file."); }
    };
    reader.readAsText(file);
  };

  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <header className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-slate-800 uppercase italic">Quota Management</h2>
        <label className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs cursor-pointer shadow-lg hover:bg-emerald-700 flex items-center gap-2">
          <Upload size={14} /> Import Targets CSV
          <input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} />
        </label>
      </header>
      
      {status && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl font-bold text-sm text-center border border-emerald-100">{status}</div>}

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6 max-w-2xl">
        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Manual Update</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="border-2 border-slate-50 p-4 rounded-xl font-bold bg-slate-50 text-sm" value={editTarget.shop} onChange={e => setEditTarget({...editTarget, shop: e.target.value})}>
            <option value="">Select Shop</option>
            {shops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="border-2 border-slate-50 p-4 rounded-xl font-bold bg-slate-50 text-sm" placeholder="GA Goal" value={editTarget.ga} onChange={e => setEditTarget({...editTarget, ga: e.target.value})} />
            <input type="number" className="border-2 border-slate-50 p-4 rounded-xl font-bold bg-slate-50 text-sm" placeholder="OC Goal" value={editTarget.oc} onChange={e => setEditTarget({...editTarget, oc: e.target.value})} />
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-red-600 text-white py-4 rounded-xl font-black shadow-lg">UPDATE QUOTA</button>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Search size={18} className="text-slate-300" />
          <input type="text" placeholder="Search targets..." className="flex-1 font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase">
            <tr><th className="px-8 py-5">Shop</th><th className="px-8 py-5">Manager</th><th className="px-8 py-5 text-right">GA Goal</th><th className="px-8 py-5 text-right">OC Goal</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {filteredShops.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-black text-slate-800">{s.name}</td>
                <td className="px-8 py-5 text-xs font-bold text-slate-400">{s.manager}</td>
                <td className="px-8 py-5 text-right font-black text-red-600">{(targets[s.name]?.ga || 0).toLocaleString()}</td>
                <td className="px-8 py-5 text-right font-black text-blue-600">{(targets[s.name]?.oc || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TEAM MANAGEMENT ---
function UserSearch({ users, managers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user', assignedManager: '' });

  const handleUpdate = async (uid) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), editForm);
    setEditingId(null);
  };

  const handleDeleteUser = async (uid) => {
    if (confirm("Permanently delete this user profile? Data associated with this UID will be lost.")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
    }
  };

  const filtered = users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <header><h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">Team Management</h2></header>
      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input type="text" placeholder="Lookup members..." className="w-full bg-white border p-6 pl-14 rounded-[2rem] font-bold shadow-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(u => (
          <div key={u.uid} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col gap-4 group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase text-xl">{u.username?.charAt(0)}</div>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-lg">{u.username}</p>
                <span className={`text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-purple-600' : 'text-slate-400'}`}>{u.role}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(u.uid); setEditForm({ username: u.username, role: u.role, assignedManager: u.assignedManager || '' }); }} className="text-slate-400 hover:text-red-600 p-2"><UserCog size={18} /></button>
                <button onClick={() => handleDeleteUser(u.uid)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
              </div>
            </div>
            {editingId === u.uid ? (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-3 rounded-xl bg-white border font-bold text-xs"><option value="user">USER</option><option value="admin">ADMIN</option></select>
                <select value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})} className="w-full p-3 rounded-xl bg-white border font-bold text-xs"><option value="">Unassigned</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-red-600 text-white p-2 rounded-xl font-black text-xs">SAVE</button>
                  <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 rounded-xl font-black text-xs text-slate-600">X</button>
                </div>
              </div>
            ) : (
              u.assignedManager && <p className="text-[10px] font-bold text-red-600 italic uppercase">Assigned: {u.assignedManager}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SYSTEM ADMIN ---
function AdminDashboard({ areaManagers, shops, targets }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');

  const updateConfig = async (m, s) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets });
  };

  return (
    <div className="space-y-10 pb-20">
      <header><h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">System Configuration</h2></header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Add Manager</h3>
          <div className="flex gap-2">
            <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold" placeholder="Manager Name" />
            <button onClick={() => { if(newManager) updateConfig([...areaManagers, newManager], null); setNewManager(''); }} className="bg-red-600 text-white px-6 rounded-xl font-black shadow-lg">ADD</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">{areaManagers.map((m, i) => <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 text-xs"><span>{m}</span><button onClick={() => updateConfig(areaManagers.filter(x => x !== m))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>)}</div>
        </section>
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Link Shop to Manager</h3>
          <div className="flex flex-col gap-2">
            <input value={newShop} onChange={e => setNewShop(e.target.value)} className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold" placeholder="Location Name" />
            <div className="flex gap-2">
              <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="flex-1 bg-slate-50 border-none p-4 rounded-xl font-bold"><option value="">Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <button onClick={() => { if(newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); }} className="bg-red-600 text-white px-6 rounded-xl font-black shadow-lg">LINK</button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">{shops.map((s, i) => <div key={i} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center"><span className="font-black text-slate-800 text-sm">{s.name} <span className="text-[9px] text-slate-400 ml-2">({s.manager})</span></span><button onClick={() => updateConfig(null, shops.filter(x => x.name !== s.name))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>)}</div>
        </section>
      </div>
    </div>
  );
}

// --- AUTH ---
function LoginPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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
      <div className="w-full max-w-md bg-white rounded-[3rem] p-12 shadow-2xl text-center">
        <h1 className="text-4xl font-black text-slate-800 italic uppercase mb-2 tracking-tighter">Portal</h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-10 italic">
          {isSignUp ? 'Create New Account' : 'Secure Sales Entry'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Email</label>
            <input required type="email" placeholder="email@company.com" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-slate-100 focus:border-red-500" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Password</label>
            <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-slate-100 focus:border-red-500" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
          <button disabled={loading} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-red-700 transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
          </button>
        </form>
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
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
    setUserProfile(profile); setView('dashboard');
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-6 italic uppercase">Set Profile Name</h2>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full border-2 bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center outline-none" />
        <button onClick={handleSave} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black shadow-lg">CONTINUE</button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'History', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40 print:hidden">
      <div className="mb-10 p-2 font-black italic text-2xl text-white tracking-tighter">PORTAL</div>
      <div className="space-y-1 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${view === link.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'hover:bg-slate-800'}`}>
            <link.icon size={20} /> <span className="font-bold text-sm tracking-tight">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all font-black text-sm uppercase">
        <LogOut size={20} /> Sign Out
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4 md:hidden z-50 print:hidden">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-2xl ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}><item.icon size={26} /></button>
      ))}
    </div>
  );
}
