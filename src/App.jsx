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
  FileText,
  Clock,
  LayoutDashboard,
  ChevronRight,
  ChevronDown
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'pyramids-sales-v1';

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
    if (!user || !userProfile) return;

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
      if (userProfile.role === 'admin') setSalesRecords(sorted);
      else setSalesRecords(sorted.filter(r => r.submittedBy === user.uid));
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

// --- DASHBOARD ---
function Dashboard({ records, targets, shops, managers, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';
  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [selectedManager, setSelectedManager] = useState(null);
  
  const [tableSearch, setTableSearch] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('All');

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
    // Only show assigned manager for normal users, or all for admins
    const activeManagers = isAdmin ? managers : managers.filter(m => m === assignedManager);

    activeManagers.forEach(m => {
      summary[m] = { 
        name: m, totalGA: 0, totalOC: 0, entryCount: 0, totalHours: 0,
        targetGA: 0, targetOC: 0, lastActivity: null 
      };
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
  }, [filteredRecords, managers, shops, targets, isAdmin, assignedManager]);

  const filteredManagerSummary = useMemo(() => {
    return managerSummary.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(tableSearch.toLowerCase());
      const numCompletion = parseFloat(m.completionGA);
      if (performanceFilter === 'Under') return matchesSearch && numCompletion < 50;
      if (performanceFilter === 'Good') return matchesSearch && numCompletion >= 50 && numCompletion < 100;
      if (performanceFilter === 'Full') return matchesSearch && numCompletion >= 100;
      return matchesSearch;
    });
  }, [managerSummary, tableSearch, performanceFilter]);

  const shopDetails = useMemo(() => {
    if (!selectedManager) return [];
    return shops.filter(s => s.manager === selectedManager).map(s => {
      const shopRecords = filteredRecords.filter(r => r.shopName === s.name);
      const totalGA = shopRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
      const totalOC = shopRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
      const totalHours = shopRecords.reduce((acc, r) => acc + parseFloat(r.workingHours || 0), 0);
      const target = targets[s.name] || { ga: 0, oc: 0 };
      return {
        name: s.name, targetGA: target.ga, totalGA, completionGA: target.ga > 0 ? ((totalGA / target.ga) * 100).toFixed(1) : 0,
        remainingGA: Math.max(0, target.ga - totalGA), targetOC: target.oc, totalOC,
        completionOC: target.oc > 0 ? ((totalOC / target.oc) * 100).toFixed(1) : 0,
        avgHours: shopRecords.length > 0 ? (totalHours / shopRecords.length).toFixed(1) : 0
      };
    });
  }, [selectedManager, shops, filteredRecords, targets]);

  const operationalStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const relevantShops = isAdmin ? shops : shops.filter(s => s.manager === assignedManager);
    const activeShopNamesToday = [...new Set(records.filter(r => r.date === today).map(r => r.shopName))];
    
    const totalGA = filteredRecords.reduce((acc, r) => acc + (r.gaAch || 0), 0);
    const totalOC = filteredRecords.reduce((acc, r) => acc + (r.ocAch || 0), 0);
    
    return { 
      totalGA, 
      totalOC, 
      closedShopsToday: Math.max(0, relevantShops.length - activeShopNamesToday.filter(name => relevantShops.some(s => s.name === name)).length) 
    };
  }, [records, shops, filteredRecords, isAdmin, assignedManager]);

  const exportSummaryExcel = () => {
    const headers = ['Manager', 'GA Target', 'GA Ach.', 'GA %', 'GA Remaining', 'OC Target', 'OC Ach.', 'OC %', 'Avg Hours'];
    const rows = filteredManagerSummary.map(m => [
      m.name, m.targetGA, m.totalGA, m.completionGA + '%', m.remainingGA,
      m.targetOC, m.totalOC, m.completionOC + '%', m.avgHours
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200"><LayoutDashboard className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">
              {isAdmin ? "Performance Hub" : "Your Performance"}
            </h2>
          </div>
        </div>
        {isAdmin && (
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase text-slate-400">View Region:</span>
             <select 
               value={filterManager} 
               onChange={e => setFilterManager(e.target.value)} 
               className="text-xs font-black uppercase tracking-widest p-3 bg-white border border-slate-100 rounded-xl shadow-sm outline-none cursor-pointer"
             >
               <option value="All">All Regions</option>
               {managers.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center"><h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-red-500" /> {isAdmin ? "Latest Activity" : "Recent Submissions"}</h3></div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr className="tracking-widest"><th className="px-6 py-4">Area Manager</th><th className="px-6 py-4">Last Sales Date & Time</th></tr></thead>
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
          <div className="bg-red-600 p-6 rounded-[2rem] text-white shadow-xl shadow-red-100">
            <p className="text-[10px] font-black uppercase text-red-100 mb-1">Total GA Achieved</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalGA.toLocaleString()}</h4>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-100">
            <p className="text-[10px] font-black uppercase text-blue-100 mb-1">Total OC Achieved</p>
            <h4 className="text-3xl font-black italic">{operationalStats.totalOC.toLocaleString()}</h4>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Closed Shops Today</p>
            <h4 className="text-3xl font-black italic">{operationalStats.closedShopsToday}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-black text-slate-800 text-lg tracking-tight">
              {isAdmin ? "Manager Performance Summary" : "Regional Performance Summary"}
            </h3>
            <div className="flex items-center gap-2 no-print">
              <button onClick={exportSummaryExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all">
                <FileSpreadsheet size={16} /> Export Excel
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                <FileText size={16} /> Save PDF
              </button>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-4 no-print border-t pt-6 border-slate-50">
               <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" placeholder="Search manager..." className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none" value={tableSearch} onChange={e => setTableSearch(e.target.value)}/>
               </div>
               <select className="px-4 py-3 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none" value={performanceFilter} onChange={e => setPerformanceFilter(e.target.value)}>
                  <option value="All">All Performance</option>
                  <option value="Full">Achieved (100%+)</option>
                  <option value="Good">In Progress (50-99%)</option>
                  <option value="Under">Critical (&lt;50%)</option>
               </select>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr><th className="px-8 py-5">Area Manager</th><th className="px-4 py-5 text-center">GA Target</th><th className="px-4 py-5 text-center">GA Ach.</th><th className="px-4 py-5 text-center">%</th><th className="px-4 py-5 text-center">Remaining</th><th className="px-4 py-5 text-center">OC Target</th><th className="px-4 py-5 text-center">OC Ach.</th><th className="px-4 py-5 text-center">%</th><th className="px-8 py-5 text-center">AVG Hours</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredManagerSummary.length === 0 ? (
                <tr><td colSpan="9" className="px-8 py-10 text-center text-slate-300 italic font-bold">No performance records found.</td></tr>
              ) : filteredManagerSummary.map((m, idx) => (
                <React.Fragment key={idx}>
                  <tr onClick={() => setSelectedManager(selectedManager === m.name ? null : m.name)} className={`cursor-pointer transition-colors ${selectedManager === m.name ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-8 py-5 font-black text-slate-700 flex items-center gap-2">{selectedManager === m.name ? <ChevronDown size={14} className="text-red-500" /> : <ChevronRight size={14} className="text-slate-300" />}{m.name}</td>
                    <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetGA.toLocaleString()}</td>
                    <td className="px-4 py-5 text-center font-black text-red-600">{m.totalGA.toLocaleString()}</td>
                    <td className="px-4 py-5 text-center font-black text-red-700">{m.completionGA}%</td>
                    <td className="px-4 py-5 text-center font-bold text-red-900">{m.remainingGA.toLocaleString()}</td>
                    <td className="px-4 py-5 text-center font-bold text-slate-400">{m.targetOC.toLocaleString()}</td>
                    <td className="px-4 py-5 text-center font-black text-blue-600">{m.totalOC.toLocaleString()}</td>
                    <td className="px-4 py-5 text-center font-black text-blue-700">{m.completionOC}%</td>
                    <td className="px-8 py-5 text-center font-bold text-slate-500">{m.avgHours}h</td>
                  </tr>
                  {selectedManager === m.name && shopDetails.map((s, si) => (
                    <tr key={`shop-${si}`} className="bg-slate-50/50 text-[11px] font-bold"><td className="px-12 py-3 italic text-slate-500 border-l-4 border-red-500">{s.name}</td><td className="px-4 py-3 text-center">{s.targetGA}</td><td className="px-4 py-3 text-center text-red-500">{s.totalGA}</td><td className="px-4 py-3 text-center">{s.completionGA}%</td><td className="px-4 py-3 text-center text-red-900">{s.remainingGA}</td><td className="px-4 py-3 text-center">{s.targetOC}</td><td className="px-4 py-3 text-center text-blue-500">{s.totalOC}</td><td className="px-4 py-3 text-center">{s.completionOC}%</td><td className="px-8 py-3 text-center">{s.avgHours}h</td></tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- SALES COLLECTION FORM ---
function SalesCollectionForm({ areaManagers, shops, user, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assigned = userProfile?.assignedManager || '';
  const [formData, setFormData] = useState({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableShops = useMemo(() => { const mgr = isAdmin ? formData.areaManager : assigned; return mgr ? shops.filter(s => s.manager === mgr) : []; }, [formData.areaManager, shops, isAdmin, assigned]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), { 
        ...formData, 
        areaManager: isAdmin ? formData.areaManager : assigned, 
        gaAch: Number(formData.gaAch), 
        ocAch: Number(formData.ocAch), 
        workingHours: Number(formData.workingHours), // Stored as Number for easy AVG
        timestamp: Date.now(), 
        submittedBy: user.uid 
      }); 
      setSuccess(true); 
      setFormData({ areaManager: isAdmin ? '' : assigned, shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '', date: new Date().toISOString().split('T')[0] }); 
      setTimeout(() => setSuccess(false), 3000); 
    } catch (err) { console.error(err); } 
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-black text-slate-800 mb-8 text-center italic uppercase tracking-tighter">Daily Sales Entry</h2>
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label><input required type="date" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Manager</label><select required disabled={!isAdmin} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={isAdmin ? formData.areaManager : assigned} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shop</label><select required className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}><option value="">Select Shop</option>{availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select></div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hours Worked</label>
            <input required type="number" step="0.5" placeholder="e.g. 8" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input required type="number" placeholder="GA Ach" className="w-full bg-red-50 p-6 rounded-[2rem] text-3xl font-black text-red-600 outline-none border border-red-100" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          <input required type="number" placeholder="OC Ach" className="w-full bg-blue-50 p-6 rounded-[2rem] text-3xl font-black text-blue-600 outline-none border border-blue-100" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
        </div>
        <textarea placeholder="Shift notes..." className="w-full bg-slate-50 p-4 rounded-2xl min-h-[100px] outline-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black text-center uppercase">Records Saved</div>}
        <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-black transition-all">Submit</button>
      </form>
    </div>
  );
}

// --- AUDIT TRAIL ---
function SalesList({ records, targets, shops, managers, role, db, appId, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';
  const assignedManager = userProfile?.assignedManager || '';

  const [filterManager, setFilterManager] = useState(isAdmin ? 'All' : assignedManager);
  const [filterShop, setFilterShop] = useState('All');
  const [startDate, setStartDate] = useState('');

  const filtered = useMemo(() => { 
    let data = [...records]; 
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager); 
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    if (startDate) data = data.filter(r => r.date === startDate); 
    return data; 
  }, [records, filterManager, filterShop, startDate]);

  const availableShopsForFilter = useMemo(() => {
    if (filterManager === 'All') return shops;
    return shops.filter(s => s.manager === filterManager);
  }, [shops, filterManager]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase">Audit Trail</h2>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <input 
            type="date" 
            className="bg-white p-3 rounded-xl text-xs font-black shadow-sm outline-none flex-1 md:flex-none" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
          />
          {isAdmin && (
            <select 
              value={filterManager} 
              onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }} 
              className="bg-white p-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm outline-none flex-1 md:flex-none"
            >
              <option value="All">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <select 
            value={filterShop} 
            onChange={e => setFilterShop(e.target.value)} 
            className="bg-white p-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm outline-none flex-1 md:flex-none"
          >
            <option value="All">All Shops</option>
            {availableShopsForFilter.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden overflow-x-auto border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr className="tracking-widest">
              <th className="px-8 py-6">Time Stamp</th>
              <th className="px-8 py-6">Date</th>
              <th className="px-8 py-6">Area Manager</th>
              <th className="px-8 py-6">Shop Name</th>
              <th className="px-8 py-6 text-center">GA Ach</th>
              <th className="px-8 py-6 text-center">GA % </th>
              <th className="px-8 py-6 text-center">OC Ach</th>
              <th className="px-8 py-6 text-center">Hours Worked</th>
              {role === 'admin' && <th className="px-8 py-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold tabular-nums">
            {filtered.length === 0 ? (
              <tr><td colSpan={role === 'admin' ? 9 : 8} className="px-8 py-10 text-center text-slate-300 italic">No records found matching filters.</td></tr>
            ) : filtered.map(r => (<tr key={r.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-8 py-5 text-slate-400 text-[10px]">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="px-8 py-5 text-slate-700">{r.date}</td>
              <td className="px-8 py-5 text-slate-800 font-black">{r.areaManager}</td>
              <td className="px-8 py-5 text-slate-500 italic">{r.shopName}</td>
              <td className="px-8 py-5 text-center text-red-600">+{r.gaAch}</td>
              <td className="px-8 py-5 text-center text-[10px] text-red-700">{(targets[r.shopName]?.ga > 0 ? (r.gaAch / targets[r.shopName].ga * 100).toFixed(1) : 0)}%</td>
              <td className="px-8 py-5 text-center text-blue-600">+{r.ocAch}</td>
              <td className="px-8 py-5 text-center text-slate-400 text-[10px]">{r.workingHours}h</td>
              {role === 'admin' && <td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm("Delete record?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sales', r.id)); }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>}
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TARGETS ---
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
      <div className="flex justify-between items-center"><h2 className="text-3xl font-black uppercase italic">Monthly Targets</h2><label className="bg-red-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black cursor-pointer uppercase shadow-lg"><Upload size={14} className="inline mr-2" /> Upload CSV<input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} /></label></div>
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-8 py-5">Shop Name</th><th className="px-8 py-5 text-center">GA Target</th><th className="px-8 py-5 text-center">OC Target</th><th className="px-8 py-5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {shops.map(shop => (<tr key={shop.name} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-5 font-black text-slate-800 text-lg">{shop.name}</td>
              <td className="px-8 py-5 text-center font-black text-red-600">{editingShop === shop.name ? <input type="number" className="w-20 bg-slate-50 p-2 text-center" value={editForm.ga} onChange={e => setEditForm({...editForm, ga: e.target.value})} /> : (targets[shop.name]?.ga || 0)}</td>
              <td className="px-8 py-5 text-center font-black text-blue-600">{editingShop === shop.name ? <input type="number" className="w-20 bg-slate-50 p-2 text-center" value={editForm.oc} onChange={e => setEditForm({...editForm, oc: e.target.value})} /> : (targets[shop.name]?.oc || 0)}</td>
              <td className="px-8 py-5 text-right">{editingShop === shop.name ? <button onClick={async () => { const newTargets = { ...targets, [shop.name]: { ga: Number(editForm.ga), oc: Number(editForm.oc) } }; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { targets: newTargets, areaManagers, shops }, { merge: true }); setEditingShop(null); }} className="text-emerald-500"><Check /></button> : <button onClick={() => { setEditingShop(shop.name); setEditForm({ ga: targets[shop.name]?.ga || 0, oc: targets[shop.name]?.oc || 0 }); }} className="text-slate-300 hover:text-red-500"><Edit3 size={18} /></button>}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TEAM ---
function UserSearch({ users, db, appId, managers }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user', assignedManager: '' });
  const handleUpdate = async (uid) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid), editForm); setEditingId(null); };
  
  const handleDeleteUser = async (uid) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase italic tracking-tighter">Team Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.uid} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4 group relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 uppercase">{u.username?.charAt(0)}</div>
              <div>
                <p className="font-black text-slate-800 text-lg">{u.username}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">{u.assignedManager || 'No Region'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => handleDeleteUser(u.uid)} 
              className="absolute top-6 right-6 p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>

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
              <button onClick={() => { setEditingId(u.uid); setEditForm({ username: u.username, role: u.role, assignedManager: u.assignedManager || '' }); }} className="w-full bg-slate-50 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Modify Profile</button> 
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- ADMIN ---
function AdminDashboard({ areaManagers, shops, targets, db, appId }) {
  const [newM, setNewM] = useState(''); const [newS, setNewS] = useState(''); const [assignedM, setAssignedM] = useState('');
  const update = async (m, s) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { areaManagers: m || areaManagers, shops: s || shops, targets }); };
  return (
    <div className="space-y-10">
      <h2 className="text-4xl font-black italic uppercase tracking-tighter">System Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2 text-red-600"><UserPlus size={18} /> Add Area Manager</h3>
          <div className="flex gap-2"><input value={newM} onChange={e => setNewM(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-bold outline-none" placeholder="Manager Name" /><button onClick={() => { update([...areaManagers, newM], null); setNewM(''); }} className="bg-red-600 text-white px-6 rounded-xl font-black shadow-lg">Add</button></div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2 text-red-600"><Store size={18} /> Add Shop</h3>
          <div className="flex flex-col gap-2"><input value={newS} onChange={e => setNewS(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold outline-none" placeholder="Shop Name" /><select value={assignedM} onChange={e => setAssignedM(e.target.value)} className="bg-slate-50 p-4 rounded-xl font-bold outline-none"><option value="">Assign Manager</option>{areaManagers.map(m => <option key={m} value={m}>{m}</option>)}</select><button onClick={() => { if(newS && assignedM) update(null, [...shops, {name: newS, manager: assignedM}]); setNewS(''); }} className="bg-slate-900 text-white p-4 rounded-xl font-black">Link Shop</button></div>
        </div>
      </div>
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden overflow-x-auto"><table className="w-full text-left"><thead className="bg-[#0F172A] text-slate-400 text-[10px] font-black uppercase tracking-widest"><tr><th className="px-10 py-6">Manager</th><th className="px-10 py-6">Shop</th><th className="px-10 py-6 text-right">Delete</th></tr></thead><tbody className="divide-y divide-slate-50">{shops.map((s, idx) => (<tr key={idx} className="hover:bg-slate-50"><td className="px-10 py-6 font-black text-slate-800">{s.manager}</td><td className="px-10 py-6 font-bold text-slate-400">{s.name}</td><td className="px-10 py-6 text-right"><button onClick={() => { if(confirm("Delete shop?")) update(null, shops.filter(sh => sh.name !== s.name)); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
    </div>
  );
}

// --- LOGIN ---
function LoginPortal() {
  const [authMode, setAuthMode] = useState('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  const handle = async (e) => {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try { if (authMode === 'signup') await createUserWithEmailAndPassword(auth, email, password); else if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password); else { await sendPasswordResetEmail(auth, email); setMessage("Reset link sent to your email!"); } } catch (err) { setError(err.message.replace('Firebase:', '')); } setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10"><ShieldCheck className="text-red-600 mx-auto mb-6" size={60} /><h1 className="text-3xl font-black text-slate-800 italic tracking-tighter">Cash Shop Portal</h1><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{authMode === 'forgot' ? 'Recovery Mode' : 'Secured Access'}</p></div>
        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 px-1">Email</label><input required type="email" placeholder="email@company.com" className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none outline-none" value={email} onChange={e => setEmail(e.target.value)} /></div>
          {authMode !== 'forgot' && <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 px-1">Password</label><input required type="password" placeholder="••••••••" className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none outline-none" value={password} onChange={e => setPassword(e.target.value)} /></div>}
          {error && <div className="p-4 bg-red-50 text-red-500 rounded-xl text-[10px] font-black text-center">{error}</div>}
          {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black text-center">{message}</div>}
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all">{loading ? <Loader2 className="animate-spin mx-auto"/> : (authMode === 'forgot' ? 'Send Link' : 'Login')}</button>
        </form>
        <div className="mt-8 text-center flex flex-col gap-2"><button onClick={() => setAuthMode(authMode === 'forgot' ? 'login' : 'forgot')} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-red-600">{authMode === 'forgot' ? 'Back to Login' : 'Forgot Password?'}</button><button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-red-600">{authMode === 'login' ? 'Create Account' : 'Back to Login'}</button></div>
      </div>
    </div>
  );
}

// --- UTILS ---
function Navigation({ view, setView, role, onLogout }) {
  const links = [ { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'user'] }, { id: 'collection', label: 'Sales Entry', icon: PlusCircle, roles: ['admin', 'user'] }, { id: 'reports', label: 'Audit Trail', icon: ClipboardList, roles: ['admin', 'user'] }, { id: 'targets', label: 'Targets', icon: Target, roles: ['admin'] }, { id: 'userSearch', label: 'Team', icon: UsersIcon, roles: ['admin'] }, { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] } ];
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6 z-40">
      <div className="mb-10 px-2 flex items-center gap-3"><Store className="text-red-600" size={24} /><h1 className="text-xl font-black text-white italic tracking-tighter">Cash Shop</h1></div>
      <div className="space-y-1 flex-1">{links.map(link => link.roles.includes(role) && (<button key={link.id} onClick={() => setView(link.id)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${view === link.id ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><link.icon size={18} /> <span className="font-black text-[10px] uppercase tracking-widest">{link.label}</span></button>))}</div>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-4 text-red-400 font-black text-[10px] uppercase tracking-widest transition-all"><LogOut size={18} /> Logout</button>
    </nav>
  );
}
function MobileNav({ view, setView, role }) {
  const icons = [{id:'dashboard', icon:BarChart3, roles:['admin','user']}, {id:'collection', icon:PlusCircle, roles:['admin','user']}, {id:'reports', icon:ClipboardList, roles:['admin','user']}, {id:'targets', icon:Target, roles:['admin']}, {id:'userSearch', icon:UsersIcon, roles:['admin']}];
  return ( <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 md:hidden z-50 rounded-t-3xl shadow-2xl no-print">{icons.map(item => item.roles.includes(role) && ( <button key={item.id} onClick={() => setView(item.id)} className={`p-3 rounded-2xl ${view === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}><item.icon size={22} /></button> ))}</div> );
}
function LoadingScreen() { return ( <div className="flex h-screen items-center justify-center bg-slate-50"><div className="text-center"><Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" /><p className="text-slate-500 font-black text-xs uppercase tracking-widest">Processing Cloud Assets...</p></div></div> ); }
function Onboarding({ user, setView, setUserProfile }) {
  const [name, setName] = useState(''); const handleSave = async () => { if (!name.trim()) return; const profile = { username: name, role: 'user', assignedManager: '', createdAt: Date.now() }; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), profile); setUserProfile(profile); setView('dashboard'); };
  return ( <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4"><div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl text-center"><h2 className="text-2xl font-black text-slate-800 mb-8 italic">Profile Setup</h2><input type="text" value={name} onChange={e => setName(name.target.value)} placeholder="Full Name" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mb-6 text-center text-xl outline-none" /><button onClick={handleSave} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg">Continue</button></div></div> );
}
const styleTag = document.createElement('style');
styleTag.innerHTML = `@media print { .no-print { display: none !important; } body { background: white !important; padding: 0 !important; margin: 0 !important; } main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; } .md\\:pl-64 { padding-left: 0 !important; } nav { display: none !important; } .rounded-\\[2\\.5rem\\], .rounded-\\[3rem\\] { border-radius: 0 !important; border: 1px solid #eee !important; } } .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }`;
document.head.appendChild(styleTag);
