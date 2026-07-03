import type { MeetingType } from '../meeting-type';
import type { ExtractedPoint } from '../extracted-point';

export interface MeetingMeta {
  title: string;
  date: string;
}

/**
 * Ata determinística (REQ-06, mitigação de alucinação): o Markdown é montado
 * exclusivamente dos títulos do template e dos pontos extraídos (ancorados na
 * transcrição). O LLM nunca escreve a ata "livre".
 */
export function buildMinutes(meta: MeetingMeta, type: MeetingType, points: ExtractedPoint[]): string {
  const lines: string[] = [`# ${meta.title}`, '', `**${meta.date}**`, '', '---', ''];
  for (const section of type.sections) {
    lines.push(`## ${section.title}`, '');
    const sectionPoints = points.filter((p) => p.sectionId === section.id);
    for (const point of sectionPoints) {
      lines.push(`- ${point.text}`);
    }
    if (sectionPoints.length > 0) lines.push('');
  }
  return lines.join('\n');
}
