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
  sendPasswordResetEmail,
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
  Activity,
  FileSpreadsheet,
  KeyRound,
  ArrowLeft,
  Clock,
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

// Initialize Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
}

const appId = 'cashshop-sales-v1';

// --- Helper Functions ---

const parseHoursFromStr = (str) => {
  if (!str) return 0;
  try {
    const parts = str.split('-').map(p => p.trim());
    if (parts.length !== 2) return 0;
    
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    
    let diff = end - start;
    if (diff < 0) diff += 24; // Handle overnight shifts
    return diff;
  } catch (e) {
    return 0;
  }
};

// --- Custom SVG Chart Components ---

const ManagerBarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">No comparative data</div>;
  
  const height = 200;
  const width = 600;
  const maxVal = Math.max(...data.map(d => Math.max(d.ga, d.oc)), 1);
  const barWidth = (width / data.length) * 0.6;
  const spacing = (width / data.length) * 0.4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {data.map((d, i) => {
        const x = i * (barWidth + spacing);
        const gaHeight = (d.ga / maxVal) * (height - 40);
        const ocHeight = (d.oc / maxVal) * (height - 40);
        
        return (
          <g key={i}>
            {/* GA Bar */}
            <rect 
              x={x} 
              y={height - gaHeight - 20} 
              width={barWidth / 2} 
              height={gaHeight} 
              fill="#EF4444" 
              rx="2"
            />
            {/* OC Bar */}
            <rect 
              x={x + barWidth / 2 + 2} 
              y={height - ocHeight - 20} 
              width={barWidth / 2} 
              height={ocHeight} 
              fill="#3B82F6" 
              rx="2"
            />
            <text 
              x={x + barWidth / 2} 
              y={height} 
              textAnchor="middle" 
              fontSize="10" 
              fontWeight="900" 
              fill="#94A3B8"
              className="uppercase tracking-tighter"
            >
              {d.name.substring(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

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
        const COLORS = ['#EF4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
        return <path key={i} d={pathData} fill={COLORS[i % COLORS.length]} />;
      })}
    </svg>
  );
};

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
          const data = userDoc.data();
          setUserProfile(data);
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
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
      }
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
        {view === 'dashboard' && <Dashboard records={salesRecords} targets={targets} shops={shops} managers={areaManagers} userProfile={userProfile} />}
        {view === 'collection' && <SalesCollectionForm areaManagers={areaManagers} shops={shops} user={user} db={db} appId={appId} userProfile={userProfile} />}
        {view === 'reports' && <SalesList records={salesRecords} targets={targets} shops={shops} managers={areaManagers} role={userProfile?.role} db={db} appId={appId} />}
        {view === 'targets' && userProfile?.role === 'admin' && <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />}
        {view === 'admin' && userProfile?.role === 'admin' && <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />}
        {view === 'userSearch' && userProfile?.role === 'admin' && <UserSearch users={allUsers} db={db} appId={appId} managers={areaManagers} />}
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

  const managerSummary = useMemo(() => {
    const summary = managers.map(m => {
      const mgrRecords = filteredRecords.filter(r => r.areaManager === m);
      const mgrShops = shops.filter(s => s.manager === m);
      
      let totalTargetGA = 0;
      let totalTargetOC = 0;
      mgrShops.forEach(s => {
        totalTargetGA += (targets[s.name]?.ga || 0);
        totalTargetOC += (targets[s.name]?.oc || 0);
      });

      const totalAchGA = mgrRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
      const totalAchOC = mgrRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
      const totalHours = mgrRecords.reduce((acc, r) => acc + parseHoursFromStr(r.workingHours), 0);
      const avgHours = mgrRecords.length > 0 ? (totalHours / mgrRecords.length).toFixed(1) : 0;

      return {
        name: m,
        ga: totalAchGA,
        oc: totalAchOC,
        targetGA: totalTargetGA,
        targetOC: totalTargetOC,
        gaProgress: totalTargetGA > 0 ? ((totalAchGA / totalTargetGA) * 100).toFixed(1) : 0,
        ocProgress: totalTargetOC > 0 ? ((totalAchOC / totalTargetOC) * 100).toFixed(1) : 0,
        avgHours,
        entries: mgrRecords.length
      };
    });
    return summary;
  }, [filteredRecords, managers, shops, targets]);

  const stats = useMemo(() => {
    const totalGA = filteredRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
    let targetGA = 0; let targetOC = 0;
    
    const managerToFilter = isAdmin ? filterManager : assignedManager;
    const activeShopNames = filterShop === 'All' ? shops.filter(s => managerToFilter === 'All' || s.manager === managerToFilter).map(s => s.name) : [filterShop];
    
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

  const exportSummaryCSV = () => {
    const headers = ['Manager', 'GA Achieved', 'GA Target', 'GA %', 'OC Achieved', 'OC Target', 'OC %', 'Avg Working Hours', 'Entries'];
    const rows = managerSummary.map(m => [
      m.name, m.ga, m.targetGA, m.gaProgress + '%', m.oc, m.targetOC, m.ocProgress + '%', m.avgHours, m.entries
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Manager_Summary_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 sticky top-0 z-10 no-print">
        <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
          <Activity size={18} className="text-red-500" />
          <h2 className="font-black uppercase text-sm tracking-tight">Analytics</h2>
        </div>
        {isAdmin && (
          <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
          <option value="All">All Shops</option>
          {shops.filter(s => (isAdmin ? filterManager : assignedManager) === 'All' || s.manager === (isAdmin ? filterManager : assignedManager)).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-xs font-bold p-2 bg-slate-50 rounded-lg outline-none">
           <option value="Today">Today</option><option value="This Month">This Month</option><option value="All Time">All Time</option>
        </select>
        <div className="ml-auto flex gap-2">
           <button onClick={exportSummaryCSV} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:text-green-600 transition-all"><FileSpreadsheet size={18}/></button>
           <button onClick={() => window.print()} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:text-red-600 transition-all"><Printer size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox title="GA Achieved" value={stats.totalGA} target={stats.targetGA} progress={stats.gaAchieved} color="#EF4444" />
        <KPIBox title="OC Achieved" value={stats.totalOC} target={stats.targetOC} progress={stats.ocAchieved} color="#3b82f6" />
        <KPIBox title="Average Progress" value={`${((stats.gaAchieved + stats.ocAchieved) / 2).toFixed(1)}%`} progress={(stats.gaAchieved + stats.ocAchieved) / 2} color="#8b5cf6" />
        <KPIBox title="Total Entries" value={filteredRecords.length} subtext="Entries recorded" color="#64748b" />
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
           <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-red-500" /> Manager Performance Benchmarking
          </h3>
          <div className="h-[250px] w-full">
            <ManagerBarChart data={managerSummary} />
          </div>
          <div className="mt-4 flex justify-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> GA</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> OC</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-700 text-xs uppercase mb-6 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Regional Availability (Avg Shift Hours)
          </h3>
          <div className="space-y-4">
            {managerSummary.map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span>{m.name}</span>
                  <span className="text-blue-600">{m.avgHours} hrs</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min((m.avgHours / 12) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black italic tracking-tighter">Managerial Intelligence Summary</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Matrix aggregated by personnel</p>
          </div>
          <Download size={20} className="text-slate-200 no-print" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-8 py-5">Area Manager</th>
                <th className="px-6 py-5 text-center">GA Progress</th>
                <th className="px-6 py-5 text-center">OC Progress</th>
                <th className="px-6 py-5 text-center">Avg Shift</th>
                <th className="px-6 py-5 text-center">Data Points</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-bold tabular-nums">
              {managerSummary.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 text-slate-900 font-black">{m.name}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-red-600">{m.ga} / {m.targetGA}</span>
                      <div className="w-20 h-1 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(m.gaProgress, 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400">{m.gaProgress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-blue-600">{m.oc} / {m.targetOC}</span>
                      <div className="w-20 h-1 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(m.ocProgress, 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400">{m.ocProgress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-slate-500">{m.avgHours} hrs</td>
                  <td className="px-6 py-5 text-center text-slate-400">{m.entries} records</td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${(m.gaProgress + m.ocProgress) / 2 >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {(m.gaProgress + m.ocProgress) / 2 >= 80 ? 'Peak' : 'Review'}
                    </span>
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

function KPIBox({ title, value, target, progress, color, subtext }) {
  const isUp = progress >= 100;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 group relative overflow-hidden">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
      <div className="flex items-baseline gap-2 mb-4">
        <h4 className="text-3xl font-black text-slate-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-bold italic">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined ? (
        <div className="space-y-2">
          <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-red-600' : 'text-slate-400'}`}>
            {progress.toFixed(1)}%
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-slate-400 uppercase">{subtext}</p>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-slate-500 font-bold tracking-tighter">CashShop Systems Cloud...</p>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage("Recovery sequence initiated. Check your inbox.");
        setLoading(false);
        return;
      }
    } catch (err) {
      const errMsg = err.message.replace('Firebase:', '').trim();
      setError(errMsg || "Verification Failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px]"></div>
        
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-slate-50 rounded-3xl mb-4">
            {authMode === 'forgot' ? <KeyRound size={32} className="text-red-600" /> : <ShieldCheck size={32} className="text-red-600" />}
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">CashShop Sales</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            {authMode === 'forgot' ? 'Credential Recovery' : 'Salesforce Portal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required type="email" placeholder="user@pyramids.com" 
                className="w-full bg-slate-50 border border-slate-100 p-5 pl-14 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                value={email} onChange={e => setEmail(e.target.value)} 
              />
            </div>
          </div>

          {authMode !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Security Key</label>
                <button type="button" onClick={() => setAuthMode('forgot')} className="text-[9px] font-black uppercase text-red-600 hover:tracking-widest transition-all">Forgot Key?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required type="password" placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-100 p-5 pl-14 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                  value={password} onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>
          )}

          {error && <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black text-center border border-red-100 animate-shake">{error}</div>}
          {message && <div className="p-4 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black text-center border border-green-100">{message}</div>}

          <button disabled={loading} className="w-full bg-[#0F172A] text-white py-6 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : (
              authMode === 'signup' ? 'Create Account' : 
              authMode === 'forgot' ? 'Send Link' : 'Secure Access'
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors">
            {authMode === 'login' ? "Unauthorized? Create Account" : "Registered? Login Now"}
          </button>
          {authMode === 'forgot' && (
            <button onClick={() => setAuthMode('login')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
              <ArrowLeft size={14} /> Back to Entry
            </button>
          )}
        </div>
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
    const profile = { username: name, role: 'user', assignedManager: '', createdAt: Date.now() };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile);
    setUserProfile(profile);
    setView('dashboard');
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 shadow-xl text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
           <UserIcon size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2 italic">Profile Activation</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">Enter your official full name</p>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl font-black mb-8 text-center text-xl outline-none focus:ring-4 focus:ring-red-500/5 transition-all" placeholder="John Doe" />
        <button onClick={handleSave} disabled={loading || !name} className="w-full bg-red-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-red-600/20 active:scale-95 transition-all">Proceed to Cloud</button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Intelligence', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Benchmarks', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Personnel', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'System Admin', icon: Settings, roles: ['admin'] },
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-8 z-40">
      <div className="mb-14 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg italic">CS</div>
        <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">CashShop</h1>
      </div>
      <div className="space-y-2 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${view === link.id ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <link.icon size={20} className={view === link.id ? 'text-white' : 'text-slate-500'} /> <span className="font-bold text-sm">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 font-black text-sm transition-all border border-transparent hover:border-red-500/20">
        <LogOut size={20} /> Logout
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}, {id:'userSearch', icon:UsersIcon, roles:['admin']}];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4 md:hidden z-50 rounded-t-3xl shadow-2xl">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-2xl transition-all ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-300'}`}>
          <item.icon size={24} />
        </button>
      ))}
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, user, db, appId, userProfile }) {
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
    <div className="max-w-xl mx-auto py-10">
      <h2 className="text-4xl font-black text-slate-900 mb-10 text-center italic tracking-tighter">New Intelligence Entry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Manager</label>
            <select 
              required 
              disabled={!isAdmin}
              className="w-full bg-slate-50 p-5 rounded-2xl font-bold disabled:opacity-50 border border-slate-100 outline-none" 
              value={isAdmin ? formData.areaManager : assigned} 
              onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}
            >
              <option value="">Select Personnel</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Shop Location</label>
            <select 
              required 
              disabled={!isAdmin && !assigned}
              className="w-full bg-slate-50 p-5 rounded-2xl font-bold disabled:opacity-50 border border-slate-100 outline-none" 
              value={formData.shopName} 
              onChange={e => setFormData({...formData, shopName: e.target.value})}
            >
              <option value="">Select Location</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Shift Schedule</label>
            <input required type="text" placeholder="HH:MM - HH:MM" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-slate-100 outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2">GA Achieved</label>
            <input required type="number" className="w-full bg-red-50 p-8 rounded-3xl text-3xl font-black text-red-600 outline-none text-center border border-red-100" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-2">OC Achieved</label>
            <input required type="number" className="w-full bg-blue-50 p-8 rounded-3xl text-3xl font-black text-blue-600 outline-none text-center border border-blue-100" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>
        <textarea placeholder="Observation Notes..." className="w-full bg-slate-50 p-5 rounded-2xl min-h-[120px] font-medium border border-slate-100 outline-none focus:ring-4 focus:ring-red-500/5 transition-all" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        <button type="submit" disabled={submitting || (!isAdmin && !assigned)} className="w-full bg-[#0F172A] text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-slate-900/10 disabled:opacity-30 active:scale-95 transition-all">
          {!isAdmin && !assigned ? 'Assignment Restricted' : (submitting ? 'Encrypting...' : 'Secure Submit')}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role, db, appId }) {
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
    if (confirm("Permanently erase this record from history?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', id)); 
  };

  const exportToExcel = () => {
    const headers = [
      'Time Stamp', 'Area Manager', 'Date', 'Shop Name', 
      'GA Target', 'GA Ach', 'GA %', 'GA Remaining', 
      'OC Target', 'OC Ach', 'OC %', 'OC Remaining', 'Notes'
    ];
    
    const rows = filtered.map(r => {
      const target = targets[r.shopName] || { ga: 0, oc: 0 };
      const shopTotals = shopAggregates[r.shopName] || { totalGA: 0, totalOC: 0 };
      const gaPercent = target.ga > 0 ? ((shopTotals.totalGA / target.ga) * 100).toFixed(1) : '0';
      const ocPercent = target.oc > 0 ? ((shopTotals.totalOC / target.oc) * 100).toFixed(1) : '0';

      return [
        new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        r.areaManager,
        new Date(r.timestamp).toLocaleDateString(),
        r.shopName,
        target.ga,
        r.gaAch,
        gaPercent + '%',
        Math.max(0, target.ga - shopTotals.totalGA),
        target.oc,
        r.ocAch,
        ocPercent + '%',
        Math.max(0, target.oc - shopTotals.totalOC),
        r.note || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Audit_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Audit Logs</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Operational Data & Performance Audit</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input type="date" className="bg-white p-3 rounded-2xl text-xs border border-slate-100 shadow-sm font-black outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="bg-white p-3 rounded-2xl text-xs border border-slate-100 shadow-sm font-black outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <select value={filterManager} onChange={e => {setFilterManager(e.target.value); setFilterShop('All')}} className="bg-white px-6 py-3 border border-slate-100 rounded-2xl font-black text-xs shadow-sm outline-none">
            <option value="All">All Leads</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#0F172A] text-white px-6 py-3 rounded-2xl font-black text-[11px] hover:bg-black shadow-lg transition-all active:scale-95">
            <FileSpreadsheet size={16} /> Export Intelligence
          </button>
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[1400px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-8 py-6">Date / Timestamp</th>
              <th className="px-8 py-6">Location</th>
              <th className="px-6 py-6 text-red-500 text-center bg-red-50/20">GA Goal</th>
              <th className="px-6 py-4 text-red-500 text-center bg-red-50/20">GA Ach</th>
              <th className="px-6 py-4 text-red-500 text-center bg-red-50/20">GA %</th>
              <th className="px-6 py-5 text-blue-500 text-center bg-blue-50/20">OC Goal</th>
              <th className="px-6 py-4 text-blue-500 text-center bg-blue-50/20">OC Ach</th>
              <th className="px-6 py-4 text-blue-500 text-center bg-blue-50/20">OC %</th>
              <th className="px-8 py-5">Personnel</th>
              {role === 'admin' && <th className="px-8 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y text-[11px] font-bold divide-slate-50">
            {filtered.map(r => {
              const target = targets[r.shopName] || { ga: 0, oc: 0 };
              const shopTotals = shopAggregates[r.shopName] || { totalGA: 0, totalOC: 0 };
              const gaPercent = target.ga > 0 ? ((shopTotals.totalGA / target.ga) * 100).toFixed(0) : '0';
              const ocPercent = target.oc > 0 ? ((shopTotals.totalOC / target.oc) * 100).toFixed(0) : '0';

              return (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-all tabular-nums">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-slate-900 text-sm font-black tracking-tight">{new Date(r.timestamp).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-800 font-black tracking-tighter text-[13px]">{r.shopName}</td>
                  
                  {/* GA STATS */}
                  <td className="px-4 py-4 text-center bg-red-50/10 text-slate-400">{target.ga}</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-red-600 font-black text-sm">+{r.gaAch}</td>
                  <td className="px-4 py-4 text-center bg-red-50/10 text-red-700">{gaPercent}%</td>

                  {/* OC STATS */}
                  <td className="px-4 py-4 text-center bg-blue-50/10 text-slate-400">{target.oc}</td>
                  <td className="px-4 py-4 text-center bg-blue-50/10 text-blue-600 font-black text-sm">+{r.ocAch}</td>
                  <td className="px-4 py-4 text-center bg-blue-50/10 text-blue-700">{ocPercent}%</td>

                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">{r.areaManager.charAt(0)}</div>
                      <span className="text-slate-500 uppercase tracking-tighter text-[10px]">{r.areaManager}</span>
                    </div>
                  </td>
                  {role === 'admin' && <td className="px-8 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="p-3 text-slate-200 hover:text-red-500 transition-all hover:bg-red-50 rounded-2xl">
                      <Trash2 size={16} />
                    </button>
                  </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TargetSetting({ shops, areaManagers, targets, db, appId }) {
  const [filterManager, setFilterManager] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const filteredShops = useMemo(() => 
    shops.filter(s => 
      (filterManager === 'All' || s.manager === filterManager) && 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [shops, filterManager, searchTerm]
  );

  const handleInlineSave = async (shopName, field, value) => {
    const val = Number(value);
    const newTargets = { 
      ...targets, 
      [shopName]: { 
        ...targets[shopName], 
        [field]: val 
      } 
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
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
        setStatus("Target Matrix Updated via Bulk Load");
        setTimeout(() => setStatus(null), 3000);
      } catch (err) { setStatus("Sync Failure: Validate CSV format"); }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 italic">Benchmark Matrix</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Operational Goal Synchronizer</p>
        </div>
        <div className="flex items-center gap-3">
           <label className="bg-[#0F172A] text-white px-8 py-4 rounded-2xl text-[11px] font-black cursor-pointer flex items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95">
             <Upload size={18} /> {loading ? 'Synchronizing...' : 'Bulk Excel Load'}
             <input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} disabled={loading} />
           </label>
        </div>
      </header>
      
      {status && <div className="bg-red-600 text-white p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">{status}</div>}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
          <input type="text" placeholder="Filter by Location Name..." className="w-full bg-white p-6 pl-16 rounded-[2.5rem] shadow-sm outline-none border border-slate-100 font-bold focus:ring-4 focus:ring-red-500/5 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="bg-white px-8 py-4 rounded-[2.5rem] shadow-sm font-black text-xs border border-slate-100 outline-none">
          <option value="All">All Lead Regions</option>
          {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400">
            <tr className="text-[10px] font-black uppercase tracking-widest">
              <th className="px-10 py-8">Location Node</th>
              <th className="px-10 py-8">Regional Manager</th>
              <th className="px-10 py-8 text-center bg-red-950/20 text-red-400">GA Daily Goal</th>
              <th className="px-10 py-8 text-center bg-blue-950/20 text-blue-400">OC Daily Goal</th>
              <th className="px-10 py-8 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredShops.length === 0 ? (
              <tr><td colSpan="5" className="p-32 text-center text-slate-300 font-black italic uppercase tracking-widest text-sm">No active nodes identified</td></tr>
            ) : filteredShops.map((shop, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-10 py-8">
                  <span className="font-black text-slate-900 text-lg tracking-tighter">{shop.name}</span>
                </td>
                <td className="px-10 py-8">
                   <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 tracking-tighter">{shop.manager}</span>
                </td>
                <td className="px-10 py-8 bg-red-50/10">
                  <div className="flex justify-center">
                    <input 
                      type="number" 
                      className="w-32 bg-white border border-red-100 p-4 rounded-2xl text-center font-black text-red-600 text-xl focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                      defaultValue={targets[shop.name]?.ga || 0}
                      onBlur={(e) => handleInlineSave(shop.name, 'ga', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-10 py-8 bg-blue-50/10">
                  <div className="flex justify-center">
                    <input 
                      type="number" 
                      className="w-32 bg-white border border-blue-100 p-4 rounded-2xl text-center font-black text-blue-600 text-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      defaultValue={targets[shop.name]?.oc || 0}
                      onBlur={(e) => handleInlineSave(shop.name, 'oc', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-10 py-8 text-right">
                  <div className="flex justify-end">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 border border-green-100 shadow-sm">
                       <Check size={20} />
                    </div>
                  </div>
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
    if (!confirm("Terminate this personnel profile from systems?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-4xl font-black uppercase tracking-tighter italic">Personnel Registry</h2>
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"/>
        <input type="text" placeholder="Filter by Name / Title..." className="w-full bg-white p-6 pl-16 rounded-[2.5rem] shadow-sm outline-none border focus:ring-4 focus:ring-red-500/5 font-black transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(u => (
          <div key={u.uid} className={`bg-white p-10 rounded-[4rem] border transition-all duration-300 relative group ${editingId === u.uid ? 'border-red-500 shadow-2xl shadow-red-500/10' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center font-black text-slate-300 text-4xl uppercase border-4 border-white shadow-lg">{u.username?.charAt(0)}</div>
              <div className="text-center flex-1 space-y-2">
                {editingId === u.uid ? 
                  <input className="w-full font-black text-center text-xl border-b-2 border-red-500 outline-none py-1 bg-transparent" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /> : 
                  <p className="font-black text-slate-900 text-2xl tracking-tighter">{u.username}</p>
                }
                <div className="flex flex-col items-center gap-1">
                   <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${u.role === 'admin' ? 'text-red-600' : 'text-slate-400'}`}>{u.role.toUpperCase()}</span>
                   {u.assignedManager && (
                      <p className="text-[10px] font-bold text-slate-300 uppercase italic">Region: {u.assignedManager}</p>
                   )}
                </div>
              </div>
              <button onClick={() => handleDeleteUser(u.uid)} className="absolute top-8 right-8 text-slate-200 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-50">
              {editingId === u.uid ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400 px-1">Clearance Level</label>
                     <select className="w-full bg-slate-50 rounded-2xl p-5 text-xs font-bold border-none outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                       <option value="user">Operational User</option>
                       <option value="admin">System Administrator</option>
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400 px-1">Regional Assignment</label>
                     <select className="w-full bg-slate-50 rounded-2xl p-5 text-xs font-bold border-none outline-none" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                       <option value="">No Global Assignment</option>
                       {managers.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-red-600 text-white py-5 rounded-2xl shadow-xl shadow-red-600/20 flex justify-center hover:bg-red-700 transition-all">
                      {updating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-400 p-5 rounded-2xl hover:bg-slate-200 transition-all"><X size={20}/></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => {setEditingId(u.uid); setEditForm({username: u.username, role: u.role, assignedManager: u.assignedManager || ''})}} className="w-full bg-slate-50 text-slate-500 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                  <UserCog size={16} /> Assign Region & Edit
                </button>
              )}
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
    if (!confirm(`Permanently decommission manager "${name}"? Shop links will be dissolved.`)) return;
    const updatedM = areaManagers.filter(m => m !== name);
    const updatedS = shops.filter(s => s.manager !== name);
    updateConfig(updatedM, updatedS);
  };

  const handleDeleteShop = (name) => {
    if (!confirm(`Permanently dismantle shop node "${name}"?`)) return;
    const updatedS = shops.filter(s => s.name !== name);
    updateConfig(null, updatedS);
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      <header><h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Infrastructure</h2></header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2"><UserPlus className="text-red-600" size={28} /><h3 className="font-black text-slate-800 tracking-tight uppercase text-lg">Lead Activation</h3></div>
          <div className="flex gap-3">
            <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-red-500/5 transition-all" placeholder="Enter Full Name" />
            <button onClick={handleAddManager} className="bg-red-600 text-white px-8 py-5 rounded-2xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all">Add</button>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2"><Store className="text-red-600" size={28} /><h3 className="font-black text-slate-800 tracking-tight uppercase text-lg">Node Deployment</h3></div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-red-500/5 transition-all" placeholder="Location Code" />
            <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none cursor-pointer">
              <option value="">Select Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => { if (newShop && assignManager) updateConfig(null, [...shops, {name: newShop, manager: assignManager}]); setNewShop(''); }} className="bg-[#0F172A] text-white px-10 py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">Link</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest">Regional Personnel</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest">Shop Node</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shops.length === 0 ? (
              <tr><td colSpan="3" className="p-32 text-center text-slate-300 font-black italic uppercase tracking-widest text-sm">No active shop nodes identified</td></tr>
            ) : shops.map((shop, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-10 py-8">
                  {editingManager === shop.manager ? (
                    <div className="flex items-center gap-3">
                      <input className="bg-white border-b-2 border-red-500 font-black outline-none p-2 text-xl tracking-tighter" value={editValue} onChange={e => setEditValue(e.target.value)} />
                      <button onClick={() => saveEditManager(shop.manager)} className="text-green-500 bg-green-50 p-3 rounded-xl"><Check size={20} /></button>
                      <button onClick={() => setEditingManager(null)} className="text-slate-300 bg-slate-50 p-3 rounded-xl"><X size={20} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="font-black text-slate-900 text-2xl tracking-tighter italic">{shop.manager}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                        <button onClick={() => handleEditManager(shop.manager)} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteManager(shop.manager)} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-10 py-8 font-black text-slate-500 text-lg tracking-tight">{shop.name}</td>
                <td className="px-10 py-8 text-right">
                  <button onClick={() => handleDeleteShop(shop.name)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
