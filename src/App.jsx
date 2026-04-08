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
  BarChart3,
  Target,
  LogOut,
  ShieldCheck,
  Edit3,
  Check,
  UserPlus,
  FileSpreadsheet,
  Activity,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  CalendarRange,
  Archive,
  History
} from 'lucide-react';

// --- Global Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAYb6zn5YulU9Ght-3T2vHFzdbOL94GYqs",
      authDomain: "pyramids-sales.firebaseapp.com",
      projectId: "pyramids-sales",
      storageBucket: "pyramids-sales.firebasestorage.app",
      messagingSenderId: "658795707959",
      appId: "1:658795707959:web:76e44a85011105fd2949b2",
      measurementId: "G-MMZ18E15FX"
    };

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'pyramids-sales-v1';
const appId = rawAppId.replace(/\//g, '_');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper: Get current month string (YYYY-MM)
const getCurrentMonth = () => new Date().toISOString().substring(0, 7);

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

  // (1) Handle Authentication Logic
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Init Error:", err);
      }
    };
    initAuth();

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

  // (2) Fetch User Profile and Redirect
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
          // If user has no manager assigned and isn't admin, keep in waiting
          if (data.role !== 'admin' && !data.assignedManager) {
            setView('waiting');
          } else {
            setView('dashboard');
          }
        } else {
          setView('onboarding');
        }
      } catch (e) {
        console.error("Profile Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // (3) Real-time Data Listeners
  useEffect(() => {
    if (!user || !userProfile) return;

    // Listen to System Config (Managers, Shops, Targets)
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAreaManagers(data.areaManagers || []);
        setShops(data.shops || []);
        setTargets(data.targets || {});
      }
    });

    // Listen to Sales Collection
    const unsubSales = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      // Filter Visibility: Admin sees all, Manager sees assigned region
      if (userProfile.role === 'admin') {
        setSalesRecords(sorted);
      } else {
        setSalesRecords(sorted.filter(r => r.areaManager === userProfile.assignedManager));
      }
    });

    // Listen to User Directory (Admin Only)
    let unsubUsers = () => {};
    if (userProfile.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
      });
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
        {view === 'dashboard' && (
          <Dashboard 
            setView={setView} 
            records={salesRecords} 
            targets={targets} 
            shops={shops} 
            managers={areaManagers} 
            userProfile={userProfile} 
          />
        )}
        {view === 'archive' && (
          <SalesArchive 
            records={salesRecords} 
            shops={shops} 
            managers={areaManagers} 
            userProfile={userProfile} 
          />
        )}
        {view === 'collection' && (
          <SalesCollectionForm 
            areaManagers={areaManagers} 
            shops={shops} 
            user={user} 
            db={db} 
            appId={appId} 
            userProfile={userProfile} 
          />
        )}
        {view === 'reports' && (
          <SalesList 
            records={salesRecords} 
            targets={targets} 
            shops={shops} 
            managers={areaManagers} 
            role={userProfile?.role} 
            db={db} 
            appId={appId} 
            userProfile={userProfile} 
          />
        )}
        {view === 'analytics' && (
          <ShopsAnalytics 
            records={salesRecords} 
            shops={shops} 
            managers={areaManagers} 
            userProfile={userProfile} 
          />
        )}
        {view === 'targets' && userProfile?.role === 'admin' && (
          <TargetSetting 
            shops={shops} 
            areaManagers={areaManagers} 
            targets={targets} 
            db={db} 
            appId={appId} 
          />
        )}
        {view === 'admin' && userProfile?.role === 'admin' && (
          <AdminDashboard 
            areaManagers={areaManagers} 
            shops={shops} 
            targets={targets} 
            db={db} 
            appId={appId} 
          />
        )}
        {view === 'userSearch' && userProfile?.role === 'admin' && (
          <UserSearch 
            users={allUsers} 
            db={db} 
            appId={appId} 
            managers={areaManagers} 
          />
        )}
      </main>

      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ setView, records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assigned);
  const currentMonthStr = getCurrentMonth();

  // Filter ONLY current month for the Dashboard display
  const currentMonthRecords = useMemo(() => {
    let data = records.filter(r => r.date && r.date.startsWith(currentMonthStr));
    const managerToFilter = isAdmin ? filterManager : assigned;
    if (managerToFilter && managerToFilter !== 'All') {
      data = data.filter(r => r.areaManager === managerToFilter);
    }
    return data;
  }, [records, filterManager, isAdmin, assigned, currentMonthStr]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const relevantShops = (isAdmin && filterManager === 'All') ? shops : shops.filter(s => s.manager === filterManager);
    const shopNames = relevantShops.map(s => s.name);
    
    // Check which shops registered today
    const activeTodayCount = [...new Set(records.filter(r => r.date === today && shopNames.includes(r.shopName)).map(r => r.shopName))].length;
    
    return {
      totalGA: currentMonthRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0),
      totalOC: currentMonthRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0),
      closedShops: Math.max(0, relevantShops.length - activeTodayCount)
    };
  }, [currentMonthRecords, records, shops, filterManager, isAdmin]);

  const managerSummary = useMemo(() => {
    const summary = {};
    const activeManagersList = (isAdmin && filterManager === 'All') ? managers : [filterManager].filter(m => m !== 'All');

    activeManagersList.forEach(m => {
      summary[m] = { name: m, totalGA: 0, totalOC: 0, targetGA: 0, targetOC: 0 };
    });

    shops.forEach(s => {
      if (summary[s.manager]) {
        summary[s.manager].targetGA += (targets[s.name]?.ga || 0);
        summary[s.manager].targetOC += (targets[s.name]?.oc || 0);
      }
    });

    currentMonthRecords.forEach(r => {
      if (summary[r.areaManager]) {
        summary[r.areaManager].totalGA += (r.gaAch || 0);
        summary[r.areaManager].totalOC += (r.ocAch || 0);
      }
    });

    return Object.values(summary);
  }, [currentMonthRecords, managers, shops, targets, filterManager, isAdmin]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 italic uppercase tracking-tighter">Current Month Status</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Performance Period: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('archive')} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm"
          >
            <Archive size={16} /> Open Archive
          </button>
          {isAdmin && (
            <select 
              value={filterManager} 
              onChange={e => setFilterManager(e.target.value)} 
              className="p-3 bg-white border border-slate-100 rounded-xl font-bold outline-none shadow-sm text-xs"
            >
              <option value="All">All Regions</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Monthly GA Achieved" val={stats.totalGA} color="bg-red-600" icon={<TrendingUp size={20}/>} />
        <StatCard label="Monthly OC Achieved" val={stats.totalOC} color="bg-blue-600" icon={<Activity size={20}/>} />
        <StatCard label="Closed Shops Today" val={stats.closedShops} color="bg-slate-900" icon={<Store size={20}/>} />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Active Monthly Achievement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Area Manager</th>
                <th className="px-4 py-5 text-center">GA Ach.</th>
                <th className="px-4 py-5 text-center">% Achievement</th>
                <th className="px-4 py-5 text-center">OC Ach.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {managerSummary.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-slate-300 italic">No activity yet for this month.</td></tr>
              ) : managerSummary.map(m => (
                <tr key={m.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-700">{m.name}</td>
                  <td className="px-4 py-5 text-center font-bold text-red-600">{m.totalGA.toLocaleString()}</td>
                  <td className="px-4 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-400">
                        {m.targetGA > 0 ? ((m.totalGA / m.targetGA) * 100).toFixed(1) : 0}%
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all duration-1000" 
                          style={{ width: `${Math.min(100, m.targetGA > 0 ? (m.totalGA / m.targetGA) * 100 : 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center font-bold text-blue-600">{m.totalOC.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- SALES ARCHIVE COMPONENT ---
function SalesArchive({ records, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [selectedMonth, setSelectedMonth] = useState(''); // Empty means show history (past months)
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assigned);

  const filteredHistory = useMemo(() => {
    let data = records;
    if (selectedMonth) {
      data = data.filter(r => r.date && r.date.startsWith(selectedMonth));
    } else {
      // By default, show history excluding current month
      const current = getCurrentMonth();
      data = data.filter(r => r.date && !r.date.startsWith(current));
    }
    
    const managerToFilter = isAdmin ? filterManager : assigned;
    if (managerToFilter && managerToFilter !== 'All') {
      data = data.filter(r => r.areaManager === managerToFilter);
    }
    return data;
  }, [records, selectedMonth, filterManager, isAdmin, assigned]);

  const archiveStats = useMemo(() => {
    return {
      ga: filteredHistory.reduce((acc, r) => acc + (r.gaAch || 0), 0),
      oc: filteredHistory.reduce((acc, r) => acc + (r.ocAch || 0), 0)
    };
  }, [filteredHistory]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 rounded-2xl shadow-lg">
            <History className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Sales History Archive</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            className="p-3 bg-white border border-slate-100 rounded-xl font-bold shadow-sm outline-none text-xs"
          />
          {isAdmin && (
            <select 
              value={filterManager} 
              onChange={e => setFilterManager(e.target.value)} 
              className="p-3 bg-white border border-slate-100 rounded-xl font-bold shadow-sm outline-none text-xs"
            >
              <option value="All">All Regions</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-100 p-6 rounded-[2rem] border border-slate-200">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Archived GA Total</p>
          <h4 className="text-2xl font-black italic">{archiveStats.ga.toLocaleString()}</h4>
        </div>
        <div className="bg-slate-100 p-6 rounded-[2rem] border border-slate-200">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Archived OC Total</p>
          <h4 className="text-2xl font-black italic">{archiveStats.oc.toLocaleString()}</h4>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900 text-slate-400 font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Region</th>
              <th className="px-8 py-5">Shop</th>
              <th className="px-8 py-5 text-center">GA Ach.</th>
              <th className="px-8 py-5 text-center">OC Ach.</th>
              <th className="px-8 py-5 text-center">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold tabular-nums">
            {filteredHistory.length === 0 ? (
              <tr><td colSpan="6" className="p-12 text-center text-slate-300 italic uppercase">No archived data found for selected period.</td></tr>
            ) : filteredHistory.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4 text-slate-400">{r.date}</td>
                <td className="px-8 py-4 font-black">{r.areaManager}</td>
                <td className="px-8 py-4 italic text-slate-600 font-medium">{r.shopName}</td>
                <td className="px-8 py-4 text-center text-red-600 font-black">+{r.gaAch}</td>
                <td className="px-8 py-4 text-center text-blue-600 font-black">+{r.ocAch}</td>
                <td className="px-8 py-4 text-center text-slate-300">{r.workingHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- SHOPS ANALYTICS ---
function ShopsAnalytics({ records, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [fManager, setFManager] = useState(isAdmin ? 'All' : assigned);
  const [fShop, setFShop] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredData = useMemo(() => {
    return records.filter(r => {
      const matchesManager = isAdmin ? (fManager === 'All' || r.areaManager === fManager) : (r.areaManager === assigned);
      const matchesShop = fShop === 'All' || r.shopName === fShop;
      const matchesDateFrom = !dateFrom || r.date >= dateFrom;
      const matchesDateTo = !dateTo || r.date <= dateTo;
      return matchesManager && matchesShop && matchesDateFrom && matchesDateTo;
    });
  }, [records, fManager, fShop, dateFrom, dateTo, isAdmin, assigned]);

  const shopOptions = useMemo(() => {
    const mgr = isAdmin ? fManager : assigned;
    if (mgr === 'All') return shops;
    return shops.filter(s => s.manager === mgr);
  }, [shops, fManager, isAdmin, assigned]);

  const exportCSV = () => {
    const headers = ['Date', 'Manager', 'Shop', 'GA', 'OC', 'Hours', 'Notes'];
    const rows = filteredData.map(r => [
      r.date, 
      r.areaManager, 
      r.shopName, 
      r.gaAch, 
      r.ocAch, 
      r.workingHours, 
      r.note?.replace(/,/g, ' ') || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Detailed_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <CalendarRange className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Advanced Shop Analytics</h2>
        </div>
        <button 
          onClick={exportCSV} 
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-all"
        >
          <FileSpreadsheet size={16} /> Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">Manager</label>
          <select 
            value={fManager} 
            onChange={e => {setFManager(e.target.value); setFShop('All');}} 
            disabled={!isAdmin} 
            className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border-none"
          >
            <option value="All">All Regions</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">Shop</label>
          <select 
            value={fShop} 
            onChange={e => setFShop(e.target.value)} 
            className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border-none"
          >
            <option value="All">All Shops</option>
            {shopOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">From Date</label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">To Date</label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none" 
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-indigo-900 text-white font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Region</th>
              <th className="px-8 py-5">Shop</th>
              <th className="px-8 py-5 text-center">GA</th>
              <th className="px-8 py-5 text-center">OC</th>
              <th className="px-8 py-5 text-center">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y font-bold tabular-nums">
            {filteredData.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4 text-slate-400 font-medium">{r.date}</td>
                <td className="px-8 py-4 font-black">{r.areaManager}</td>
                <td className="px-8 py-4 italic text-slate-700">{r.shopName}</td>
                <td className="px-8 py-4 text-center text-red-600">{r.gaAch}</td>
                <td className="px-8 py-4 text-center text-blue-600">{r.ocAch}</td>
                <td className="px-8 py-4 text-center text-slate-400 font-medium">{r.workingHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- UTILITY UI COMPONENTS ---

function StatCard({ label, val, color, icon }) {
  return (
    <div className={`${color} p-8 rounded-[2.5rem] text-white shadow-xl flex items-start justify-between relative overflow-hidden group`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-widest">{label}</p>
        <h4 className="text-4xl font-black italic tracking-tighter">{val?.toLocaleString() || 0}</h4>
      </div>
      <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-125 transition-transform duration-1000 rotate-12">
        {icon && React.cloneElement(icon, { size: 140 })}
      </div>
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
    note: '', 
    date: new Date().toISOString().split('T')[0] 
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
        note: '', 
        date: new Date().toISOString().split('T')[0] 
      }); 
      setTimeout(() => setSuccess(false), 3000); 
    } catch (err) { 
      console.error(err); 
    } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-black text-slate-800 mb-8 text-center italic uppercase tracking-tighter">Register Shift Sales</h2>
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Shift Date</label>
            <input 
              required 
              type="date" 
              className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-red-500" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Region Manager</label>
            <select 
              required 
              disabled={!isAdmin} 
              className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-red-500" 
              value={isAdmin ? formData.areaManager : assigned} 
              onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}
            >
               <option value="">Select Region</option>
               {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Target Shop</label>
            <select 
              required 
              className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-red-500" 
              value={formData.shopName} 
              onChange={e => setFormData({...formData, shopName: e.target.value})}
            >
               <option value="">Choose Shop</option>
               {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Working Hours</label>
            <input 
              required 
              type="number" 
              step="0.5" 
              placeholder="e.g., 8" 
              className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-red-500" 
              value={formData.workingHours} 
              onChange={e => setFormData({...formData, workingHours: e.target.value})} 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-red-500 uppercase px-1">GA Achieved</label>
            <input 
              required 
              type="number" 
              placeholder="0" 
              className="w-full bg-red-50 p-6 rounded-[2rem] text-3xl font-black text-red-600 outline-none border border-red-100 placeholder:text-red-200" 
              value={formData.gaAch} 
              onChange={e => setFormData({...formData, gaAch: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-blue-500 uppercase px-1">OC Achieved</label>
            <input 
              required 
              type="number" 
              placeholder="0" 
              className="w-full bg-blue-50 p-6 rounded-[2rem] text-3xl font-black text-blue-600 outline-none border border-blue-100 placeholder:text-blue-200" 
              value={formData.ocAch} 
              onChange={e => setFormData({...formData, ocAch: e.target.value})} 
            />
          </div>
        </div>
        <textarea 
          placeholder="Shift notes, issues, or general remarks..." 
          className="w-full bg-slate-50 p-5 rounded-2xl min-h-[120px] outline-none font-bold focus:ring-2 focus:ring-red-500" 
          value={formData.note} 
          onChange={e => setFormData({...formData, note: e.target.value})} 
        />
        {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-bounce">Report Logged Successfully</div>}
        <button 
          type="submit" 
          disabled={submitting} 
          className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-black transition-all disabled:opacity-50"
        >
          {submitting ? 'Syncing...' : 'Log Daily Report'}
        </button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assigned);
  const [startDate, setStartDate] = useState('');

  const auditData = useMemo(() => { 
    let data = [...records]; 
    const mgr = isAdmin ? filterManager : assigned;
    if (mgr !== 'All') data = data.filter(r => r.areaManager === mgr); 
    if (startDate) data = data.filter(r => r.date === startDate); 
    return data; 
  }, [records, filterManager, startDate, isAdmin, assigned]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">System Audit Trail</h2>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          <input 
            type="date" 
            className="bg-white p-3 rounded-xl text-xs font-black shadow-sm outline-none border border-slate-100" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
          />
          {isAdmin && (
            <select 
              value={filterManager} 
              onChange={e => setFilterManager(e.target.value)} 
              className="bg-white p-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm outline-none border border-slate-100"
            >
              <option value="All">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#0F172A] text-slate-400 font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Manager</th>
              <th className="px-8 py-5">Shop</th>
              <th className="px-8 py-5 text-center">GA</th>
              <th className="px-8 py-5 text-center">OC</th>
              {isAdmin && <th className="px-8 py-5 text-left">Control</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {auditData.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4 text-slate-500 font-bold">{r.date}</td>
                <td className="px-8 py-4 font-black">{r.areaManager}</td>
                <td className="px-8 py-4 italic text-slate-700 font-medium">{r.shopName}</td>
                <td className="px-8 py-4 text-center text-red-600 font-black">+{r.gaAch}</td>
                <td className="px-8 py-4 text-center text-blue-600 font-black">+{r.ocAch}</td>
                {isAdmin && (
                  <td className="px-8 py-4 text-left">
                    <button 
                      onClick={async () => { if(confirm("Confirm deletion of this entry?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} 
                      className="text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
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

function TargetSetting({ shops, targets, db, appId }) {
  const [editingId, setEditingId] = useState(null);
  const [temp, setTemp] = useState({ ga: 0, oc: 0 });
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Regional Monthly Targets</h2>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-right text-xs font-bold">
          <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-5">Shop Branch</th>
              <th className="p-5 text-center">GA Target</th>
              <th className="p-5 text-center">OC Target</th>
              <th className="p-5 text-left">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shops.map(s => (
              <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">{s.name}</td>
                <td className="p-4 text-center">
                  {editingId === s.name ? (
                    <input 
                      type="number" 
                      className="w-24 bg-slate-100 p-2 rounded-lg text-center font-black outline-none border border-slate-200" 
                      value={temp.ga} 
                      onChange={e=>setTemp({...temp, ga: Number(e.target.value)})}
                    />
                  ) : (
                    <span className="text-slate-500 font-black tracking-widest">{targets[s.name]?.ga || 0}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {editingId === s.name ? (
                    <input 
                      type="number" 
                      className="w-24 bg-slate-100 p-2 rounded-lg text-center font-black outline-none border border-slate-200" 
                      value={temp.oc} 
                      onChange={e=>setTemp({...temp, oc: Number(e.target.value)})}
                    />
                  ) : (
                    <span className="text-slate-500 font-black tracking-widest">{targets[s.name]?.oc || 0}</span>
                  )}
                </td>
                <td className="p-4 text-left">
                  {editingId === s.name ? (
                    <button 
                      onClick={async () => {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: {...targets, [s.name]: temp} }, { merge: true });
                        setEditingId(null);
                      }} 
                      className="text-emerald-600 bg-emerald-50 p-2 rounded-xl"
                    >
                      <Check size={20}/>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {setEditingId(s.name); setTemp(targets[s.name] || {ga:0, oc:0});}} 
                      className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition-all"
                    >
                      <Edit3 size={18}/>
                    </button>
                  )}
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
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ role: 'user', assignedManager: '' });
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Team Directory</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase text-lg shadow-inner">
                 {u.username?.[0]}
               </div>
               <div>
                 <p className="font-black text-slate-800 text-lg leading-tight">{u.username}</p>
                 <span className="text-[10px] uppercase font-black text-red-600 tracking-widest flex items-center gap-1">
                   {u.role === 'admin' ? <ShieldCheck size={10} /> : <UsersIcon size={10} />}
                   {u.role === 'admin' ? 'SYSTEM ADMIN' : (u.assignedManager || 'PENDING ASSIGNMENT')}
                 </span>
               </div>
             </div>
             {editId === u.uid ? (
               <div className="space-y-2 pt-4 border-t border-slate-50">
                 <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black border-none outline-none">
                   <option value="user">USER ACCOUNT</option>
                   <option value="admin">ADMIN ACCOUNT</option>
                 </select>
                 <select value={form.assignedManager} onChange={e=>setForm({...form, assignedManager: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black border-none outline-none">
                   <option value="">Assign Region...</option>
                   {managers.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
                 <button onClick={async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid), form); setEditId(null); }} className="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Update Profile</button>
               </div>
             ) : (
               <button onClick={() => {setEditId(u.uid); setForm({role: u.role, assignedManager: u.assignedManager || ''});}} className="w-full bg-slate-50 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">Edit Membership</button>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ areaManagers, shops, db, appId }) {
  const [newM, setNewM] = useState(''); const [newS, setNewS] = useState(''); const [assignedM, setAssignedM] = useState('');
  const updateConfig = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops }, { merge: true }); };
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">System Setup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
          <h3 className="font-black text-red-600 uppercase text-xs flex items-center gap-2"><UserPlus size={18}/> Register Region Manager</h3>
          <div className="flex gap-2">
            <input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-red-500 transition-all" placeholder="Full Name" />
            <button onClick={() => {if(newM) updateConfig([...areaManagers, newM]); setNewM('');}} className="bg-red-600 text-white px-8 rounded-xl font-black shadow-lg shadow-red-100 active:scale-95 transition-transform">ADD</button>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
          <h3 className="font-black text-blue-600 uppercase text-xs flex items-center gap-2"><Store size={18}/> Register Shop Branch</h3>
          <input value={newS} onChange={e => setNewS(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none focus:border-blue-500 border border-transparent transition-all" placeholder="Shop Name" />
          <select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none">
            <option value="">Assign to Manager...</option>
            {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => {if(newS && assignedM) updateConfig(null, [...shops, {name: newS, manager: assignedM}]); setNewS('');}} className="w-full bg-slate-900 text-white p-4 rounded-xl font-black shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-[10px]">Deploy Branch</button>
        </div>
      </div>
    </div>
  );
}

function LoginPortal() {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState(''); const [error, setError] = useState('');
  const handleAuth = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { setError("Invalid credentials. Please verify your access."); } };
  return (
    <div className="h-screen flex items-center justify-center bg-[#0F172A] p-4 text-center">
      <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-sm shadow-2xl space-y-8 animate-in zoom-in duration-500">
        <div className="text-center">
          <ShieldCheck className="mx-auto text-red-600 mb-4" size={56} />
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-800 uppercase">Cash Shop</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Management Portal</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4 text-right">
          <div className="space-y-1">
            <input 
              type="email" 
              placeholder="Corporate Email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none text-center border-none shadow-inner" 
            />
          </div>
          <div className="space-y-1">
            <input 
              type="password" 
              placeholder="Access Key" 
              value={pass} 
              onChange={e=>setPass(e.target.value)} 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none text-center border-none shadow-inner" 
            />
          </div>
          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-wider text-center">{error}</p>}
          <button className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black shadow-xl uppercase tracking-widest text-sm hover:bg-black transition-all">Authenticate</button>
        </form>
      </div>
    </div>
  );
}

function Onboarding({ user, setView, setUserProfile }) {
  const [name, setName] = useState('');
  const saveProfile = async () => { 
    if (!name.trim()) return; 
    const prof = { username: name, role: 'user', assignedManager: '', createdAt: Date.now() }; 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), prof); 
    setUserProfile(prof); 
    setView('waiting'); 
  };
  return (
    <div className="h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
      <div className="bg-white p-12 rounded-[3rem] w-full max-w-sm shadow-xl space-y-6 animate-in fade-in duration-700">
        <div className="p-4 bg-red-50 text-red-600 rounded-3xl inline-block mx-auto mb-2"><UserPlus size={32} /></div>
        <h3 className="uppercase italic font-black text-xl tracking-tighter text-slate-800">Identify Yourself</h3>
        <p className="text-slate-400 text-xs font-medium">Please enter your full corporate name to continue setup.</p>
        <input 
          value={name} 
          onChange={e=>setName(e.target.value)} 
          className="w-full bg-slate-50 p-5 rounded-2xl font-black outline-none text-center border border-slate-100" 
          placeholder="First & Last Name" 
        />
        <button onClick={saveProfile} className="w-full bg-red-600 text-white p-5 rounded-3xl font-black shadow-lg shadow-red-100 uppercase tracking-widest text-xs active:scale-95 transition-all">Submit Profile</button>
      </div>
    </div>
  );
}

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Status Hub', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Log Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'archive', label: 'History Archive', icon: Archive, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Full Audit', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'analytics', label: 'Intelligence', icon: CalendarRange, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Target Center', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team Directory', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'System Admin', icon: Settings, roles: ['admin'] }
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-50 border-r border-white/5">
      <div className="mb-12 px-2 flex items-center gap-3">
        <div className="p-2 bg-red-600 rounded-xl"><Store className="text-white" size={20} /></div>
        <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">Cash Shop</h1>
      </div>
      <div className="space-y-1.5 flex-1">
        {links.map(l => l.roles.includes(role) && (
          <button 
            key={l.id} 
            onClick={() => setView(l.id)} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${view === l.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-100'}`}
          >
            <l.icon size={18} /> 
            <span className="font-black text-[10px] uppercase tracking-[0.15em]">{l.label}</span>
          </button>
        ))}
      </div>
      <button 
        onClick={onLogout} 
        className="mt-auto flex items-center gap-4 px-5 py-4 text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-400 hover:bg-red-950/20 rounded-2xl transition-all"
      >
        <LogOut size={18} /> Exit Portal
      </button>
    </nav>
  );
}

function MobileNav({ view, setView, role }) {
  const icons = [
    {id:'dashboard', icon:BarChart3, roles:['admin','user']}, 
    {id:'collection', icon:PlusCircle, roles:['admin','user']}, 
    {id:'archive', icon:Archive, roles:['admin','user']}, 
    {id:'analytics', icon:CalendarRange, roles:['admin','user']}
  ];
  return ( 
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] no-print">
      {icons.map(i => i.roles.includes(role) && (
        <button 
          key={i.id} 
          onClick={()=>setView(i.id)} 
          className={`p-4 rounded-3xl transition-all ${view===i.id?'text-red-600 bg-red-50 shadow-inner':'text-slate-400'}`}
        >
          <i.icon size={22}/>
        </button>
      ))}
    </div> 
  );
}

function LoadingScreen() { 
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
        <Store className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600" size={24} />
      </div>
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Secure Data...</p>
    </div>
  );
}

