import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { WebsocketContext } from "../contexts/Websocketcontext";

export type GroupQuestion = {
  id: string;
  question: string;
  studentName: string;
  authorId: string | null;
  createdAt: number;
};

type Member = { id: string; name: string };

type Params = {
  sessionId: string;
  user: { id: string; name: string };
};

export function useGroupQuestions({ sessionId, user }: Params) {
  const socket = useContext(WebsocketContext);
  const [questions, setQuestions] = useState<GroupQuestion[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const hasJoinedRef = useRef(false);

  // 내부 Map으로 중복/삭제를 깔끔하게 관리
  const qMapRef = useRef<Map<string, GroupQuestion>>(new Map());

  const rebuild = useCallback(() => {
    const arr = Array.from(qMapRef.current.values()).sort((a, b) => a.createdAt - b.createdAt);
    setQuestions(arr);
  }, []);

  // 세션 참가 + 스냅샷 구독
  useEffect(() => {
    if (!socket || !sessionId || !user?.id) return;

    const join = () => {
      socket.emit("session:join", { sessionId, user });
      socket.emit("questions:subscribe", { sessionId });
    };

    // 최초/재연결 시 조인
    if (!hasJoinedRef.current) {
      join();
      hasJoinedRef.current = true;
    }

    const onConnect = () => join();
    const onSessionJoined = (payload: { members?: Member[] }) => {
      if (payload?.members) setMembers(payload.members);
    };

    const onMemberJoined = (payload: { member: Member }) =>
      setMembers((prev) => [...prev.filter((m) => m.id !== payload.member.id), payload.member]);
    const onMemberLeft = (payload: { member: Member }) =>
      setMembers((prev) => prev.filter((m) => m.id !== payload.member.id));

    const onSnapshot = (payload: { questions?: GroupQuestion[] }) => {
      qMapRef.current.clear();
      (payload?.questions ?? []).forEach((q) => qMapRef.current.set(q.id, q));
      rebuild();
    };

    const onNew = (q: GroupQuestion) => {
      if (!qMapRef.current.has(q.id)) {
        qMapRef.current.set(q.id, q);
        rebuild();
      }
    };

    const onRemove = (payload: { id: string }) => {
      qMapRef.current.delete(payload.id);
      rebuild();
    };

    const onClear = () => {
      qMapRef.current.clear();
      rebuild();
    };

    socket.on("connect", onConnect);
    socket.on("session:joined", onSessionJoined);
    socket.on("session:member:joined", onMemberJoined);
    socket.on("session:member:left", onMemberLeft);
    socket.on("questions:snapshot", onSnapshot);
    socket.on("questions:new", onNew);
    socket.on("questions:remove", onRemove);
    socket.on("questions:clear", onClear);

    return () => {
      socket.off("connect", onConnect);
      socket.off("session:joined", onSessionJoined);
      socket.off("session:member:joined", onMemberJoined);
      socket.off("session:member:left", onMemberLeft);
      socket.off("questions:snapshot", onSnapshot);
      socket.off("questions:new", onNew);
      socket.off("questions:remove", onRemove);
      socket.off("questions:clear", onClear);
    };
  }, [socket, sessionId, user?.id, user?.name, rebuild]);

  // 액션
  const addQuestion = useCallback(
    (text: string) => {
      if (!socket || !sessionId || !text.trim()) return;
      socket.emit("questions:add", {
        sessionId,
        question: { text, studentName: user.name },
      });
    },
    [socket, sessionId, user?.name]
  );

  const removeQuestion = useCallback(
    (id: string) => {
      if (!socket || !sessionId || !id) return;
      socket.emit("questions:remove", { sessionId, id });
    },
    [socket, sessionId]
  );

  const clearQuestions = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit("questions:clear", { sessionId });
  }, [socket, sessionId]);

  const uiQuestions = useMemo(
    () =>
      questions.map((q) => ({
        ...q,
        isYourQuestion: q.authorId === user.id,
      })),
    [questions, user?.id]
  );

  return {
    questions: uiQuestions, // { ... , isYourQuestion } 포함
    members,
    addQuestion,
    removeQuestion,
    clearQuestions,
  };
}