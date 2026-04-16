import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collectionGroup, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Bell, AlertTriangle, Package, ChevronRight } from "lucide-react";
import { cn } from "../utils";

interface Alert {
  id: string;
  type: "medication" | "clinical";
  title: string;
  patientName: string;
  message: string;
}

interface AlertSystemProps {
  user: User;
}

export default function AlertSystem({ user }: AlertSystemProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Listen for Low Medications across all patients owned by this user
    const qMed = query(
      collectionGroup(db, "medications"),
      where("uid", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(qMed, (snapshot) => {
      const medAlerts: Alert[] = [];
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // 1. Check Inventory
        if (data.remainingTablets <= data.lowThreshold) {
          medAlerts.push({
            id: `${doc.id}-inventory`,
            type: "medication",
            title: "Supply Alert",
            patientName: "Patient Registry Item",
            message: `${data.name} is running critically low (${data.remainingTablets} doses left).`
          });
        }

        // 2. Check Schedule / Missed Doses
        if (data.schedule && data.schedule.length > 0) {
           const lastTakenDate = data.lastTaken ? new Date(data.lastTaken.toDate()) : null;
           const isToday = lastTakenDate && lastTakenDate.toDateString() === now.toDateString();

           const missedTimes = data.schedule.filter((time: string) => {
              if (time > currentTimeStr) return false;
              if (!isToday) return true;
              const [hours, mins] = time.split(':');
              const scheduledTime = new Date();
              scheduledTime.setHours(parseInt(hours), parseInt(mins), 0, 0);
              return lastTakenDate < scheduledTime;
           });

           if (missedTimes.length > 0) {
              medAlerts.push({
                id: `${doc.id}-missed`,
                type: "medication",
                title: "Missed Dose",
                patientName: "Patient Registry Item",
                message: `${data.name} dose missed (${missedTimes[missedTimes.length - 1]}). Action required.`
              });
           }
        }
      });
      setAlerts(medAlerts);
    });

    return () => unsubscribe();
  }, [user.uid]);

  if (alerts.length === 0) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-natural-sidebar rounded-2xl border border-black/5 text-natural-muted hover:text-natural-accent transition-all animate-in fade-in zoom-in"
      >
        <Bell className="size-5" />
        <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-natural-sidebar" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-16 w-[320px] bg-white rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-black/5 z-[60] overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="p-6 bg-natural-sidebar/50 border-b border-black/5">
             <h4 className="text-[11px] font-bold text-natural-text uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-natural-accent" />
                Clinical Directives Cache
             </h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
             {alerts.map(alert => (
                <div key={alert.id} className="p-6 border-b border-black/5 hover:bg-natural-bg/50 transition-colors group cursor-pointer">
                   <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-amber-50 rounded-xl">
                         <Package className="size-4 text-amber-600" />
                      </div>
                      <div className="space-y-1 flex-1">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{alert.title}</span>
                         </div>
                         <p className="text-[13px] font-medium text-natural-text leading-tight">{alert.message}</p>
                      </div>
                      <ChevronRight className="size-4 text-natural-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                   </div>
                </div>
             ))}
          </div>
          <div className="p-4 bg-natural-bg text-center">
             <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">Protocol Sync Complete</span>
          </div>
        </div>
      )}
    </div>
  );
}
