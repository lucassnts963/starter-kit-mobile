import { parseMeetingType, InvalidMeetingTypeError } from './meeting-type';
import { requirementsElicitationTemplate } from './templates/requirements-elicitation';
import { genericMeetingTemplate } from './templates/generic-meeting';

describe('meeting type templates are data (TEST-09)', () => {
  it('should load the requirements-elicitation template as plain data', () => {
    const type = parseMeetingType(requirementsElicitationTemplate);
    expect(type.id).toBe('requirements-elicitation');
    expect(type.output).toBe('minutes+requirements');
    const sectionIds = type.sections.map((s) => s.id);
    // espelha o template do starter-kit (.specs/templates/requirements-spec.md)
    for (const expected of [
      'problem',
      'stakeholders',
      'functional-requirements',
      'non-functional-requirements',
      'constraints',
      'assumptions',
      'out-of-scope',
      'priorities',
      'risks',
    ]) {
      expect(sectionIds).toContain(expected);
    }
  });

  it('should load the generic meeting template with minutes-only output', () => {
    const type = parseMeetingType(genericMeetingTemplate);
    expect(type.id).toBe('generic-meeting');
    expect(type.output).toBe('minutes');
    expect(type.sections.length).toBeGreaterThan(0);
  });

  it('should provide at least one guiding question per section (motor de perguntas)', () => {
    for (const template of [requirementsElicitationTemplate, genericMeetingTemplate]) {
      const type = parseMeetingType(template);
      for (const section of type.sections) {
        expect(section.questions.length).toBeGreaterThan(0);
      }
    }
  });

  it('should accept a brand-new type defined as data without engine changes', () => {
    const custom = parseMeetingType({
      id: 'retro',
      name: 'Retrospectiva',
      output: 'minutes',
      sections: [
        { id: 'went-well', title: 'O que foi bem', questions: ['O que funcionou?'] },
        { id: 'improve', title: 'O que melhorar', questions: ['O que travou o time?'] },
      ],
    });
    expect(custom.sections).toHaveLength(2);
  });

  it('should reject a type without sections', () => {
    expect(() => parseMeetingType({ id: 'x', name: 'X', output: 'minutes', sections: [] })).toThrow(
      InvalidMeetingTypeError,
    );
  });

  it('should reject non-object, missing id, missing name and unknown output', () => {
    expect(() => parseMeetingType(null)).toThrow(InvalidMeetingTypeError);
    expect(() => parseMeetingType('texto')).toThrow(InvalidMeetingTypeError);
    expect(() => parseMeetingType({ name: 'X', output: 'minutes', sections: [] })).toThrow(InvalidMeetingTypeError);
    expect(() => parseMeetingType({ id: 'x', output: 'minutes', sections: [] })).toThrow(InvalidMeetingTypeError);
    expect(() =>
      parseMeetingType({ id: 'x', name: 'X', output: 'pdf', sections: [{ id: 'a', title: 'A', questions: [] }] }),
    ).toThrow(InvalidMeetingTypeError);
  });

  it('should reject malformed sections (sem id, sem título, sem questions)', () => {
    const base = { id: 'x', name: 'X', output: 'minutes' as const };
    expect(() => parseMeetingType({ ...base, sections: [{ title: 'A', questions: [] }] })).toThrow(
      InvalidMeetingTypeError,
    );
    expect(() => parseMeetingType({ ...base, sections: [{ id: 'a', questions: [] }] })).toThrow(
      InvalidMeetingTypeError,
    );
    expect(() => parseMeetingType({ ...base, sections: [{ id: 'a', title: 'A' }] })).toThrow(
      InvalidMeetingTypeError,
    );
  });

  it('should reject duplicated section ids', () => {
    expect(() =>
      parseMeetingType({
        id: 'x',
        name: 'X',
        output: 'minutes',
        sections: [
          { id: 'a', title: 'A', questions: ['q'] },
          { id: 'a', title: 'A2', questions: ['q'] },
        ],
      }),
    ).toThrow(InvalidMeetingTypeError);
  });
});