function WaitingRoom({ onLogout }) { 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white space-y-6 font-black text-center p-12">
      <div className="p-6 bg-yellow-500/10 rounded-[3rem] border border-yellow-500/20 text-yellow-500 animate-pulse">
        <Clock size={64} />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl italic tracking-tighter uppercase">Awaiting Approval</h2>
        <p className="text-slate-400 font-medium text-sm tracking-wider uppercase">Your account requires administrator verification.</p>
      </div>
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
        <p className="text-xs text-white uppercase tracking-widest font-black mb-1">Contact Administrator</p>
        <p className="text-red-400 italic text-xl">Ahmed Sharaf</p>
      </div>
      <button 
        onClick={onLogout} 
        className="text-red-500 underline text-[10px] mt-4 uppercase font-black tracking-[0.2em] hover:text-red-400 transition-colors"
      >
        Discard & Logout
      </button>
    </div>
  );
}

// Global Styles Setup
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    @media print { .no-print { display: none !important; } body { background: white !important; padding: 0 !important; margin: 0 !important; } main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; } .md\\:pl-64 { padding-left: 0 !important; } nav { display: none !important; } .rounded-\\[2\\.5rem\\], .rounded-\\[3rem\\] { border-radius: 0 !important; border: 1px solid #eee !important; } } 
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(styleTag);
}
