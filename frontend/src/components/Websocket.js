//WEBSOCKET COMPONENT
import { useContext, useEffect } from "react";
import { WebsocketContext } from "../contexts/Websocketcontext";

export const Websocket = () => {
    const socket = useContext(WebsocketContext);
    const GUEST_PROFILE_KEY = "guestProfile";         
    const SESSION_ID_KEY    = "session:id";          
    const QUESTIONS_KEY     = "session:questions";

    const safeParse = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };
    const getMe = () => safeParse(localStorage.getItem(GUEST_PROFILE_KEY), {});
    const getQuestions = () => safeParse(sessionStorage.getItem(QUESTIONS_KEY), []) || [];
    const saveQuestions = (next) => {
      sessionStorage.setItem(QUESTIONS_KEY, JSON.stringify(next ?? []));
      // UI에 알림 (옵셔널): 다른 컴포넌트가 이 이벤트로 리렌더 트리거 가능
      window.dispatchEvent(new CustomEvent("questions:update", { detail: { questions: next ?? [] } }));
    };
    const ensureSessionId = () => {
      let id = sessionStorage.getItem(SESSION_ID_KEY);
      if (!id) {
        id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        sessionStorage.setItem(SESSION_ID_KEY, id);
      }
      return id;
    };

    // ---- session restart (옵션) ----
    const handleSessionRestart = () => {
      sessionStorage.removeItem(SESSION_ID_KEY);
      saveQuestions([]);
      joinedRef.current = false;
      // 재조인
      const me = getMe();
      const sessionId = ensureSessionId();
      if (me?.guestUserId) {
        socket.emit("session:join", { sessionId, user: { id: me.guestUserId, name: me.guestName }, restart: true });
        socket.emit("questions:subscribe", { sessionId });
        joinedRef.current = true;
      }
    };
    window.addEventListener("session:restart", handleSessionRestart);
    useEffect(() => {
        socket.on('connect', () => {
            const me = getMe();                            // { guestUserId, guestName }
            const sessionId = ensureSessionId();
            if (!me?.guestUserId) {
                console.warn("[ws] guestProfile가 없습니다. {guestUserId, guestName}를 localStorage에 저장해 주세요.");
                return;
            }
            if (joinedRef.current) return;

            socket.emit("session:join", { sessionId, user: { id: me.guestUserId, name: me.guestName } });
            socket.emit("questions:subscribe", { sessionId }); // 서버가 스냅샷+라이브를 푸시하도록
            joinedRef.current = true;

        });
        socket.on("questions:snapshot", (payload) => {
        const list = Array.isArray(payload?.questions) ? payload.questions : [];
        saveQuestions(list);
        });
        socket.on('onMessage', (data) =>{
        });
        socket.on("questions:new", (q) => {
        const next = [...getQuestions(), q];
        saveQuestions(next);
        });
        socket.on("questions:remove", ({ id }) => {
        const next = getQuestions().filter((it) => it.id !== id);
        saveQuestions(next);
        });

        socket.on("questions:clear", () => saveQuestions([]));

    // 서버가 onMessage 하나로 보내는 경우를 대비한 라우팅 (선택)
        socket.on("onMessage", (data) => {
        switch (data?.type) {
            case "questions:snapshot":
            saveQuestions(Array.isArray(data.questions) ? data.questions : []);
            break;
            case "questions:new":
            saveQuestions([...getQuestions(), data.question]);
            break;
            case "questions:remove":
            saveQuestions(getQuestions().filter((it) => it.id !== data.id));
            break;
            case "questions:clear":
            saveQuestions([]);
            break;
            default:
            break;
        }
        });
        return () => {
        window.removeEventListener("session:restart", handleSessionRestart);
        socket.off("connect");
        socket.off("questions:snapshot");
        socket.off("questions:new");
        socket.off("questions:remove");
        socket.off("questions:clear");
        socket.off("onMessage");
        joinedRef.current = false;
        };
  }, [socket]);
    return(
        <div>
            <h1>Websocket Component</h1>
        </div>
    );
};