import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, deleteDoc, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Plus, Search, UserCircle, Calendar, ChevronRight, Activity, Loader2, Trash2 } from "lucide-react";
import { cn, formatDate } from "../utils";
import PatientDetails from "./PatientDetails";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  history: string;
  createdAt: any;
  uid: string;
}

interface PatientDashboardProps {
  user: User;
}

export default function PatientDashboard({ user }: PatientDashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    gender: "male" as const,
    history: ""
  });

  useEffect(() => {
    // Show empty state immediately while loading
    setIsLoading(true);
    
    const q = query(
      collection(db, "patients"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // Use get() first for immediate initial load before realtime subscription
    getDocs(q).then(snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(data);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "patients");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name) return;

    try {
      await addDoc(collection(db, "patients"), {
        ...newPatient,
        age: Number(newPatient.age),
        uid: user.uid,
        createdAt: serverTimestamp()
      });
      setNewPatient({ name: "", age: "", gender: "male", history: "" });
      setShowAddForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "patients");
    }
  };

  const handleDeletePatient = async (patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;
    
    if (!confirm(`Are you sure you want to permanently delete this patient record? This action cannot be undone.`)) {
      return;
    }

    // Optimistic UI update - remove immediately
    setPatients(prevPatients => prevPatients.filter(p => p.id !== patientId));
    setDeletingId(patientId);
    
    try {
      await deleteDoc(doc(db, "patients", patientId));
    } catch (err) {
      // Rollback on failure
      setPatients(prev => [...prev, ...patients.filter(p => p.id === patientId)]);
      handleFirestoreError(err, OperationType.DELETE, "patients");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedPatientId) {
    return (
      <PatientDetails 
        patientId={selectedPatientId} 
        onBack={() => setSelectedPatientId(null)} 
        user={user} 
      />
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-semibold tracking-tight font-serif text-natural-text">Patient Directory</h2>
          <p className="text-natural-muted font-medium text-sm">Centralized repository for secure patient clinical history.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-3 bg-natural-text text-white px-6 py-3 rounded-2xl hover:bg-natural-text/90 transition-all font-semibold whitespace-nowrap shadow-lg shadow-natural-text/10"
        >
          <Plus className="size-4 text-natural-accent" />
          <span className="text-[11px] uppercase tracking-widest">Enroll New Subject</span>
        </button>
      </div>

      <div className="relative group max-w-lg">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-natural-muted group-focus-within:text-natural-accent transition-colors" />
        <input
          type="text"
          placeholder="Lookup records by legal name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-black/5 rounded-[24px] focus:ring-4 focus:ring-natural-accent/5 focus:border-natural-accent/20 transition-all shadow-sm outline-none text-[15px] font-medium"
        />
      </div>

      {isLoading ? (
        <div className="py-32 flex items-center justify-center text-natural-muted">
          <Loader2 className="animate-spin size-10 opacity-20" />
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatientId(patient.id)}
              className="bg-natural-card p-8 rounded-[32px] border border-black/[0.02] shadow-sm hover:shadow-2xl hover:shadow-black/[0.05] hover:-translate-y-2 transition-all group cursor-pointer flex flex-col items-stretch"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="size-14 bg-natural-sidebar rounded-2xl group-hover:bg-natural-accent/10 flex items-center justify-center transition-colors">
                  <UserCircle className="size-8 text-natural-muted group-hover:text-natural-accent transition-all" />
                </div>
                <button
                  onClick={(e) => handleDeletePatient(patient.id, e)}
                  disabled={deletingId === patient.id}
                  className="p-2 rounded-xl hover:bg-red-50 text-natural-muted hover:text-red-500 transition-all disabled:opacity-50"
                  title="Delete patient record"
                >
                  {deletingId === patient.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </div>
              
              <div className="space-y-2 mb-8 flex-1">
                <h3 className="font-serif font-semibold text-2xl tracking-tight text-natural-text group-hover:text-natural-accent transition-colors leading-tight">{patient.name}</h3>
                <div className="flex items-center gap-3 text-[13px] text-natural-muted font-medium">
                   <span>{patient.age}Y</span>
                   <span className="w-1.5 h-1.5 bg-black/5 rounded-full" />
                   <span className="capitalize">{patient.gender}</span>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-black/5">
                <div className="flex items-center gap-2 text-[10px] text-natural-muted font-bold uppercase tracking-widest opacity-60">
                   <Calendar className="size-3" />
                   <span>Established {formatDate(patient.createdAt?.toDate?.() || new Date())}</span>
                </div>
                <div className="flex items-center justify-between text-natural-text group/link bg-natural-bg/50 p-4 rounded-2xl border border-black/5">
                   <span className="text-[11px] font-bold uppercase tracking-widest">Full Dossier</span>
                   <ChevronRight className="size-4 group-hover/link:translate-x-1 transition-transform text-natural-accent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center space-y-6 border-2 border-dashed border-black/5 rounded-[40px] bg-white shadow-inner">
           <Activity className="size-16 text-natural-sidebar mx-auto" />
           <div className="space-y-2">
             <h3 className="font-serif font-bold text-2xl text-natural-text">Observational Void</h3>
             <p className="text-sm text-natural-muted font-medium max-w-xs mx-auto">Patient metadata repository is currently unpopulated for current credentials.</p>
           </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-natural-card w-full max-w-xl rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] p-10 space-y-8 border border-black/5">
            <div className="space-y-1">
              <h3 className="text-3xl font-bold tracking-tight font-serif text-natural-text">Registry Enrollment</h3>
              <p className="text-sm text-natural-muted font-medium">Create a persistent clinical dossier for observations.</p>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-natural-muted uppercase tracking-[3px] pl-1">Legal Full Identity</label>
                <input
                  required
                  type="text"
                  placeholder="Patient Name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-6 py-4 bg-natural-bg rounded-2xl border border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 outline-none transition-all font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-[3px] pl-1">Age (Years)</label>
                  <input
                    required
                    type="number"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full px-6 py-4 bg-natural-bg rounded-2xl border border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-[3px] pl-1">Biologic Sex</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as any })}
                    className="w-full px-6 py-4 bg-natural-bg rounded-2xl border border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 outline-none transition-all font-medium"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Non-specified</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-natural-muted uppercase tracking-[3px] pl-1">Baseline History Brief</label>
                <textarea
                  placeholder="Include chronic pathologies..."
                  value={newPatient.history}
                  onChange={(e) => setNewPatient({ ...newPatient, history: e.target.value })}
                  className="w-full px-6 py-4 bg-natural-bg rounded-2xl border border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 outline-none transition-all font-medium min-h-[120px] resize-none"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-4 px-6 border border-black/5 text-natural-muted font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-natural-sidebar transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 px-6 bg-natural-text text-white font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:opacity-90 shadow-xl shadow-natural-text/10 transition-all"
                >
                  Commit to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}