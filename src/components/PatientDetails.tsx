import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { ChevronLeft, UserCircle, Calendar, FileText, Activity, ExternalLink, Clock } from "lucide-react";
import { formatDate } from "../utils";
import LongitudinalTrends from "./LongitudinalTrends";
import MedicationTracker from "./MedicationTracker";

interface Report {
  id: string;
  summary: string;
  fileName: string;
  createdAt: any;
  biomarkers?: any[];
}

interface Trend {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  recordedAt: any;
}

interface PatientDetailsProps {
  patientId: string;
  onBack: () => void;
  user: User;
}

export default function PatientDetails({ patientId, onBack, user }: PatientDetailsProps) {
  const [patient, setPatient] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Patient Basic Info
    const fetchPatient = async () => {
      try {
        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (patientDoc.exists()) {
          setPatient({ id: patientDoc.id, ...patientDoc.data() });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `patients/${patientId}`);
      }
    };

    fetchPatient();

    // 2. Fetch Reports
    const reportsQuery = query(
      collection(db, "patients", patientId, "reports"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `patients/${patientId}/reports`);
    });

    // 3. Fetch Trends
    const trendsQuery = query(
      collection(db, "patients", patientId, "trends"),
      orderBy("recordedAt", "desc")
    );

    const unsubscribeTrends = onSnapshot(trendsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trend[];
      setTrends(data);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `patients/${patientId}/trends`);
    });

    return () => {
      unsubscribeReports();
      unsubscribeTrends();
    };
  }, [patientId]);

  if (isLoading || !patient) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Activity className="animate-pulse text-natural-accent size-10" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-natural-muted hover:text-natural-text transition-colors group"
        >
          <ChevronLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Return to Directory</span>
        </button>
      </div>

      <header className="flex flex-col md:flex-row gap-10 items-start md:items-center">
        <div className="size-24 bg-natural-sidebar rounded-[32px] flex items-center justify-center border border-black/5 shadow-inner shrink-0">
          <UserCircle className="size-14 text-natural-muted" />
        </div>
        <div className="space-y-4 flex-1">
          <div className="space-y-1">
            <h2 className="text-4xl font-serif font-bold text-natural-text tracking-tight">{patient.name}</h2>
            <div className="flex items-center gap-4 text-sm text-natural-muted font-medium">
              <span>{patient.age}Y • {patient.gender}</span>
              <span className="px-3 py-1 bg-natural-accent/10 text-natural-accent rounded-full text-[10px] font-bold uppercase tracking-widest border border-natural-accent/10">Active Clinical Record</span>
            </div>
          </div>
          <p className="text-natural-muted text-[15px] leading-relaxed max-w-2xl italic">"{patient.history}"</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10">
        <div className="space-y-10">
          <MedicationTracker patientId={patientId} user={user} />
          
          <LongitudinalTrends trends={trends} />

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-natural-accent" />
                <h3 className="text-xl font-serif font-bold text-natural-text uppercase tracking-widest text-xs">Diagnostic Archive</h3>
              </div>
              <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">{reports.length} Records Synthesized</span>
            </div>

            <div className="grid gap-4">
              {reports.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-black/5 rounded-[32px] bg-natural-bg/20">
                   <p className="text-sm text-natural-muted font-medium">No diagnostic reports archived for this subject.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="bg-white p-6 rounded-[28px] border border-black/5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-natural-muted uppercase tracking-widest">
                          <Clock className="size-3" />
                          <span>{formatDate(report.createdAt?.toDate?.() || new Date())}</span>
                        </div>
                        <h4 className="font-serif font-bold text-xl text-natural-text leading-tight">{report.fileName}</h4>
                        <p className="text-sm text-natural-muted leading-relaxed line-clamp-2">{report.summary}</p>
                      </div>
                      <div className="bg-natural-bg p-3 rounded-2xl text-natural-accent hover:bg-natural-accent/10 transition-colors cursor-pointer">
                        <ExternalLink className="size-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
           <div className="bg-stone-900 text-white p-8 rounded-[40px] shadow-2xl space-y-8">
              <div className="space-y-1">
                <h4 className="font-serif text-2xl font-semibold text-natural-accent">Clinical Summary</h4>
                <p className="text-[10px] font-bold uppercase tracking-[3px] opacity-40">Snapshot Analytics</p>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-center">
                   <div className="p-3 bg-natural-accent/20 rounded-xl">
                      <Calendar className="size-5 text-natural-accent" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Last Observation</span>
                      <span className="text-sm font-semibold">{reports[0] ? formatDate(reports[0].createdAt?.toDate?.() || new Date()) : 'No Data'}</span>
                   </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-center">
                   <div className="p-3 bg-natural-accent/20 rounded-xl">
                      <Activity className="size-5 text-natural-accent" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Status Baseline</span>
                      <span className="text-sm font-semibold">Stable Clinical Profile</span>
                   </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                 <p className="text-[11px] leading-relaxed opacity-60 font-medium">
                    This dossier represents a collaborative record between human expertise and Meditrack intelligence. Ensure all trajectory updates are verified by primary clinicians.
                 </p>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
