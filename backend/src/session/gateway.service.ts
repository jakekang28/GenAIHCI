import { Injectable } from '@nestjs/common';

export interface QuestionItem {
  id: string;            // userId
  studentName: string;
  question: string;
}

@Injectable()
export class GroupQuestionService {
  // sessionId -> (userId -> QuestionItem)
  private store = new Map<string, Map<string, QuestionItem>>();

  private ensureSession(sessionId: string) {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, new Map());
    }
    return this.store.get(sessionId)!;
  }

  getSnapshot(sessionId: string): QuestionItem[] {
    const s = this.store.get(sessionId);
    if (!s) return [];
    return Array.from(s.values());
  }

  upsert(sessionId: string, userId: string, studentName: string, question: string): QuestionItem {
    const session = this.ensureSession(sessionId);
    const item: QuestionItem = { id: userId, studentName, question };
    session.set(userId, item);
    return item;
  }

  remove(sessionId: string, userId: string): boolean {
    const s = this.store.get(sessionId);
    if (!s) return false;
    return s.delete(userId);
  }

  clear(sessionId: string) {
    this.store.delete(sessionId);
  }
}