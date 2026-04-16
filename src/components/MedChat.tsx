import { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { chatWithAI } from "../gemini";
import { Send, Bot, User as UserIcon, Loader2, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../utils";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: any;
}

interface MedChatProps {
  user: User;
}

export default function MedChat({ user }: MedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "users", user.uid, "chats"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse() as ChatMessage[];
      setMessages(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/chats`);
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setIsTyping(true);

    try {
      // 1. Add user message to Firestore
      await addDoc(collection(db, "users", user.uid, "chats"), {
        uid: user.uid,
        role: "user",
        content: userMessage,
        createdAt: serverTimestamp()
      });

      // 2. Get AI response
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await chatWithAI(userMessage, history);

      // 3. Add AI response to Firestore
      await addDoc(collection(db, "users", user.uid, "chats"), {
        uid: user.uid,
        role: "model",
        content: aiResponse,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chats`);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div className="space-y-2">
          <h2 className="text-4xl font-semibold tracking-tight font-serif text-natural-text">Med-Chat Synthesis</h2>
          <p className="text-natural-muted font-medium text-sm">Real-time clinical interrogation & knowledge extraction.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-natural-accent bg-natural-accent/5 px-4 py-2 rounded-full uppercase border border-natural-accent/10 tracking-widest">
           <Info className="size-3" />
           <span>Expert Reference Only</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-[40px] bg-natural-card shadow-2xl shadow-black/[0.04] border border-black/[0.03] overflow-hidden flex flex-col relative transition-all hover:shadow-black/[0.06]">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 scrollbar-hide">
          {messages.length === 0 && !isTyping && (
             <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto">
                <div className="p-8 bg-natural-bg rounded-[32px] border border-black/5 shadow-inner">
                   <Bot className="size-16 text-natural-accent" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-2xl text-natural-text">Consultation Initialized</h3>
                  <p className="text-[13px] text-natural-muted font-medium leading-relaxed">
                     Interrogate the intelligence layer for clinical insights, symptom cross-referencing, or patient trajectory synthesis.
                  </p>
                </div>
             </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-6 max-w-[90%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "size-11 rounded-2xl shrink-0 mt-1 flex items-center justify-center border shadow-sm",
                msg.role === "user" ? "bg-natural-sidebar border-black/5" : "bg-natural-accent/10 border-natural-accent/10"
              )}>
                {msg.role === "user" ? <UserIcon className="size-5 text-natural-muted" /> : <Bot className="size-5 text-natural-accent" />}
              </div>
              <div className={cn(
                "p-6 rounded-[28px] text-[14px] leading-relaxed font-medium",
                msg.role === "user" 
                  ? "bg-natural-text text-white rounded-tr-none shadow-xl shadow-natural-text/10" 
                  : "bg-natural-bg text-natural-text rounded-tl-none border border-black/5 prose prose-sm prose-stone max-w-none prose-p:my-0 prose-strong:text-natural-accent"
              )}>
                {msg.role === "model" ? (
                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-6 max-w-[90%] mr-auto slide-in-from-left-4 animate-in duration-500">
              <div className="size-11 bg-natural-accent/10 border border-natural-accent/10 rounded-2xl shrink-0 mt-1 flex items-center justify-center">
                <Bot className="size-5 text-natural-accent" />
              </div>
              <div className="bg-natural-bg border border-black/5 p-6 rounded-[28px] rounded-tl-none flex gap-3 items-center text-natural-accent font-bold text-[11px] uppercase tracking-widest">
                <Loader2 className="animate-spin size-3.5" />
                Processing Response Layer...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-6 md:p-10 bg-natural-sidebar/50 border-t border-black/5">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Inquire clinical trajectory or diagnostic patterns..."
              className="flex-1 bg-white border border-black/5 rounded-[24px] px-8 py-5 focus:ring-4 focus:ring-natural-accent/5 focus:border-natural-accent/20 outline-none transition-all shadow-inner text-[15px] font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-8 bg-natural-text text-white rounded-[24px] hover:opacity-90 disabled:bg-natural-sidebar disabled:text-natural-muted transition-all shadow-xl shadow-natural-text/10 active:scale-95 group"
            >
              <Send className="size-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
