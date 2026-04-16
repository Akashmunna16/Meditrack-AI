import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { analyzeMedicalReport, ReportAnalysis } from "../gemini";
import { Upload, FileText, Sparkles, AlertCircle, CheckCircle2, Loader2, Info, FileUp, X, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn, fileToDataUrl } from "../utils";

interface Patient {
  id: string;
  name: string;
}

interface ReportAnalyzerProps {
  user: User;
}

export default function ReportAnalyzer({ user }: ReportAnalyzerProps) {
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const q = query(collection(db, "patients"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setPatients(data);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
      }
    };
    fetchPatients();
  }, [user.uid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() && !selectedFile) {
      setError("Please provide report text or upload a document.");
      return;
    }

    if (!selectedPatientId) {
      setError("Please select a patient to link this report.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      let fileData;
      if (selectedFile) {
        const dataUrl = await fileToDataUrl(selectedFile);
        fileData = {
          data: dataUrl,
          mimeType: selectedFile.type,
        };
      }

      const result = await analyzeMedicalReport(
        selectedFile?.name || "Clinical Notes",
        inputText.trim() || undefined,
        fileData
      );
      setAnalysis(result);

      // Save to Firestore
      const reportRef = await addDoc(collection(db, "patients", selectedPatientId, "reports"), {
        uid: user.uid,
        fileName: selectedFile?.name || "Text-based Report",
        fileType: selectedFile?.type || "text/plain",
        summary: result.summary,
        keyInsights: result.insights,
        urgentActions: result.urgentActions,
        biomarkers: result.biomarkers || [],
        createdAt: serverTimestamp()
      });

      // Save individual trends
      if (result.biomarkers && result.biomarkers.length > 0) {
        for (const bm of result.biomarkers) {
          await addDoc(collection(db, "patients", selectedPatientId, "trends"), {
            ...bm,
            reportId: reportRef.id,
            recordedAt: serverTimestamp()
          });
        }
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "reports/trends");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetSession = () => {
    setInputText("");
    setSelectedFile(null);
    setAnalysis(null);
    setError(null);
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-semibold tracking-tight font-serif text-natural-text">Consultation Workspace</h2>
          <p className="text-natural-muted font-medium text-sm">Clinical diagnostic synthesis & analytics hub.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-natural-accent bg-natural-accent/5 px-4 py-2 rounded-full border border-natural-accent/10">
           <Sparkles className="size-3" />
           <span>Intelligence Layer Active</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        <section className="bg-natural-card p-8 md:p-10 rounded-[32px] shadow-2xl shadow-black/[0.04] border border-black/[0.02] flex flex-col gap-8 transition-all hover:shadow-black/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-natural-text font-bold uppercase tracking-[2px] text-[11px]">
               <div className="p-2.5 bg-natural-bg rounded-xl">
                  <FileText className="size-4 text-natural-accent" />
               </div>
               <span>AI Medical Report Analyzer</span>
            </div>
            <button
              onClick={resetSession}
              className="text-[11px] font-bold uppercase tracking-wider text-natural-accent hover:underline"
            >
              Reset Session
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-natural-muted uppercase tracking-[3px] ml-1">Link to Patient Record</label>
              <div className="relative group">
                <Users className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-natural-muted group-focus-within:text-natural-accent transition-colors" />
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-natural-bg rounded-2xl border border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 transition-all outline-none font-medium appearance-none"
                >
                  <option value="">Select a patient dossier...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative group space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste clinical notes or laboratory results here..."
                className="w-full p-8 rounded-3xl bg-natural-bg border-2 border-dashed border-black/5 focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 transition-all resize-none min-h-[250px] text-natural-text placeholder:text-natural-muted/50 text-[15px] leading-relaxed font-sans"
              />
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-14 flex items-center justify-center gap-3 bg-white border border-black/10 rounded-2xl text-natural-text hover:bg-natural-bg transition-all"
                >
                  <FileUp className="size-4 text-natural-accent" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Upload PDF/Image</span>
                </button>
                
                {selectedFile && (
                  <div className="flex-[1.5] flex items-center justify-between px-4 bg-natural-accent/5 rounded-2xl border border-natural-accent/10">
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2.5 bg-white rounded-xl">
                        <FileText className="size-3.5 text-natural-accent" />
                      </div>
                      <span className="text-xs font-semibold text-natural-text truncate uppercase tracking-tight">
                        {selectedFile.name}
                      </span>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-natural-accent/10 rounded-full transition-colors text-natural-muted">
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!inputText.trim() && !selectedFile)}
            className="w-full h-16 flex items-center justify-center gap-3 bg-natural-text hover:bg-natural-text/90 disabled:bg-natural-sidebar disabled:text-natural-muted text-white font-semibold rounded-2xl transition-all shadow-xl shadow-natural-text/10 active:scale-[0.99]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin size-5" />
                <span className="uppercase tracking-widest text-xs">Synthesizing Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-5 text-natural-accent" />
                <span className="uppercase tracking-widest text-xs">Generate Insights Hub</span>
              </>
            )}
          </button>
        </section>

        <section className="bg-natural-card/50 backdrop-blur-sm p-8 rounded-[32px] border border-black/[0.03] overflow-y-auto max-h-[750px] space-y-8 shadow-inner">
          <div className="flex items-center gap-3 text-natural-text font-bold uppercase tracking-[2px] text-[11px] pb-4 border-b border-black/5">
              <Info className="size-4 text-natural-accent" />
              <span>Analytical Readout</span>
          </div>

          {!analysis && !isAnalyzing && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
               <div className="p-8 bg-natural-bg rounded-full border border-black/5">
                  <Upload className="size-10 text-natural-muted" />
               </div>
               <p className="max-w-[220px] text-[13px] font-medium leading-relaxed">No medical records uploaded for current consultation session.</p>
            </div>
          )}

          {isAnalyzing && (
             <div className="space-y-10 animate-pulse">
                <div className="h-6 bg-natural-sidebar rounded-full w-2/3" />
                <div className="space-y-4">
                   <div className="h-4 bg-natural-sidebar rounded-full w-full" />
                   <div className="h-4 bg-natural-sidebar rounded-full w-full" />
                   <div className="h-4 bg-natural-sidebar rounded-full w-3/4" />
                </div>
                <div className="space-y-4">
                   <div className="h-4 bg-natural-sidebar rounded-full w-full" />
                   <div className="h-4 bg-natural-sidebar rounded-full w-1/2" />
                </div>
             </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 text-red-700/80 rounded-2xl flex gap-4 border border-red-100 font-medium text-sm">
               <AlertCircle className="shrink-0 size-5" />
               <p>{error}</p>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <section className="space-y-4">
                <div className="text-[13px] leading-relaxed text-natural-text bg-natural-bg p-6 rounded-2xl border border-black/5">
                  <span className="font-bold text-natural-accent uppercase tracking-wider block mb-2 text-[10px]">Synthesis Summary:</span>
                  <ReactMarkdown>{analysis.summary}</ReactMarkdown>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-natural-text font-bold uppercase tracking-wider text-[10px]">
                   <CheckCircle2 className="size-3.5 text-natural-accent" />
                   <span>Clinical Observations</span>
                </div>
                <ul className="grid gap-3">
                  {analysis.insights.map((insight, i) => (
                    <li key={i} className="flex gap-4 p-4 bg-white border border-black/5 rounded-2xl text-[13px] text-natural-text shadow-sm items-start">
                      <span className="shrink-0 text-natural-accent font-serif font-bold italic">0{i+1}</span>
                      <span className="font-medium leading-relaxed">{insight}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {analysis.urgentActions.length > 0 && (
                <section className="space-y-4 p-6 bg-stone-900 text-white rounded-[24px] shadow-xl">
                  <div className="flex items-center gap-2 text-natural-accent font-bold uppercase tracking-widest text-[9px]">
                    <AlertCircle className="size-3.5" />
                    <span>Urgent Medical Directives</span>
                  </div>
                  <ul className="space-y-3">
                    {analysis.urgentActions.map((action, i) => (
                      <li key={i} className="text-[13px] font-light leading-relaxed flex gap-3 opacity-90">
                        <span className="shrink-0 text-natural-accent">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
      
      <div className="p-6 bg-natural-sidebar/50 rounded-2xl border border-black/5 flex gap-5 items-start">
         <div className="p-2 bg-natural-accent/10 rounded-lg shrink-0">
            <Info className="size-5 text-natural-accent" />
         </div>
         <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-natural-text uppercase tracking-widest">Protocol Protocol & Liability Disclaimer</h4>
            <p className="text-[12px] text-natural-muted leading-relaxed font-medium">
               Medi-Intelligence outputs are probabilistic and optimized for professional reference. These summaries must be audited against primary clinical source data by a licensed practitioner.
            </p>
         </div>
      </div>
    </div>
  );
}
