import type { MeetingType } from '../meeting-type';
import type { ExtractedPoint } from '../extracted-point';
import { computeCoverage } from '../coverage';
import type { MeetingMeta } from './minutes-builder';

/**
 * Gera o documento de requisitos no formato da metodologia starter-kit (REQ-07):
 * uma seção por seção do template, pontos extraídos como conteúdo, e as seções
 * NÃO cobertas viram checklist explícito em "## Open Questions" — a reunião
 * termina sabendo exatamente o que ficou em aberto.
 */
export function buildRequirementsDoc(
  meta: MeetingMeta,
  type: MeetingType,
  points: ExtractedPoint[],
): string {
  const { pending } = computeCoverage(type, points);
  const pendingSet = new Set(pending);

  const lines: string[] = [`# Requisitos — ${meta.title}`, '', `**${meta.date}**`, '', '---', ''];

  for (const section of type.sections) {
    lines.push(`## ${section.title}`, '');
    const sectionPoints = points.filter((p) => p.sectionId === section.id);
    if (sectionPoints.length === 0) {
      lines.push('_Não coberto nesta reunião — ver Open Questions._', '');
      continue;
    }
    for (const point of sectionPoints) {
      lines.push(`- ${point.text}`);
    }
    lines.push('');
  }

  lines.push('## Open Questions', '');
  if (pendingSet.size === 0) {
    lines.push('_Nenhuma — todas as seções do roteiro foram cobertas._', '');
  } else {
    for (const section of type.sections) {
      if (!pendingSet.has(section.id)) continue;
      for (const question of section.questions) {
        lines.push(`- [ ] ${question}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
