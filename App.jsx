import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  PlusCircle, 
  Store, 
  Users, 
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
  Info
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cash-shop-sales-v3';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [areaManagers, setAreaManagers] = useState([]);
  const [shops, setShops] = useState([]); // Array of { name, manager }
  const [targets, setTargets] = useState({}); // { shopName: { ga: 0, oc: 0 } }
  const [salesRecords, setSalesRecords] = useState([]);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Syncing
  useEffect(() => {
    if (!user) return;

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
      setSalesRecords(records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, (err) => console.error("Sales listener error:", err));

    return () => {
      unsubSettings();
      unsubSales();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-emerald-600">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation view={view} setView={setView} />

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {view === 'dashboard' && (
          <Dashboard 
            records={salesRecords} 
            targets={targets} 
            shops={shops} 
            managers={areaManagers}
          />
        )}
        {view === 'collection' && (
          <SalesCollectionForm 
            areaManagers={areaManagers} 
            shops={shops} 
            appId={appId}
            db={db}
            user={user}
          />
        )}
        {view === 'admin' && (
          <AdminDashboard 
            areaManagers={areaManagers} 
            shops={shops} 
            targets={targets}
            appId={appId}
            db={db}
            user={user}
          />
        )}
        {view === 'reports' && (
          <SalesList 
            records={salesRecords} 
            targets={targets} 
            shops={shops} 
            managers={areaManagers} 
          />
        )}
      </main>

      {/* Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 md:hidden z-50">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={BarChart3} />
        <NavButton active={view === 'collection'} onClick={() => setView('collection')} icon={PlusCircle} />
        <NavButton active={view === 'reports'} onClick={() => setView('reports')} icon={ClipboardList} />
        <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={Settings} />
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} className={`p-2 rounded-lg ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <Icon size={24} />
    </button>
  );
}

function Navigation({ view, setView }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'collection', label: 'Sales Entry', icon: PlusCircle },
    { id: 'reports', label: 'Reports & Export', icon: ClipboardList },
    { id: 'admin', label: 'Admin & Targets', icon: Settings },
  ];

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 p-6">
      <div className="mb-10 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
          <Store className="text-white" size={20} />
        </div>
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Cash Shop</h1>
      </div>
      <div className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.id}
              onClick={() => setView(link.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                view === link.id 
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' 
                  : 'hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{link.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// --- Dashboard Component ---
function Dashboard({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
  const [filterShop, setFilterShop] = useState('All');
  const [timeRange, setTimeRange] = useState('This Month');

  const filteredData = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    
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
  }, [records, filterManager, filterShop, timeRange]);

  const stats = useMemo(() => {
    const totalGA = filteredData.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
    const totalOC = filteredData.reduce((acc, curr) => acc + (curr.ocAch || 0), 0);
    
    let targetGA = 0;
    let targetOC = 0;
    const activeShopNames = filterShop === 'All' 
      ? shops.filter(s => filterManager === 'All' || s.manager === filterManager).map(s => s.name) 
      : [filterShop];
      
    activeShopNames.forEach(s => {
      targetGA += Number(targets[s]?.ga || 0);
      targetOC += Number(targets[s]?.oc || 0);
    });

    return {
      totalGA,
      totalOC,
      targetGA,
      targetOC,
      gaProgress: targetGA > 0 ? (totalGA / targetGA) * 100 : 0,
      ocProgress: targetOC > 0 ? (totalOC / targetOC) * 100 : 0
    };
  }, [filteredData, targets, filterShop, filterManager, shops]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Performance Overview</h2>
          <p className="text-slate-500">Analytics across managers and shops</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
            <Filter size={16} className="text-slate-400" />
            <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }} className="bg-transparent focus:outline-none font-medium cursor-pointer text-slate-700">
              <option value="All">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
            <Store size={16} className="text-slate-400" />
            <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="bg-transparent focus:outline-none font-medium cursor-pointer text-slate-700">
              <option value="All">All Shops</option>
              {shops
                .filter(s => filterManager === 'All' || s.manager === filterManager)
                .map(s => <option key={s.name} value={s.name}>{s.name}</option>)
              }
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
            <Calendar size={16} className="text-slate-400" />
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-transparent focus:outline-none font-medium cursor-pointer text-slate-700">
              <option>Today</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="Total GA Ach" value={stats.totalGA} target={stats.targetGA} progress={stats.gaProgress} color="emerald" />
        <KPIBox title="Total OC Ach" value={stats.totalOC} target={stats.targetOC} progress={stats.ocProgress} color="blue" />
        <KPIBox title="Achievement Rate" value={`${((stats.gaProgress + stats.ocProgress) / 2).toFixed(1)}%`} type="percent" color="purple" />
        <KPIBox title="Total Records" value={filteredData.length} type="count" color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Shop Performance Rankings
          </h3>
          <div className="space-y-6">
            {shops
              .filter(s => filterManager === 'All' || s.manager === filterManager)
              .map(shop => {
                const shopRecords = filteredData.filter(r => r.shopName === shop.name);
                const ga = shopRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
                const target = Number(targets[shop.name]?.ga || 0);
                const percent = target > 0 ? (ga / target) * 100 : 0;
                
                if (filterShop !== 'All' && shop.name !== filterShop) return null;

                return (
                  <div key={shop.name} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{shop.name}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">MGR: {shop.manager}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${percent >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {percent.toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">GA: {ga.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-emerald-400'}`} 
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">Manager Leaderboard</h3>
          <div className="space-y-4">
             {managers.map(m => {
               const mRecords = filteredData.filter(r => r.areaManager === m);
               const mGA = mRecords.reduce((acc, curr) => acc + (curr.gaAch || 0), 0);
               return (
                 <div key={m} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                   <div>
                     <p className="text-sm font-bold text-slate-800">{m}</p>
                     <p className="text-[10px] text-slate-500 uppercase font-black">{mRecords.length} SUBMISSIONS</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-emerald-600">{mGA.toLocaleString()}</p>
                     <p className="text-[9px] text-slate-400 uppercase">TOTAL GA</p>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, target, progress, color, type = 'percent' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100'
  };

  return (
    <div className={`p-6 rounded-[2rem] border ${colors[color]} bg-white shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-black text-slate-900 leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
        {target > 0 && <span className="text-xs text-slate-400 font-medium tracking-tight">/ {target.toLocaleString()}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Progress</span>
            <span className="text-[10px] font-black">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-current opacity-80 transition-all duration-700`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Admin & Targets Setup ---
function AdminDashboard({ areaManagers, shops, targets, appId, db, user }) {
  const [newManager, setNewManager] = useState('');
  const [newShop, setNewShop] = useState('');
  const [assignManager, setAssignManager] = useState('');
  const [editTarget, setEditTarget] = useState({ shop: '', ga: '', oc: '' });
  const [importStatus, setImportStatus] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const updateConfig = async (updatedManagers, updatedShops, updatedTargets) => {
    if (!user) return;
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
      await setDoc(configRef, {
        areaManagers: updatedManagers || areaManagers,
        shops: updatedShops || shops,
        targets: updatedTargets || targets
      });
    } catch (err) {
      console.error(err);
    }
  };

  const seedTestData = async () => {
    if (!user || seeding) return;
    setSeeding(true);
    try {
      const testManagers = ["Sarah Thompson", "David Miller", "Jessica Wu"];
      const testShops = [
        { name: "Downtown Main", manager: "Sarah Thompson" },
        { name: "Harbor Mall", manager: "Sarah Thompson" },
        { name: "North Ridge", manager: "David Miller" },
        { name: "Plaza Central", manager: "David Miller" },
        { name: "Westside Hub", manager: "Jessica Wu" },
      ];
      const testTargets = {
        "Downtown Main": { ga: 25000, oc: 15000 },
        "Harbor Mall": { ga: 18000, oc: 12000 },
        "North Ridge": { ga: 20000, oc: 14000 },
        "Plaza Central": { ga: 15000, oc: 10000 },
        "Westside Hub": { ga: 22000, oc: 16000 },
      };

      await updateConfig(testManagers, testShops, testTargets);

      const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      for (let i = 0; i < 20; i++) {
        const randomShop = testShops[Math.floor(Math.random() * testShops.length)];
        const randomDay = Math.floor(Math.random() * now.getDate()) + 1;
        const timestamp = new Date(currentYear, currentMonth, randomDay, 9 + Math.random() * 9).getTime();

        await addDoc(salesRef, {
          areaManager: randomShop.manager,
          shopName: randomShop.name,
          gaAch: Math.floor(Math.random() * 2000) + 500,
          ocAch: Math.floor(Math.random() * 1000) + 300,
          workingHours: "09:00 - 18:00",
          note: "Test entry generated by system",
          timestamp,
          submittedBy: user.uid
        });
      }
      setImportStatus("Test data seeded successfully!");
    } catch (err) {
      console.error(err);
      setImportStatus("Error seeding data.");
    } finally {
      setSeeding(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const addShop = () => {
    if (!newShop || !assignManager) return;
    updateConfig(null, [...shops, { name: newShop, manager: assignManager }], null);
    setNewShop('');
    setAssignManager('');
  };

  const saveTarget = () => {
    if (!editTarget.shop) return;
    const updated = { ...targets, [editTarget.shop]: { ga: Number(editTarget.ga), oc: Number(editTarget.oc) } };
    updateConfig(null, null, updated);
    setEditTarget({ shop: '', ga: '', oc: '' });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        const newTargets = { ...targets };
        let count = 0;
        rows.slice(1).forEach(row => {
          if (row.length >= 3) {
            const shopName = row[0].trim().replace(/"/g, '');
            const ga = parseFloat(row[1]);
            const oc = parseFloat(row[2]);
            if (shops.some(s => s.name === shopName)) {
              newTargets[shopName] = { ga: ga || 0, oc: oc || 0 };
              count++;
            }
          }
        });
        updateConfig(null, null, newTargets);
        setImportStatus(`Successfully updated ${count} shops.`);
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        setImportStatus("Error parsing file. Ensure it's a valid CSV.");
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = "Shop Name,GA Target,OC Target\n";
    const body = shops.map(s => `"${s.name}",${targets[s.name]?.ga || 0},${targets[s.name]?.oc || 0}`).join("\n");
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'targets_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Controls</h2>
          <p className="text-slate-500">Manage structure, targets, and testing</p>
        </div>
        <button 
          onClick={seedTestData} 
          disabled={seeding}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          {seeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
          Seed Test Data
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Users size={18} /> Area Managers</h3>
            <div className="flex gap-2">
              <input value={newManager} onChange={e => setNewManager(e.target.value)} className="flex-1 border-2 border-slate-50 p-3 rounded-xl text-sm outline-none" placeholder="Name" />
              <button onClick={() => { if(!newManager) return; updateConfig([...areaManagers, newManager], null, null); setNewManager(''); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
            </div>
            <div className="mt-4 space-y-1">
              {areaManagers.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl group">
                  <span className="font-bold">{m}</span>
                  <button onClick={() => updateConfig(areaManagers.filter((_, idx) => idx !== i), null, null)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Store size={18} /> Assign Shops</h3>
            <div className="space-y-3">
              <select value={assignManager} onChange={e => setAssignManager(e.target.value)} className="w-full border-2 border-slate-50 p-3 rounded-xl text-sm outline-none">
                <option value="">Manager</option>
                {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newShop} onChange={e => setNewShop(e.target.value)} className="flex-1 border-2 border-slate-50 p-3 rounded-xl text-sm outline-none" placeholder="Shop Name" />
                <button onClick={addShop} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {shops.map((s, i) => (
                <div key={i} className="flex flex-col text-xs p-3 bg-slate-50 rounded-xl group">
                  <div className="flex justify-between items-center">
                    <span className="font-black">{s.name}</span>
                    <button onClick={() => updateConfig(null, shops.filter((_, idx) => idx !== i), null)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">MGR: {s.manager}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-slate-700"><FileSpreadsheet size={18} /> Bulk Upload</h3>
              <button onClick={downloadTemplate} className="text-xs text-emerald-600 font-black uppercase"><Download size={14} /> Template</button>
            </div>
            <div className="bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-[2rem] p-10 text-center relative hover:bg-emerald-50 cursor-pointer">
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Upload size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-black text-emerald-900 uppercase">Upload CSV</p>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase tracking-tight mb-6">Monthly Targets</h3>
            <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className="border-2 border-slate-100 p-3 rounded-xl text-sm" value={editTarget.shop} onChange={e => setEditTarget({...editTarget, shop: e.target.value})}>
                <option value="">Select Shop</option>
                {shops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <input type="number" className="border-2 border-slate-100 p-3 rounded-xl text-sm" placeholder="GA Goal" value={editTarget.ga} onChange={e => setEditTarget({...editTarget, ga: e.target.value})} />
              <input type="number" className="border-2 border-slate-100 p-3 rounded-xl text-sm" placeholder="OC Goal" value={editTarget.oc} onChange={e => setEditTarget({...editTarget, oc: e.target.value})} />
              <button onClick={saveTarget} className="bg-emerald-600 text-white rounded-xl font-black text-sm">SET</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Sales Entry Form ---
function SalesCollectionForm({ areaManagers, shops, appId, db, user }) {
  const [formData, setFormData] = useState({
    areaManager: '',
    shopName: '',
    gaAch: '',
    ocAch: '',
    workingHours: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableShops = useMemo(() => {
    if (!formData.areaManager) return [];
    return shops.filter(s => s.manager === formData.areaManager);
  }, [formData.areaManager, shops]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sales'), {
        ...formData,
        gaAch: Number(formData.gaAch) || 0,
        ocAch: Number(formData.ocAch) || 0,
        timestamp: Date.now(),
        submittedBy: user.uid
      });
      setSuccess(true);
      setFormData({ areaManager: '', shopName: '', gaAch: '', ocAch: '', workingHours: '', note: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <header className="text-center mb-10">
        <h2 className="text-4xl font-black text-[#0F172A] uppercase tracking-tighter">Daily Entry</h2>
      </header>

      {success && <div className="bg-emerald-600 text-white p-5 rounded-3xl text-center font-black shadow-2xl mb-6">SUCCESSFULLY SAVED</div>}

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Area Manager</label>
            <select required className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-slate-800" value={formData.areaManager} onChange={e => setFormData({...formData, areaManager: e.target.value, shopName: ''})}>
              <option value="">Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shop Name</label>
            <select required disabled={!formData.areaManager} className="w-full border-2 border-slate-50 p-5 rounded-2xl bg-slate-50 font-black text-slate-800 disabled:opacity-30" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}>
              <option value="">Select Shop</option>
              {availableShops.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">GA Achievement</label>
            <input required type="number" className="w-full border-2 border-emerald-50 p-6 rounded-3xl font-black text-4xl text-emerald-600 outline-none focus:border-emerald-500" value={formData.gaAch} onChange={e => setFormData({...formData, gaAch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">OC Achievement</label>
            <input required type="number" className="w-full border-2 border-blue-50 p-6 rounded-3xl font-black text-4xl text-blue-600 outline-none focus:border-blue-500" value={formData.ocAch} onChange={e => setFormData({...formData, ocAch: e.target.value})} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Working Hours</label>
          <input required type="text" placeholder="e.g. 09:00 - 18:00" className="w-full border-2 border-slate-50 p-5 rounded-3xl font-bold" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shift Feedback</label>
          <textarea className="w-full border-2 border-slate-50 p-6 rounded-3xl min-h-[120px]" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-[#0F172A] text-white py-6 rounded-[2rem] font-black text-2xl hover:bg-black disabled:opacity-50">
          {submitting ? 'SAVING...' : 'SUBMIT DATA'}
        </button>
      </form>
    </div>
  );
}

// --- Sales List Component ---
function SalesList({ records, targets, shops, managers }) {
  const [filterManager, setFilterManager] = useState('All');
  const [filterShop, setFilterShop] = useState('All');
  const [timeRange, setTimeRange] = useState('This Month');

  const filteredRecords = useMemo(() => {
    let data = [...records];
    if (filterManager !== 'All') data = data.filter(r => r.areaManager === filterManager);
    if (filterShop !== 'All') data = data.filter(r => r.shopName === filterShop);
    
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
  }, [records, filterManager, filterShop, timeRange]);

  // Aggregate shop totals for cumulative calculations
  const shopAggregates = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!map[r.shopName]) map[r.shopName] = { totalGA: 0, totalOC: 0 };
      map[r.shopName].totalGA += (r.gaAch || 0);
      map[r.shopName].totalOC += (r.ocAch || 0);
    });
    return map;
  }, [filteredRecords]);

  const exportToCSV = () => {
    const headers = [
      'Time Stamp', 'Area Manager', 'Date', 'Shop Name', 
      'GA Target', 'GA Ach', 'GA %', 'GA Remaining', 
      'OC Target', 'OC Ach', 'OC %', 'OC Remaining', 'Notes'
    ];
    
    const rows = filteredRecords.map(r => {
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
        r.note
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => `"${e.join('","')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Detailed_Sales_Log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Operational Audit</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px]">Real-time Historical Submission Data</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
            <Filter size={16} className="text-slate-400" />
            <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setFilterShop('All'); }} className="bg-transparent focus:outline-none font-bold text-slate-600">
              <option value="All">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
            <Store size={16} className="text-slate-400" />
            <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-600">
              <option value="All">All Shops</option>
              {shops
                .filter(s => filterManager === 'All' || s.manager === filterManager)
                .map(s => <option key={s.name} value={s.name}>{s.name}</option>)
              }
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm">
            <Calendar size={16} className="text-slate-400" />
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-transparent focus:outline-none font-bold text-slate-600">
              <option>Today</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
          </div>
          <button onClick={exportToCSV} className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-3 rounded-[1.5rem] font-black text-sm hover:bg-emerald-700 shadow-2xl">
            <Download size={20} /> EXPORT
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <th className="px-6 py-5 text-[10px] font-black uppercase whitespace-nowrap">Time Stamp</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase whitespace-nowrap">Area Manager</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase whitespace-nowrap">Date</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase whitespace-nowrap">Shop Name</th>
              {/* GA Columns */}
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-emerald-900/10">GA Target</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-emerald-900/10 text-emerald-400">GA Ach</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-emerald-900/10">GA %</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-emerald-900/10 text-emerald-200">GA Remaining</th>
              {/* OC Columns */}
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-blue-900/10">OC Target</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-blue-900/10 text-blue-400">OC Ach</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-blue-900/10">OC %</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase whitespace-nowrap text-right bg-blue-900/10 text-blue-200">OC Remaining</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((r) => {
              const target = targets[r.shopName] || { ga: 0, oc: 0 };
              const shopTotals = shopAggregates[r.shopName] || { totalGA: 0, totalOC: 0 };
              const gaPercent = target.ga > 0 ? ((shopTotals.totalGA / target.ga) * 100).toFixed(1) : '0';
              const ocPercent = target.oc > 0 ? ((shopTotals.totalOC / target.oc) * 100).toFixed(1) : '0';

              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-black text-slate-400 tabular-nums">
                    {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{r.areaManager}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800">{r.shopName}</td>
                  
                  {/* GA Rows */}
                  <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-emerald-50/10">{target.ga.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-sm font-black text-emerald-600 bg-emerald-50/20">{r.gaAch.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-xs font-black text-emerald-700 bg-emerald-50/10">{gaPercent}%</td>
                  <td className="px-4 py-4 text-right text-xs font-black text-emerald-800 bg-emerald-50/30">
                    {Math.max(0, target.ga - shopTotals.totalGA).toLocaleString()}
                  </td>

                  {/* OC Rows */}
                  <td className="px-4 py-4 text-right text-xs font-bold text-slate-400 bg-blue-50/10">{target.oc.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-sm font-black text-blue-600 bg-blue-50/20">{r.ocAch.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-xs font-black text-blue-700 bg-blue-50/10">{ocPercent}%</td>
                  <td className="px-4 py-4 text-right text-xs font-black text-blue-800 bg-blue-50/30">
                    {Math.max(0, target.oc - shopTotals.totalOC).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 max-w-[150px] truncate">
                      <p className="text-[10px] text-slate-500 italic">"{r.note || '-'}"</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
