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
  Archive
} from 'lucide-react';

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

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch(e) {
  app = initializeApp(firebaseConfig, 'cashshop-' + Date.now());
  auth = getAuth(app);
  db = getFirestore(app);
}

// Helper: get "YYYY-MM" string from a date string "YYYY-MM-DD" or timestamp
function getYearMonth(record) {
  if (record.date) return record.date.slice(0, 7);
  if (record.timestamp) return new Date(record.timestamp).toISOString().slice(0, 7);
  return '';
}

function getCurrentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

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
        setError("Database permission error.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

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
      if (userProfile.role === 'admin') setSalesRecords(sorted);
      else setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
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

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  // Split records into current month and past months
  const currentMonth = getCurrentYearMonth();

  const currentMonthRecords = useMemo(() => 
    salesRecords.filter(r => getYearMonth(r) === currentMonth),
    [salesRecords, currentMonth]
  );

  const archiveRecords = useMemo(() => 
    salesRecords.filter(r => getYearMonth(r) < currentMonth),
    [salesRecords, currentMonth]
  );

  // Get all past months that have data
  const availableArchiveMonths = useMemo(() => {
    const months = new Set(archiveRecords.map(r => getYearMonth(r)).filter(Boolean));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [archiveRecords]);

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
            records={currentMonthRecords}
            targets={targets}
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
            records={currentMonthRecords}
            targets={targets}
            shops={shops}
            managers={areaManagers}
            role={userProfile?.role}
            db={db}
            appId={appId}
            userProfile={userProfile}
          />
        )}
        {view === 'archive' && (
          <ArchivePage
            archiveRecords={archiveRecords}
            availableMonths={availableArchiveMonths}
            targets={targets}
            shops={shops}
            managers={areaManagers}
            role={userProfile?.role}
            db={db}
            appId={appId}
            userProfile={userProfile}
          />
        )}
        {view === 'targets' && userProfile?.role === 'admin' && (
          <TargetSetting shops={shops} areaManagers={areaManagers} targets={targets} db={db} appId={appId} />
        )}
        {view === 'admin' && userProfile?.role === 'admin' && (
          <AdminDashboard areaManagers={areaManagers} shops={shops} targets={targets} db={db} appId={appId} />
        )}
        {view === 'userSearch' && userProfile?.role === 'admin' && (
          <UserSearch users={allUsers} db={db} appId={appId} managers={areaManagers} />
        )}
      </main>
      <MobileNav view={view} setView={setView} role={userProfile?.role} />
    </div>
  );
}

// ─── ARCHIVE PAGE ────────────────────────────────────────────────────────────

