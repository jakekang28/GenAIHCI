type RawQuestion = {
  id?: string;
  text?: string;        // 내 클라이언트에서 보낸 필드명
  question?: string;    // 혹시 다른 곳에서 온 필드명
  ts?: number;          // timestamp
  author?: {
    id?: string;
    name?: string;
  };
};

type GroupmateQuestionItem = {
  id: string;
  studentName: string;
  isYourQuestion: boolean;
  question: string;
};

// 안전 파서
function safeParse<T = any>(s: string | null): T | null {
  try { return s ? JSON.parse(s) as T : null; } catch { return null; }
}

const GUEST_PROFILE_KEY = 'guestProfile'; // { guestUserId, guestName }를 저장한 키

/**
 * 실시간 원시 질문 배열(rawQuestions)을 UI에서 쓰는 형태로 변환
 * - 내 질문을 맨 위로
 * - 그다음 최신(ts 내림차순)
 * - 중복 제거
 * - 질문/작성자 기본값 처리
 */
export function generateGroupmateQuestions(rawQuestions?: RawQuestion[]): GroupmateQuestionItem[] {
  // 1) 내 정보 로드
  const me = safeParse<{ guestUserId?: string; guestName?: string }>(
    localStorage.getItem(GUEST_PROFILE_KEY)
  ) || {};

  // 2) 원천 데이터: 인자가 없으면 세션 캐시(선택)에서 시도
  const fromCache = safeParse<RawQuestion[]>(sessionStorage.getItem('session:questions')) || [];
  const source = Array.isArray(rawQuestions) ? rawQuestions : fromCache;

  // 3) 변환
  const mapped = (source || [])
    .map((q): (GroupmateQuestionItem & { _ts: number }) => {
      const text = (q.text ?? q.question ?? '').trim();
      const authorId = q.author?.id ?? '';
      const authorName = (q.author?.name ?? 'Guest').trim();
      const id = q.id || `${authorId}-${q.ts ?? ''}-${text.slice(0, 12)}`;
      return {
        id,
        studentName: authorName || 'Guest',
        isYourQuestion: !!(me?.guestUserId && authorId && me.guestUserId === authorId),
        question: text,
        _ts: q.ts ?? 0,
      };
    })
    .filter(it => it.question.length > 0);

  // 4) 중복 제거(같은 id 우선, 없으면 같은 질문 텍스트로)
  const seen = new Set<string>();
  const unique: (GroupmateQuestionItem & { _ts: number })[] = [];
  for (const it of mapped) {
    const key = it.id || `q:${it.question}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  // 5) 정렬: 내 질문 먼저 → 최신순
  unique.sort((a, b) => {
    if (a.isYourQuestion !== b.isYourQuestion) return a.isYourQuestion ? -1 : 1;
    return (b._ts || 0) - (a._ts || 0);
  });

  // 6) _ts 제거 후 반환
  return unique.map(({ _ts, ...rest }) => rest);
}