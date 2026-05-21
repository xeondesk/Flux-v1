import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  onSnapshot, 
  collection, 
  getDocs, 
  doc, 
  setDoc 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { useFluxStore } from "./store";
import { VirtualFile, PlanItem, ToolItem, MemoryVector, AgentPermission, AgentCredential, ChatMessage } from "./types";

// Helper to seed default data if a user signs in for the first time
async function seedDefaultWorkspace(userId: string, store: any) {
  try {
    const filesRef = collection(db, "users", userId, "files");
    const snapshot = await getDocs(filesRef);
    if (snapshot.empty) {
      console.log("🌱 [Firebase] Seeding brand new developer sandbox to Firestore on initial OAuth login...");
      
      // 1. Seed Files
      for (const file of store.files) {
        const docId = file.path.replace(/\//g, "_");
        await setDoc(doc(db, "users", userId, "files", docId), file);
      }
      
      // 2. Seed Plan
      for (const item of store.plan) {
        await setDoc(doc(db, "users", userId, "plan", item.id), {
          id: item.id,
          label: item.label,
          status: item.status,
          priority: item.priority,
          dependencies: item.dependencies || [],
          createdAt: new Date().toISOString()
        });
      }
      
      // 3. Seed Tools
      for (const tool of store.tools) {
        await setDoc(doc(db, "users", userId, "tools", tool.id), tool);
      }
      
      // 4. Seed Vectors
      for (const vec of store.vectors) {
        await setDoc(doc(db, "users", userId, "vectors", vec.id), {
          id: vec.id,
          text: vec.content,
          agentId: "memory-agent",
          timestamp: new Date().toLocaleTimeString(),
          score: vec.similarity
        });
      }
      
      // 5. Seed Permissions
      for (const perm of store.permissions) {
        await setDoc(doc(db, "users", userId, "permissions", perm.id), perm);
      }
      
      // 6. Seed Credentials
      for (const cred of store.credentials) {
        await setDoc(doc(db, "users", userId, "credentials", cred.id), cred);
      }
      
      // 7. Seed Chat Messages
      for (const msg of store.chatMessages) {
        await setDoc(doc(db, "users", userId, "chatMessages", msg.id), {
          id: msg.id,
          sender: msg.sender === "human" ? "user" : "agent",
          text: msg.text,
          timestamp: msg.timestamp
        });
      }
      
      // 8. Seed Logs
      for (let i = 0; i < store.logs.length; i++) {
        const logId = `log-seed-${Date.now()}-${i}`;
        await setDoc(doc(db, "users", userId, "logs", logId), {
          text: store.logs[i],
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      console.log("✅ [Firebase] Default sandbox seeding successfully complete!");
    }
  } catch (error) {
    console.error("❌ Seeding failure:", error);
  }
}

export function FirebaseSync() {
  const setUser = useFluxStore((s) => s.setUser);
  const setSyncStatus = useFluxStore((s) => s.setSyncStatus);
  const store = useFluxStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        console.log(`👤 User authenticated: ${user.email} (${user.uid})`);
        setSyncStatus("syncing");
        
        try {
          // Verify workspace contains files. If they don't, seed defaults.
          await seedDefaultWorkspace(user.uid, store);

          // Build Firestore real-time collection snapshots subscribers
          
          // A. Files Snapshot Sync
          const unsubFiles = onSnapshot(
            collection(db, "users", user.uid, "files"),
            (snapshot) => {
              if (snapshot.empty) return;
              const filesList: VirtualFile[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                filesList.push({
                  path: data.path,
                  content: data.content,
                  language: data.language
                });
              });
              
              const currentActive = useFluxStore.getState().activePath;
              store.setFiles(filesList);
              
              const currentActiveFile = filesList.find((f) => f.path === currentActive);
              if (currentActiveFile) {
                store.setEditorContent(currentActiveFile.content);
              }
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/files`)
          );

          // B. Dev Plan Snapshot Sync
          const unsubPlan = onSnapshot(
            collection(db, "users", user.uid, "plan"),
            (snapshot) => {
              if (snapshot.empty) return;
              const planList: PlanItem[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                planList.push({
                  id: data.id,
                  label: data.label,
                  status: data.status,
                  priority: data.priority,
                  dependencies: data.dependencies || [],
                  createdAt: data.createdAt
                });
              });
              store.setPlan(planList);
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/plan`)
          );

          // C. Tools List Sync
          const unsubTools = onSnapshot(
            collection(db, "users", user.uid, "tools"),
            (snapshot) => {
              if (snapshot.empty) return;
              const toolsList: ToolItem[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                toolsList.push({
                  id: data.id,
                  name: data.name,
                  category: data.category,
                  status: data.status,
                  icon: data.icon,
                  description: data.description,
                  pingMs: data.pingMs
                });
              });
              store.setTools(toolsList);
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tools`)
          );

          // D. Agent Memory Vectors Sync
          const unsubVectors = onSnapshot(
            collection(db, "users", user.uid, "vectors"),
            (snapshot) => {
              if (snapshot.empty) return;
              const vectorsList: MemoryVector[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                vectorsList.push({
                  id: data.id,
                  topic: data.text ? data.text.substring(0, 24) + "..." : data.topic,
                  content: data.content || data.text,
                  similarity: data.similarity || data.score || 1.0
                });
              });
              store.setVectors(vectorsList);
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/vectors`)
          );

          // E. Active Policies Permissions Sync
          const unsubPerms = onSnapshot(
            collection(db, "users", user.uid, "permissions"),
            (snapshot) => {
              if (snapshot.empty) return;
              const permsList: AgentPermission[] = [];
              snapshot.forEach((doc) => {
                permsList.push(doc.data() as AgentPermission);
              });
              store.setPermissions(permsList);
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/permissions`)
          );

          // F. Agent Credentials Secret Synced
          const unsubCreds = onSnapshot(
            collection(db, "users", user.uid, "credentials"),
            (snapshot) => {
              if (snapshot.empty) return;
              const credsList: AgentCredential[] = [];
              snapshot.forEach((doc) => {
                credsList.push(doc.data() as AgentCredential);
              });
              useFluxStore.setState({ credentials: credsList });
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/credentials`)
          );

          // G. Chat Lobby Conversations
          const unsubMessages = onSnapshot(
            collection(db, "users", user.uid, "chatMessages"),
            (snapshot) => {
              if (snapshot.empty) return;
              const msgs: ChatMessage[] = [];
              snapshot.forEach((doc) => {
                const d = doc.data();
                msgs.push({
                  id: d.id,
                  sender: d.sender === "user" ? "human" : "agent",
                  text: d.text,
                  timestamp: d.timestamp,
                  thoughts: d.thoughts,
                  operations: d.operations
                });
              });
              msgs.sort((a, b) => a.id.localeCompare(b.id));
              store.setChatMessages(msgs);
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/chatMessages`)
          );

          // H. Console Logging Snapshot Sync
          const unsubLogs = onSnapshot(
            collection(db, "users", user.uid, "logs"),
            (snapshot) => {
              if (snapshot.empty) return;
              const logsData: any[] = [];
              snapshot.forEach((doc) => {
                logsData.push(doc.data());
              });
              logsData.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
              store.setLogs(logsData.map((l) => l.text));
            },
            (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/logs`)
          );

          setSyncStatus("synced");

          return () => {
            unsubFiles();
            unsubPlan();
            unsubTools();
            unsubVectors();
            unsubPerms();
            unsubCreds();
            unsubMessages();
            unsubLogs();
          };
        } catch (error) {
          console.error("❌ Setup active subscriber error: ", error);
          setSyncStatus("error");
        }
      } else {
        // Clear Firebase profile values back to local states on logout
        setSyncStatus("idle");
      }
    });

    return () => unsubAuth();
  }, [setUser, setSyncStatus]);

  return null;
}