function ArchivePage({ archiveRecords, availableMonths, targets, shops, managers, role, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [filterShop, setFilterShop] = useState('All');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'records'

  const monthRecords = useMemo(() => {
    let data = archiveRecords.filter(r => getYearMonth(r) === selectedMonth);
    if (!isAdmin) data = data.filter(r => r.areaManager === assignedManager);
    return data;
  }, [archiveRecords, selectedMonth, isAdmin, assignedManager]);

  const filteredRecords = useMemo(() => {
    let data = [...monthRecords];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    return data;
  }, [monthRecords, filterManager, filterShop]);

  const availableShopsForFilter = useMemo(() => {
    if (filterManager === 'All') return shops;
    return shops.filter(s => s.manager === filterManager);
  }, [shops, filterManager]);

  // Build manager summary for the selected month
  const managerSummary = useMemo(() => {
    const activeManagers = isAdmin
      ? (filterManager === 'All' ? managers : [filterManager])
      : managers.filter(m => m === assignedManager);

    const summary = {};
    activeManagers.forEach(m => {
      summary[m] = { name: m, totalGA: 0, totalOC: 0, entryCount: 0, totalHours: 0, targetGA: 0, targetOC: 0 };
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

  const totals = useMemo(() => ({
    totalGA: filteredRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0),
    totalOC: filteredRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0),
    totalTargetGA: (isAdmin ? (filterManager === 'All' ? shops : shops.filter(s => s.manager === filterManager)) : shops.filter(s => s.manager === assignedManager))
      .reduce((acc, s) => acc + (targets[s.name]?.ga || 0), 0),
    totalTargetOC: (isAdmin ? (filterManager === 'All' ? shops : shops.filter(s => s.manager === filterManager)) : shops.filter(s => s.manager === assignedManager))
      .reduce((acc, s) => acc + (targets[s.name]?.oc || 0), 0),
  }), [filteredRecords, shops, targets, isAdmin, filterManager, assignedManager]);

  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const exportToExcel = () => {
    const headers = ['Timestamp', 'Date', 'Area Manager', 'Shop Name', 'GA Ach', 'GA %', 'OC Ach', 'OC %', 'Hours Worked'];
    const rows = filteredRecords.map(r => [
      new Date(r.timestamp).toLocaleString(),
      r.date,
      r.areaManager,
      r.shopName,
      r.gaAch,
      targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) + '%' : '0%',
      r.ocAch,
      targets[r.shopName]?.oc > 0 ? (r.ocAch / targets[r.shopName].oc * 100).toFixed(1) + '%' : '0%',
      r.workingHours + 'h'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Archive_${selectedMonth}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-700 rounded-2xl shadow-lg shadow-slate-200">
            <Archive className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">Sales Archive</h2>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest mt-0.5">Past Months Data</p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          disabled={!selectedMonth || filteredRecords.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>

      {availableMonths.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Archive size={28} className="text-slate-300" />
          </div>
          <p className="font-black text-slate-400 text-lg italic">No archived data yet</p>
          <p className="text-slate-300 text-sm font-bold">Previous months' records will appear here.</p>
        </div>
      ) : (
        <>
          {/* Month Selector + Filters */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Calendar size={14} /> Select Month
            </h3>

            {/* Month pills */}
            <div className="flex flex-wrap gap-2">
              {availableMonths.map(ym => (
                <button
                  key={ym}
                  onClick={() => { setSelectedMonth(ym); setFilterManager(isAdmin ? 'All' : assignedManager); setFilterShop('All'); }}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    selectedMonth === ym
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {formatMonthLabel(ym)}
                </button>
              ))}
            </div>

            {/* Filters */}
            {selectedMonth && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-50 pt-5">
                {isAdmin && (
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Manager</label>
                    <select
                      value={filterManager}
                      onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }}
                      className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                    >
                      <option value="All">All Managers</option>
                      {managers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Shop</label>
                  <select
                    value={filterShop}
                    onChange={e => setFilterShop(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                  >
                    <option value="All">All Shops</option>
                    {availableShopsForFilter.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Stats cards */}
          {selectedMonth && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-600 p-5 rounded-3xl text-white shadow-xl shadow-red-100">
                <p className="text-xs font-black uppercase text-red-100 mb-1">Total GA</p>
                <h4 className="text-2xl font-black italic">{totals.totalGA.toLocaleString()}</h4>
                <p className="text-xs font-black text-red-200 mt-1">
                  {totals.totalTargetGA > 0 ? (totals.totalGA / totals.totalTargetGA * 100).toFixed(1) : 0}% of target
                </p>
              </div>
              <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-xl shadow-blue-100">
                <p className="text-xs font-black uppercase text-blue-100 mb-1">Total OC</p>
                <h4 className="text-2xl font-black italic">{totals.totalOC.toLocaleString()}</h4>
                <p className="text-xs font-black text-blue-200 mt-1">
                  {totals.totalTargetOC > 0 ? (totals.totalOC / totals.totalTargetOC * 100).toFixed(1) : 0}% of target
                </p>
              </div>
              <div className="bg-slate-800 p-5 rounded-3xl text-white shadow-xl shadow-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 mb-1">GA Target</p>
                <h4 className="text-2xl font-black italic">{totals.totalTargetGA.toLocaleString()}</h4>
                <p className="text-xs font-black text-slate-500 mt-1">Monthly target</p>
              </div>
              <div className="bg-slate-800 p-5 rounded-3xl text-white shadow-xl shadow-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 mb-1">Total Records</p>
                <h4 className="text-2xl font-black italic">{filteredRecords.length}</h4>
                <p className="text-xs font-black text-slate-500 mt-1">Entries submitted</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          {selectedMonth && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex border-b border-slate-100 px-6 pt-6 gap-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-5 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    activeTab === 'summary'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Manager Summary
                </button>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-5 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    activeTab === 'records'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Detailed Records
                </button>
              </div>

              {activeTab === 'summary' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Area Manager</th>
                        <th className="px-4 py-5 text-center">GA Target</th>
                        <th className="px-4 py-5 text-center">GA Ach.</th>
                        <th className="px-4 py-5 text-center">GA %</th>
                        <th className="px-4 py-5 text-center">Remaining</th>
                        <th className="px-4 py-5 text-center">OC Target</th>
                        <th className="px-4 py-5 text-center">OC Ach.</th>
                        <th className="px-4 py-5 text-center">OC %</th>
                        <th className="px-8 py-5 text-center">AVG Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {managerSummary.length === 0 ? (
                        <tr><td colSpan="9" className="px-8 py-10 text-center text-slate-300 italic font-bold">No records for this month.</td></tr>
                      ) : managerSummary.map((m, idx) => {
                        const pct = parseFloat(m.completionGA);
                        const badge = pct >= 100 ? 'bg-emerald-50 text-emerald-600' : pct >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-700">{m.name}</td>
                            <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetGA.toLocaleString()}</td>
                            <td className="px-4 py-5 text-center font-black text-red-600">{m.totalGA.toLocaleString()}</td>
                            <td className="px-4 py-5 text-center">
                              <span className={`px-2 py-1 rounded-lg text-xs font-black ${badge}`}>{m.completionGA}%</span>
                            </td>
                            <td className="px-4 py-5 text-center font-bold text-red-900">{m.remainingGA.toLocaleString()}</td>
                            <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetOC.toLocaleString()}</td>
                            <td className="px-4 py-5 text-center font-black text-blue-600">{m.totalOC.toLocaleString()}</td>
                            <td className="px-4 py-5 text-center font-black text-blue-700">{m.completionOC}%</td>
                            <td className="px-8 py-5 text-center font-bold text-slate-500">{m.avgHours}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'records' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0F172A] text-slate-400 text-xs font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-6">Time Stamp</th>
                        <th className="px-8 py-6">Date</th>
                        <th className="px-8 py-6">Area Manager</th>
                        <th className="px-8 py-6">Shop Name</th>
                        <th className="px-8 py-6 text-center">GA Ach</th>
                        <th className="px-8 py-6 text-center">GA %</th>
                        <th className="px-8 py-6 text-center">OC Ach</th>
                        <th className="px-8 py-6 text-center">OC %</th>
                        <th className="px-8 py-6 text-center">Hours</th>
                        {role === 'admin' && <th className="px-8 py-6 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold tabular-nums">
                      {filteredRecords.length === 0 ? (
                        <tr><td colSpan={role === 'admin' ? 10 : 9} className="px-8 py-10 text-center text-slate-300 italic">No records found.</td></tr>
                      ) : filteredRecords.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 text-slate-400 text-xs">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-8 py-5 text-slate-700">{r.date}</td>
                          <td className="px-8 py-5 text-slate-800 font-black">{r.areaManager}</td>
                          <td className="px-8 py-5 text-slate-500 italic">{r.shopName}</td>
                          <td className="px-8 py-5 text-center text-red-600">+{r.gaAch}</td>
                          <td className="px-8 py-5 text-center text-xs text-red-700">{(targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) : 0)}%</td>
                          <td className="px-8 py-5 text-center text-blue-600">+{r.ocAch}</td>
                          <td className="px-8 py-5 text-center text-xs text-blue-700">{(targets[r.shopName]?.oc > 0 ? (r.ocAch / targets[r.shopName].oc * 100).toFixed(1) : 0)}%</td>
                          <td className="px-8 py-5 text-center text-slate-400 text-xs">{r.workingHours}h</td>
                          {role === 'admin' && (
                            <td className="px-8 py-5 text-right">
                              <button
                                onClick={async () => { if(confirm("Delete record?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }}
                                className="text-slate-200 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── EXISTING COMPONENTS (unchanged) ────────────────────────────────────────

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

  const [showClosedModal, setShowClosedModal] = useState(false);

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

  const exportSummaryExcel = () => {
    const headers = ['Manager', 'GA Target', 'GA Ach.', 'GA %', 'GA Remaining', 'OC Target', 'OC Ach.', 'OC %', 'Avg Hours'];
    const rows = filteredManagerSummary.map(m => [m.name, m.targetGA, m.totalGA, m.completionGA + '%', m.remainingGA, m.targetOC, m.totalOC, m.completionOC + '%', m.avgHours]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Manager_Summary_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Current month label
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200"><LayoutDashboard className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">{isAdmin ? "Performance Hub" : "Your Performance"}</h2>
            <p className="text-xs font-black uppercase text-red-500 tracking-widest mt-0.5">
              {isSingleManagerView ? filterManager + ' · ' : ''}{currentMonthLabel}
            </p>
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
              <tr><th className="px-6 py-4">Area Manager</th><th className="px-6 py-4">Last Sales Date & Time</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {managerSummary.length === 0 ? (
                <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-300 font-bold italic">No active data for this region.</td></tr>
              ) : managerSummary.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-700">{m.name}</td>
                  <td className="px-6 py-4 font-bold text-slate-400">{m.lastActivity ? `${new Date(m.lastActivity).toLocaleDateString()} ${new Date(m.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="bg-red-600 p-6 rounded-3xl text-white shadow-xl shadow-red-100">
            <p className="text-xs font-black uppercase text-red-100 mb-1">{isSingleManagerView ? filterManager + ' — ' : ''}Total GA Achieved</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalGA.toLocaleString()}</h4>
            <div className="mt-3 pt-3 border-t border-red-500 flex items-center justify-between">
              <span className="text-xs font-black text-red-200 uppercase tracking-widest">Target</span>
              <span className="text-sm font-black text-white">{operationalStats.totalGA.toLocaleString()} / {operationalStats.totalTargetGA.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-1.5 bg-red-500 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: operationalStats.totalTargetGA > 0 ? Math.min(100, (operationalStats.totalGA / operationalStats.totalTargetGA * 100)).toFixed(1) + '%' : '0%' }} />
            </div>
            <p className="text-xs font-black text-red-200 mt-1 text-right">{operationalStats.totalTargetGA > 0 ? (operationalStats.totalGA / operationalStats.totalTargetGA * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
            <p className="text-xs font-black uppercase text-blue-100 mb-1">{isSingleManagerView ? filterManager + ' — ' : ''}Total OC Achieved</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalOC.toLocaleString()}</h4>
            <div className="mt-3 pt-3 border-t border-blue-500 flex items-center justify-between">
              <span className="text-xs font-black text-blue-200 uppercase tracking-widest">Target</span>
              <span className="text-sm font-black text-white">{operationalStats.totalOC.toLocaleString()} / {operationalStats.totalTargetOC.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-1.5 bg-blue-500 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: operationalStats.totalTargetOC > 0 ? Math.min(100, (operationalStats.totalOC / operationalStats.totalTargetOC * 100)).toFixed(1) + '%' : '0%' }} />
            </div>
            <p className="text-xs font-black text-blue-200 mt-1 text-right">{operationalStats.totalTargetOC > 0 ? (operationalStats.totalOC / operationalStats.totalTargetOC * 100).toFixed(1) : 0}%</p>
          </div>
          <button
            onClick={() => setShowClosedModal(true)}
            className="w-full bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 text-left hover:bg-slate-800 transition-all group cursor-pointer"
          >
            <p className="text-xs font-black uppercase text-slate-400 mb-1">Closed Shops Today</p>
            <div className="flex items-end justify-between">
              <h4 className="text-3xl font-black italic">{operationalStats.closedShopsToday}</h4>
              <span className="text-xs font-black uppercase text-slate-500 group-hover:text-slate-300 transition-colors tracking-widest">View List →</span>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-black text-slate-800 text-lg tracking-tight">
              {isSingleManagerView ? `${filterManager} — Shop Breakdown` : 'Manager Performance Summary'}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={exportSummaryExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all"><FileSpreadsheet size={16} /> Export</button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"><FileText size={16} /> PDF</button>
            </div>
          </div>
          {isAdmin && !isSingleManagerView && (
            <div className="flex flex-wrap gap-4 border-t pt-6 border-slate-50">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="Search manager..." className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none" value={tableSearch} onChange={e => setTableSearch(e.target.value)} />
              </div>
              <select className="px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black uppercase tracking-widest outline-none" value={performanceFilter} onChange={e => setPerformanceFilter(e.target.value)}>
                <option value="All">All Performance</option>
                <option value="Full">Achieved (100%+)</option>
                <option value="Good">In Progress (50-99%)</option>
                <option value="Under">Critical (&lt;50%)</option>
              </select>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {isSingleManagerView ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Shop / Manager</th>
                  <th className="px-4 py-5 text-center">GA Target</th>
                  <th className="px-4 py-5 text-center">GA Ach.</th>
                  <th className="px-4 py-5 text-center">%</th>
                  <th className="px-4 py-5 text-center">Remaining</th>
                  <th className="px-4 py-5 text-center">OC Target</th>
                  <th className="px-4 py-5 text-center">OC Ach.</th>
                  <th className="px-4 py-5 text-center">%</th>
                  <th className="px-8 py-5 text-center">AVG Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredManagerSummary.map((m, idx) => {
                  const shopRows = getShopDetails(m.name);
                  return (
                    <React.Fragment key={idx}>
                      <tr className="bg-red-50 border-l-4 border-red-500">
                        <td className="px-8 py-5 font-black text-slate-800 flex items-center gap-2"><Store size={14} className="text-red-500" />{m.name} <span className="text-xs font-bold text-slate-400 ml-1">— Totals</span></td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-red-600">{m.totalGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-red-700">{m.completionGA}%</td>
                        <td className="px-4 py-5 text-center font-bold text-red-900">{m.remainingGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetOC.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-blue-600">{m.totalOC.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-blue-700">{m.completionOC}%</td>
                        <td className="px-8 py-5 text-center font-bold text-slate-500">{m.avgHours}h</td>
                      </tr>
                      {shopRows.map((s, si) => (
                        <tr key={`shop-${si}`} className="bg-white hover:bg-slate-50 text-xs font-bold transition-colors">
                          <td className="px-12 py-4 italic text-slate-600 border-l-4 border-slate-200">{s.name}</td>
                          <td className="px-4 py-4 text-center text-slate-400">{s.targetGA.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-red-500">{s.totalGA.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-red-700">{s.completionGA}%</td>
                          <td className="px-4 py-4 text-center text-red-900">{s.remainingGA.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-slate-400">{s.targetOC.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-blue-500">{s.totalOC.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center text-blue-700">{s.completionOC}%</td>
                          <td className="px-8 py-4 text-center text-slate-500">{s.avgHours}h</td>
                        </tr>
                      ))}
                      {shopRows.length === 0 && (
                        <tr><td colSpan="9" className="px-12 py-4 text-slate-300 italic text-xs border-l-4 border-slate-200">No shops assigned to this manager.</td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredManagerSummary.length === 0 && (
                  <tr><td colSpan="9" className="px-8 py-10 text-center text-slate-300 italic font-bold">No data found.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Area Manager</th>
                  <th className="px-4 py-5 text-center">GA Target</th>
                  <th className="px-4 py-5 text-center">GA Ach.</th>
                  <th className="px-4 py-5 text-center">%</th>
                  <th className="px-4 py-5 text-center">Remaining</th>
                  <th className="px-4 py-5 text-center">OC Target</th>
                  <th className="px-4 py-5 text-center">OC Ach.</th>
                  <th className="px-4 py-5 text-center">%</th>
                  <th className="px-8 py-5 text-center">AVG Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredManagerSummary.length === 0 ? (
                  <tr><td colSpan="9" className="px-8 py-10 text-center text-slate-300 italic font-bold">No performance records found.</td></tr>
                ) : filteredManagerSummary.map((m, idx) => {
                  const shopRows = getShopDetails(m.name);
                  return (
                    <React.Fragment key={idx}>
                      <tr onClick={() => setSelectedManager(selectedManager === m.name ? null : m.name)} className={`cursor-pointer transition-colors ${selectedManager === m.name ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-8 py-5 font-black text-slate-700 flex items-center gap-2">
                          {selectedManager === m.name ? <ChevronDown size={14} className="text-red-500" /> : <ChevronRight size={14} className="text-slate-300" />}
                          {m.name}
                        </td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-red-600">{m.totalGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-red-700">{m.completionGA}%</td>
                        <td className="px-4 py-5 text-center font-bold text-red-900">{m.remainingGA.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetOC.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-blue-600">{m.totalOC.toLocaleString()}</td>
                        <td className="px-4 py-5 text-center font-black text-blue-700">{m.completionOC}%</td>
                        <td className="px-8 py-5 text-center font-bold text-slate-500">{m.avgHours}h</td>
                      </tr>
                      {selectedManager === m.name && shopRows.map((s, si) => (
                        <tr key={`shop-${si}`} className="bg-slate-50/50 text-xs font-bold">
                          <td className="px-12 py-3 italic text-slate-500 border-l-4 border-red-500">{s.name}</td>
                          <td className="px-4 py-3 text-center">{s.targetGA}</td>
                          <td className="px-4 py-3 text-center text-red-500">{s.totalGA}</td>
                          <td className="px-4 py-3 text-center">{s.completionGA}%</td>
                          <td className="px-4 py-3 text-center text-red-900">{s.remainingGA}</td>
                          <td className="px-4 py-3 text-center">{s.targetOC}</td>
                          <td className="px-4 py-3 text-center text-blue-500">{s.totalOC}</td>
                          <td className="px-4 py-3 text-center">{s.completionOC}%</td>
                          <td className="px-8 py-3 text-center">{s.avgHours}h</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showClosedModal && (
        <ClosedShopsModal
          shops={operationalStats.closedShopsList}
          onClose={() => setShowClosedModal(false)}
        />
      )}
    </div>
  );
}

function ClosedShopsModal({ shops, onClose }) {
  const cardRef = React.useRef(null);
  const [exporting, setExporting] = useState(false);
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const today = new Date().toISOString().split('T')[0];

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
      ctx.beginPath();
      ctx.arc(paddingX + 6, titleBarH / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillText('Cash Shop', paddingX + 20, titleBarH / 2 + 5);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(paddingX + 98, titleBarH / 2 - 8, 1, 16);
      ctx.fillStyle = '#64748B';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText('PERFORMANCE DASHBOARD', paddingX + 108, titleBarH / 2 + 4);

      let y = titleBarH;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, W, headerH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'italic 900 20px system-ui, sans-serif';
      ctx.fillText('The Closed CashShops', paddingX, y + 32);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText('FOR  ' + dateStr.toUpperCase(), paddingX, y + 52);
      const badgeW = 52, badgeH = 30;
      const badgeX = W - paddingX - badgeW, badgeY = y + (headerH - badgeH) / 2;
      ctx.fillStyle = '#EF4444';
      roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(shops.length), badgeX + badgeW / 2, badgeY + badgeH / 2 + 6);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(0, y + headerH - 3, W, 3);

      y = titleBarH + headerH;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, y, W, bodyH);

      if (shops.length === 0) {
        ctx.fillStyle = '#ECFDF5';
        ctx.beginPath();
        ctx.arc(W / 2, y + emptyH / 2 - 10, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.font = '900 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', W / 2, y + emptyH / 2 - 2);
        ctx.fillStyle = '#1E293B';
        ctx.font = '900 14px system-ui, sans-serif';
        ctx.fillText('All Shops Active!', W / 2, y + emptyH / 2 + 22);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText('Every shop submitted data today.', W / 2, y + emptyH / 2 + 40);
        ctx.textAlign = 'left';
      } else {
        let ry = y + listPaddingY;
        shops.forEach((shop) => {
          ctx.fillStyle = '#F8FAFC';
          roundRect(paddingX, ry, W - paddingX * 2, rowH - 4, 10);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          roundRect(paddingX, ry, 3, rowH - 4, 2);
          ctx.fill();
          ctx.fillStyle = '#FEE2E2';
          roundRect(paddingX + 12, ry + (rowH - 4) / 2 - 14, 28, 28, 7);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.font = '14px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⌂', paddingX + 12 + 14, ry + (rowH - 4) / 2 + 5);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#1E293B';
          ctx.font = '900 13px system-ui, sans-serif';
          ctx.fillText(shop.name, paddingX + 52, ry + (rowH - 4) / 2 - 2);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.fillText(shop.manager.toUpperCase(), paddingX + 52, ry + (rowH - 4) / 2 + 14);
          const bdgW = 58, bdgH = 20;
          const bdgX = W - paddingX - bdgW, bdgY = ry + (rowH - 4) / 2 - bdgH / 2;
          ctx.fillStyle = '#FEE2E2';
          roundRect(bdgX, bdgY, bdgW, bdgH, 5);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.font = '800 9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('NO DATA', bdgX + bdgW / 2, bdgY + bdgH / 2 + 3);
          ctx.textAlign = 'left';
          ry += rowH + 8;
        });
      }

      y = titleBarH + headerH + bodyH;
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, y, W, footerH);
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CASH SHOP SALES SYSTEM  ·  ONE TEAM ONE GOAL', W / 2, y + footerH / 2 + 3);
      ctx.textAlign = 'left';

      const link = document.createElement('a');
      link.download = `Closed_CashShops_${today}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div ref={cardRef} style={{ borderRadius: '1.5rem', overflow: 'hidden', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          <div style={{ background: '#0F172A', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontStyle: 'italic', letterSpacing: '-0.3px' }}>Closed Shops Today</span>
              </div>
              <span style={{ color: '#475569', fontWeight: 800, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{dateStr}</span>
            </div>
            <div style={{ background: '#EF4444', color: 'white', borderRadius: 8, padding: '3px 10px', fontWeight: 900, fontSize: 16 }}>
              {shops.length}
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: 'white', maxHeight: '52vh', overflowY: 'auto' }}>
            {shops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 40, height: 40, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontWeight: 900, color: '#1E293B', fontSize: 13, margin: 0 }}>All Shops Active!</p>
                <p style={{ fontWeight: 600, color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Every shop submitted data today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shops.map((shop, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 10, borderLeft: '3px solid #EF4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, background: '#FEE2E2', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                      <div>
                        <p style={{ fontWeight: 900, color: '#1E293B', fontSize: 12, margin: 0 }}>{shop.name}</p>
                        <p style={{ fontWeight: 700, color: '#94A3B8', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{shop.manager}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#EF4444', background: '#FEE2E2', padding: '3px 8px', borderRadius: 6 }}>No Data</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#CBD5E1' }}>
              Cash Shop Sales System — ONE Team One Goal
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={exportAsPng}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-800 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-800/80 text-slate-300 rounded-xl font-black text-xs hover:bg-slate-700 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SalesCollectionForm({ areaManagers, shops, user, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [formData, setFormData] = useState({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: '' });
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
        areaManager: isAdmin ? formData.areaManager : assigned, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        workingHours: Number(formData.workingHours), 
        timestamp: Date.now(), 
        submittedBy: user.uid 
      }); 
      setSuccess(true); 
      setFormData({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: '' }); 
      setTimeout(() => setSuccess(false), 3000); 
    } catch (err) { console.error("Submit error:", err); } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-black text-slate-800 mb-8 text-center italic uppercase tracking-tighter">Daily Sales Entry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-3xl shadow-2xl space-y-8 border border-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
            <input required type="date" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Manager</label>
            <select required disabled={!isAdmin} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={isAdmin ? formData.areaManager : assigned} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Shop</label>
            <select required className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Select Shop</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Hours Worked</label>
            <input required type="number" step="0.5" placeholder="e.g. 8" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input required type="number" placeholder="GA Ach" className="w-full bg-red-50 p-6 rounded-3xl text-3xl font-black text-red-600 outline-none border border-red-100" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-6 rounded-3xl text-3xl font-black text-blue-600 outline-none border border-blue-100" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <textarea placeholder="Shift notes..." className="w-full bg-slate-50 p-4 rounded-2xl min-h-[100px] outline-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black text-center uppercase">Records Saved</div>}
        <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-black transition-all">Submit</button>
      </form>
    </div>
  );
}

function SalesList({ records, targets, shops, managers, role, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [filterShop, setFilterShop] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => { 
    let data = [...records]; 
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager); 
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    if (dateFrom) data = data.filter(r => r.date >= dateFrom);
    if (dateTo) data = data.filter(r => r.date <= dateTo);
    return data; 
  }, [records, filterManager, filterShop, dateFrom, dateTo]);

  const availableShopsForFilter = useMemo(() => {
    if (filterManager === 'All') return shops;
    return shops.filter(s => s.manager === filterManager);
  }, [shops, filterManager]);

  const exportToExcel = () => {
    const headers = ['Timestamp', 'Date', 'Area Manager', 'Shop Name', 'GA Ach', 'GA %', 'OC Ach', 'OC %', 'Hours Worked'];
    const rows = filtered.map(r => [
      new Date(r.timestamp).toLocaleString(),
      r.date,
      r.areaManager,
      r.shopName,
      r.gaAch,
      targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) + '%' : '0%',
      r.ocAch,
      targets[r.shopName]?.oc > 0 ? (r.ocAch / targets[r.shopName].oc * 100).toFixed(1) + '%' : '0%',
      r.workingHours + 'h'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    const dateLabel = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : new Date().toLocaleDateString();
    link.setAttribute('download', `Audit_Trail_${dateLabel}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setFilterManager(isAdmin ? 'All' : assignedManager); setFilterShop('All'); };
  const hasActiveFilters = dateFrom || dateTo || filterShop !== 'All' || (isAdmin && filterManager !== 'All');

  // Current month label for the header
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">Sales History</h2>
          <p className="text-xs font-black uppercase text-red-500 tracking-widest mt-1">{currentMonthLabel}</p>
          {filtered.length > 0 && <p className="text-xs font-black uppercase text-slate-400 tracking-widest mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>}
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Filter size={14} /> Filters</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
              <X size={12} /> Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">From</label>
            <input type="date" className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-red-200 transition-all" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">To</label>
            <input type="date" className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-red-200 transition-all" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Manager</label>
              <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-red-200 transition-all">
                <option value="All">All Managers</option>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Shop</label>
            <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-red-200 transition-all">
              <option value="All">All Shops</option>
              {availableShopsForFilter.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
            {dateFrom && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black">From: {dateFrom}</span>}
            {dateTo && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black">To: {dateTo}</span>}
            {isAdmin && filterManager !== 'All' && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">{filterManager}</span>}
            {filterShop !== 'All' && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">{filterShop}</span>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden overflow-x-auto border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-xs font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Time Stamp</th>
              <th className="px-8 py-6">Date</th>
              <th className="px-8 py-6">Area Manager</th>
              <th className="px-8 py-6">Shop Name</th>
              <th className="px-8 py-6 text-center">GA Ach</th>
              <th className="px-8 py-6 text-center">GA %</th>
              <th className="px-8 py-6 text-center">OC Ach</th>
              <th className="px-8 py-6 text-center">OC %</th>
              <th className="px-8 py-6 text-center">Hours Worked</th>
              {role === 'admin' && <th className="px-8 py-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold tabular-nums">
            {filtered.length === 0 ? (
              <tr><td colSpan={role === 'admin' ? 10 : 9} className="px-8 py-10 text-center text-slate-300 italic">No records found matching filters.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-slate-400 text-xs">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-8 py-5 text-slate-700">{r.date}</td>
                <td className="px-8 py-5 text-slate-800 font-black">{r.areaManager}</td>
                <td className="px-8 py-5 text-slate-500 italic">{r.shopName}</td>
                <td className="px-8 py-5 text-center text-red-600">+{r.gaAch}</td>
                <td className="px-8 py-5 text-center text-xs text-red-700">{(targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) : 0)}%</td>
                <td className="px-8 py-5 text-center text-blue-600">+{r.ocAch}</td>
                <td className="px-8 py-5 text-center text-xs text-blue-700">{(targets[r.shopName]?.oc > 0 ? (r.ocAch / targets[r.shopName].oc * 100).toFixed(1) : 0)}%</td>
                <td className="px-8 py-5 text-center text-slate-400 text-xs">{r.workingHours}h</td>
                {role === 'admin' && <td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm("Delete record?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>}
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
  const handleCSVUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = async (event) => {
      const text = event.target.result; const rows = text.split('\n').map(r => r.split(',')); const newTargets = { ...targets };
      rows.slice(1).forEach(row => { if (row.length >= 3) { const name = row[0].trim().replace(/"/g, ''); if (shops.some(s => s.name === name)) newTargets[name] = { ga: parseFloat(row[1]) || 0, oc: parseFloat(row[2]) || 0 }; } });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true });
    }; reader.readAsText(file);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black uppercase italic">Monthly Targets</h2>
        <label className="bg-red-600 text-white px-5 py-3 rounded-2xl text-xs font-black cursor-pointer uppercase shadow-lg">
          <Upload size={14} className="inline mr-2" /> Upload CSV
          <input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} />
        </label>
      </div>
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
            <tr><th className="px-8 py-5">Shop Name</th><th className="px-4 py-5 text-center">GA Target</th><th className="px-4 py-5 text-center">OC Target</th><th className="px-8 py-5 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shops.map(shop => (
              <tr key={shop.name} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-black text-slate-800 text-lg">{shop.name}</td>
                <td className="px-4 py-5 text-center font-black text-red-600">
                  {editingShop === shop.name ? <input type="number" className="w-20 bg-slate-50 p-2 text-center" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : (targets[shop.name]?.ga || 0)}
                </td>
                <td className="px-4 py-5 text-center font-black text-blue-600">
                  {editingShop === shop.name ? <input type="number" className="w-20 bg-slate-50 p-2 text-center" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : (targets[shop.name]?.oc || 0)}
                </td>
                <td className="px-8 py-5 text-right">
                  {editingShop === shop.name ? 
                    <button onClick={async () => { const newTargets = { ...targets, [shop.name]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } }; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true }); setEditingShop(null); }} className="text-emerald-500"><Check /></button> : 
                    <button onClick={() => { setEditingShop(shop.name); setEditForm({ ga: targets[shop.name]?.ga || 0, oc: targets[shop.name]?.oc || 0 }); }} className="text-slate-300 hover:text-red-500"><Edit3 size={18} /></button>
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
  const handleDeleteUser = async (uid) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
    }
  };
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase italic tracking-tighter">Team Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 group relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 uppercase">{u.username?.charAt(0)}</div>
              <div>
                <p className="font-black text-slate-800 text-lg">{u.username}</p>
                <span className="text-xs font-black uppercase tracking-widest text-red-600">{u.assignedManager || 'No Region'}</span>
              </div>
            </div>
            <button onClick={() => handleDeleteUser(u.uid)} className="absolute top-6 right-6 p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
            {editingId === u.uid ? (
              <div className="space-y-3">
                <select className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="user">USER</option>
                  <option value="admin">ADMIN</option>
                </select>
                <select className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none" value={editForm.assignedManager} onChange={e => setEditForm({...editForm, assignedManager: e.target.value})}>
                  <option value="">Assign Manager</option>
                  {managers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(u.uid)} className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-black">Save</button>
                  <button onClick={() => setEditingId(null)} className="p-3 bg-slate-100 rounded-xl"><X size={18}/></button>
                </div>
              </div>
            ) : ( 
              <button onClick={() => { setEditingId(u.uid); setEditForm({ username: u.username, role: u.role, assignedManager: u.assignedManager || '' }); }} className="w-full bg-slate-50 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Modify Profile</button> 
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
    <div className="space-y-10">
      <h2 className="text-4xl font-black italic uppercase tracking-tighter">System Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-red-600 uppercase text-xs tracking-widest mb-2 flex items-center gap-2"><UserPlus size={18} /> Add Area Manager</h3>
          <div className="flex gap-2">
            <input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-bold outline-none" placeholder="Manager Name" />
            <button onClick={() => { update([...areaManagers, newM], null); setNewM(''); }} className="bg-red-600 text-white px-6 rounded-xl font-black shadow-lg">Add</button>
          </div>
        </div>
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-red-600 uppercase text-xs tracking-widest mb-2 flex items-center gap-2"><Store size={18} /> Add Shop</h3>
          <div className="flex flex-col gap-2">
            <input value={newS} onChange={e => setNewS(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold outline-none" placeholder="Shop Name" />
            <select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold outline-none">
              <option value="">Assign Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => { if(newS && assignedM) update(null, [...shops, {name: newS, manager: assignedM}]); setNewS(''); }} className="bg-slate-900 text-white p-4 rounded-xl font-black">Link Shop</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-xs font-black uppercase tracking-widest">
            <tr><th className="px-10 py-6">Manager</th><th className="px-10 py-6">Shop</th><th className="px-10 py-6 text-right">Delete</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shops.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-10 py-6 font-black text-slate-800">{s.manager}</td>
                <td className="px-10 py-6 font-bold text-slate-400">{s.name}</td>
                <td className="px-10 py-6 text-right">
                  <button onClick={() => { if(confirm("Delete shop?")) update(null, shops.filter(sh => sh.name !== s.name)); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function Navigation({ view, setView, role, onLogout }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] },
    { id: 'reports', label: 'Sales History', icon: ClipboardList, roles: ['admin', 'user'] },
    { id: 'archive', label: 'Archive', icon: Archive, roles: ['admin', 'user'] },
    { id: 'targets', label: 'Targets', icon: Target, roles: ['admin'] },
    { id: 'userSearch', label: 'Team', icon: UsersIcon, roles: ['admin'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] }
  ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 px-2 flex items-center gap-3">
        <Store className="text-red-600" size={24} />
        <h1 className="text-xl font-black text-white italic tracking-tighter">Cash Shop</h1>
      </div>
      <div className="space-y-1 flex-1">
        {links.map(link => link.roles.includes(role) && (
          <button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${view === link.id ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
            <link.icon size={18} />
            <span className="font-black text-xs uppercase tracking-widest">{link.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-4 text-red-400 font-black text-xs uppercase tracking-widest transition-all hover:text-red-300">
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
    {id:'archive', icon:Archive, roles:['admin','user']},
    {id:'targets', icon:Target, roles:['admin']},
    {id:'userSearch', icon:UsersIcon, roles:['admin']}
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 rounded-t-3xl shadow-2xl">
      {icons.map(item => item.roles.includes(role) && (
        <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-2xl ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}>
          <item.icon size={22} />
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
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Processing Cloud Assets...</p>
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
