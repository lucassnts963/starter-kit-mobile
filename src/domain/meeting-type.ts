export interface MeetingSection {
  id: string;
  title: string;
  /** Roteiro de perguntas-guia da seção (motor de perguntas, REQ-04). */
  questions: string[];
}

export type MeetingOutput = 'minutes' | 'minutes+requirements';

export interface MeetingType {
  id: string;
  name: string;
  output: MeetingOutput;
  sections: MeetingSection[];
}

export class InvalidMeetingTypeError extends Error {
  constructor(reason: string) {
    super(`Tipo de reunião inválido: ${reason}`);
    this.name = 'InvalidMeetingTypeError';
  }
}

/**
 * Tipos de reunião são DADOS, não código (REQ-08): qualquer objeto que passe nesta
 * validação vira um tipo utilizável pelo motor de cobertura/perguntas e pelos builders.
 */
export function parseMeetingType(data: unknown): MeetingType {
  const t = data as Partial<MeetingType> | null;
  if (!t || typeof t !== 'object') throw new InvalidMeetingTypeError('não é um objeto');
  if (!t.id || typeof t.id !== 'string') throw new InvalidMeetingTypeError('id ausente');
  if (!t.name || typeof t.name !== 'string') throw new InvalidMeetingTypeError('name ausente');
  if (t.output !== 'minutes' && t.output !== 'minutes+requirements') {
    throw new InvalidMeetingTypeError(`output desconhecido: "${String(t.output)}"`);
  }
  if (!Array.isArray(t.sections) || t.sections.length === 0) {
    throw new InvalidMeetingTypeError('sections vazio');
  }
  const seen = new Set<string>();
  for (const s of t.sections) {
    if (!s || typeof s.id !== 'string' || s.id === '') throw new InvalidMeetingTypeError('seção sem id');
    if (typeof s.title !== 'string' || s.title === '') throw new InvalidMeetingTypeError(`seção "${s.id}" sem título`);
    if (!Array.isArray(s.questions)) throw new InvalidMeetingTypeError(`seção "${s.id}" sem questions`);
    if (seen.has(s.id)) throw new InvalidMeetingTypeError(`seção duplicada: "${s.id}"`);
    seen.add(s.id);
  }
  return {
    id: t.id,
    name: t.name,
    output: t.output,
    sections: t.sections.map((s) => ({ id: s.id, title: s.title, questions: [...s.questions] })),
  };
}
