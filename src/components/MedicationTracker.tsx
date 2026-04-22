import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, increment, deleteDoc, orderBy, limit, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Pill, Plus, AlertTriangle, CheckCircle2, Clock, Trash2, Package, RefreshCw, XCircle, History } from "lucide-react";
import { cn, formatDate } from "../utils";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  remainingTablets: number;
  totalTablets: number;
  lowThreshold: number;
  schedule: string[];
  lastTaken: any;
}

interface MedicationLog {
  id: string;
  status: 'taken' | 'skipped';
  date: string;
  scheduledTime?: string;
}

interface MedicationTrackerProps {
  patientId: string;
  user: User;
}

export default function MedicationTracker({ patientId, user }: MedicationTrackerProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<Record<string, MedicationLog[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",
    frequency: "Daily",
    totalTablets: 30,
    lowThreshold: 5,
    schedule: [] as string[]
  });
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    const q = query(collection(db, "patients", patientId, "medications"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
      setMedications(data);
      
      // Fetch logs for each medication
      data.forEach(med => {
         const logsQ = query(
           collection(db, "patients", patientId, "medications", med.id, "logs"),
           orderBy("timestamp", "desc"),
           limit(100)
         );
         onSnapshot(logsQ, (logSnap) => {
            const medLogs = logSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MedicationLog[];
            setLogs(prev => ({ ...prev, [med.id]: medLogs }));
         });
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `patients/${patientId}/medications`);
    });

    return () => unsubscribe();
  }, [patientId]);

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "patients", patientId, "medications"), {
        ...newMed,
        uid: user.uid,
        remainingTablets: newMed.totalTablets,
        lastTaken: null,
        createdAt: serverTimestamp()
      });
      setNewMed({ name: "", dosage: "", frequency: "Daily", totalTablets: 30, lowThreshold: 5, schedule: [] });
      setShowAddForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "medications");
    }
  };

  const addScheduleTime = () => {
    if (newTime && !newMed.schedule.includes(newTime)) {
      setNewMed({ ...newMed, schedule: [...newMed.schedule, newTime].sort() });
      setNewTime("");
    }
  };

  const removeScheduleTime = (time: string) => {
    setNewMed({ ...newMed, schedule: newMed.schedule.filter(t => t !== time) });
  };

  const takeDose = async (medId: string, currentRemaining: number) => {
    if (currentRemaining <= 0) return;
    
    // Optimistic UI Update - update immediately
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    setMedications(prev => prev.map(m => 
      m.id === medId 
        ? { 
            ...m, 
            remainingTablets: m.remainingTablets - 1, 
            lastTaken: now 
          } 
        : m
    ));
    
    // Update logs immediately
    setLogs(prev => ({
      ...prev,
      [medId]: [
        { id: 'temp-' + Date.now(), status: 'taken', date: dateStr },
        ...(prev[medId] || [])
      ]
    }));

    try {
      await updateDoc(doc(db, "patients", patientId, "medications", medId), {
        remainingTablets: increment(-1),
        lastTaken: serverTimestamp()
      });

      await addDoc(collection(db, "patients", patientId, "medications", medId, "logs"), {
        status: 'taken',
        date: dateStr,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      // Rollback on failure
      setMedications(prev => prev.map(m => 
        m.id === medId 
          ? { ...m, remainingTablets: currentRemaining, lastTaken: m.lastTaken } 
          : m
      ));
      setLogs(prev => ({
        ...prev,
        [medId]: prev[medId]?.filter(l => !l.id.startsWith('temp-')) || []
      }));
      handleFirestoreError(err, OperationType.UPDATE, "medications");
    }
  };

  const skipDose = async (medId: string) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      await addDoc(collection(db, "patients", patientId, "medications", medId, "logs"), {
        status: 'skipped',
        date: dateStr,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "medications/logs");
    }
  };

  const refillMed = async (medId: string, total: number) => {
    try {
      await updateDoc(doc(db, "patients", patientId, "medications", medId), {
        remainingTablets: total
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "medications");
    }
  };

  const deleteMed = async (medId: string) => {
    try {
      await deleteDoc(doc(db, "patients", patientId, "medications", medId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "medications");
    }
  };

  return (
    <div className="space-y-8 bg-natural-card p-8 md:p-10 rounded-[40px] border border-black/[0.03] shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-natural-accent/10 rounded-2xl">
            <Pill className="size-5 text-natural-accent" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-natural-text">Medication Adherence</h3>
            <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest mt-0.5">Inventory & dosage monitoring</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="p-2 bg-natural-bg rounded-xl border border-black/5 text-natural-accent hover:bg-natural-accent/10 transition-colors"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMed} className="bg-natural-bg p-8 rounded-3xl border border-black/5 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Medication Name</label>
              <input
                required
                value={newMed.name}
                onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                className="w-full px-5 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-natural-accent/20"
                placeholder="e.g. Atorvastatin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Dosage</label>
              <input
                required
                value={newMed.dosage}
                onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                className="w-full px-5 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-natural-accent/20"
                placeholder="e.g. 20mg"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Frequency</label>
              <input
                required
                value={newMed.frequency}
                onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                className="w-full px-5 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-natural-accent/20"
                placeholder="e.g. Daily"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 col-span-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Daily Schedule</label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-black/5 rounded-xl text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={addScheduleTime}
                    className="p-3 bg-natural-accent text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-6">
                {newMed.schedule.map(time => (
                  <span key={time} className="inline-flex items-center gap-2 px-3 py-1 bg-natural-sidebar rounded-lg text-[10px] font-bold">
                    {time}
                    <button type="button" onClick={() => removeScheduleTime(time)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Total Count</label>
              <input
                type="number"
                value={newMed.totalTablets}
                onChange={e => setNewMed({ ...newMed, totalTablets: parseInt(e.target.value) })}
                className="w-full px-5 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-natural-accent/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-widest pl-1">Low Warning</label>
              <input
                type="number"
                value={newMed.lowThreshold}
                onChange={e => setNewMed({ ...newMed, lowThreshold: parseInt(e.target.value) })}
                className="w-full px-5 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-natural-accent/20"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-3 bg-white text-natural-muted font-bold uppercase tracking-widest text-[10px] rounded-xl border border-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-natural-text text-white font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-natural-text/10"
            >
              Save Medication
            </button>
          </div>
        </form>
      )}

      {medications.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-black/5 rounded-[32px] bg-natural-bg/20 opacity-40">
           <p className="text-sm font-medium">No pharmacotherapy records active.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {medications.map(med => {
            const isLow = med.remainingTablets <= med.lowThreshold;
            const percentage = (med.remainingTablets / med.totalTablets) * 100;

            // Missed dose logic
            const now = new Date();
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const lastTakenDate = med.lastTaken ? new Date(med.lastTaken.toDate()) : null;
            const isToday = lastTakenDate && lastTakenDate.toDateString() === now.toDateString();
            
            const missedDoses = med.schedule?.filter(time => {
              if (time > currentTimeStr) return false; // In the future
              if (!isToday) return true; // Not taken today at all
              const [hours, mins] = time.split(':');
              const scheduledTime = new Date();
              scheduledTime.setHours(parseInt(hours), parseInt(mins), 0, 0);
              return lastTakenDate < scheduledTime; // Taken today but before this scheduled time
            }) || [];

            return (
              <div key={med.id} className="bg-natural-bg/50 p-6 rounded-[28px] border border-black/5 space-y-6 relative group overflow-hidden transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-lg text-natural-text">{med.name}</h4>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-natural-muted uppercase tracking-wider">
                       <span>{med.dosage}</span>
                       <span className="w-1 h-1 bg-black/10 rounded-full" />
                       <span>{med.frequency}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMed(med.id)}
                      className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {med.schedule?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {med.schedule.map(time => {
                       const isPast = time < currentTimeStr;
                       const takenAfter = lastTakenDate && isToday && lastTakenDate > new Date(new Date().setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0));
                       
                       return (
                         <div key={time} className={cn(
                           "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 border transition-all",
                           takenAfter 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                            : isPast 
                              ? "bg-red-50 border-red-100 text-red-600 animate-pulse" 
                              : "bg-white border-black/5 text-natural-muted"
                         )}>
                           <Clock className="size-3" />
                           {time}
                           {takenAfter && <CheckCircle2 className="size-3" />}
                         </div>
                       );
                    })}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Package className={cn("size-3.5", isLow ? "text-amber-500" : "text-natural-accent")} />
                      <span className={isLow ? "text-amber-600" : "text-natural-muted"}>
                        Inventory: {med.remainingTablets} / {med.totalTablets}
                      </span>
                    </div>
                    {isLow && (
                       <div className="flex items-center gap-1.5 text-amber-600 animate-pulse">
                          <AlertTriangle className="size-3.5" />
                          <span>Critically Low</span>
                       </div>
                    )}
                  </div>
                  <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        isLow ? "bg-amber-500" : "bg-natural-accent"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-natural-muted">
                    <Clock className="size-3.5" />
                    <span>Last Taken: {med.lastTaken ? formatDate(med.lastTaken.toDate()) : 'Never'}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => refillMed(med.id, med.totalTablets)}
                      className="p-3 bg-white border border-black/5 text-natural-muted hover:text-natural-accent rounded-xl transition-colors"
                      title="Refill Inventory"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      onClick={() => skipDose(med.id)}
                      className="p-3 bg-white border border-black/5 text-natural-muted hover:text-red-500 rounded-xl transition-colors"
                      title="Skip Dose"
                    >
                      <XCircle className="size-4" />
                    </button>
                    <button
                      onClick={() => takeDose(med.id, med.remainingTablets)}
                      disabled={med.remainingTablets === 0}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[2px] transition-all flex items-center gap-2",
                        med.remainingTablets === 0
                        ? "bg-natural-sidebar text-natural-muted cursor-not-allowed"
                        : "bg-natural-text text-white hover:opacity-90 shadow-lg shadow-natural-text/10"
                      )}
                    >
                      <CheckCircle2 className="size-3.5 text-natural-accent" />
                      Take Dose
                    </button>
                  </div>
                </div>

                {/* 30-Day Adherence History */}
                <div className="pt-6 border-t border-black/5 space-y-4">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-natural-muted">
                      <div className="flex items-center gap-2">
                         <History className="size-3.5" />
                         <span>30-Day Adherence Baseline</span>
                      </div>
                      <span className="opacity-60">Status: Automated</span>
                   </div>
                   <div className="flex flex-wrap gap-1.5 p-1">
                      {Array.from({ length: 30 }).map((_, i) => {
                         const d = new Date();
                         d.setDate(d.getDate() - (29 - i));
                         const dateStr = d.toISOString().split('T')[0];
                         const medLogs = logs[med.id]?.filter(l => l.date === dateStr) || [];
                         const takenCount = medLogs.filter(l => l.status === 'taken').length;
                         const skippedCount = medLogs.filter(l => l.status === 'skipped').length;
                         const expectedCount = med.schedule?.length || 1;
                         
                         const isFuture = d > new Date();
                         const isToday = dateStr === new Date().toISOString().split('T')[0];
                         
                         let statusColor = "bg-black/5"; // No data / Future
                         let label = "No protocol data";

                         if (!isFuture || isToday) {
                            if (takenCount >= expectedCount) {
                               statusColor = "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                               label = "Full Adherence";
                            } else if (takenCount > 0 || skippedCount > 0) {
                               statusColor = "bg-amber-400/80";
                               label = "Partial Adherence / Skipped";
                            } else if (!isToday && expectedCount > 0) {
                               statusColor = "bg-red-400/60";
                               label = "Missed Window";
                            }
                         }

                         return (
                            <div 
                              key={i} 
                              className={cn("size-3.5 rounded-[4px] transition-all relative group/dot", statusColor)}
                              title={`${formatDate(d)} - ${label}`}
                            >
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-natural-text text-white text-[9px] rounded-lg opacity-0 group-hover/dot:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                                  {formatDate(d)}: {label}
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
