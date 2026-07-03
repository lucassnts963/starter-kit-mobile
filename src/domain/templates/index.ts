import { parseMeetingType, type MeetingType } from '../meeting-type';
import { requirementsElicitationTemplate } from './requirements-elicitation';
import { genericMeetingTemplate } from './generic-meeting';

const TEMPLATES: unknown[] = [requirementsElicitationTemplate, genericMeetingTemplate];

export class UnknownMeetingTypeError extends Error {
  constructor(typeId: string) {
    super(`Tipo de reunião desconhecido: "${typeId}"`);
    this.name = 'UnknownMeetingTypeError';
  }
}

/** Registro dos tipos de reunião embarcados (REQ-08). Tipos custom entram aqui via dados. */
export function resolveMeetingType(typeId: string): MeetingType {
  const template = TEMPLATES.find((t) => (t as { id?: string }).id === typeId);
  if (!template) throw new UnknownMeetingTypeError(typeId);
  return parseMeetingType(template);
}
