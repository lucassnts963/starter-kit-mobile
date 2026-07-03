/**
 * Template "Levantamento de Requisitos" — espelha as seções do template do starter-kit
 * (`.specs/templates/requirements-spec.md`) e os passos da skill `gather-requirements`.
 * É DADO puro (REQ-08): editar perguntas ou seções não exige mudança no motor.
 */
export const requirementsElicitationTemplate = {
  id: 'requirements-elicitation',
  name: 'Levantamento de Requisitos',
  output: 'minutes+requirements',
  sections: [
    {
      id: 'problem',
      title: 'Problema',
      questions: [
        'Descreva o problema ou a necessidade em 2-3 frases.',
        'O que acontece se nada for feito? Qual o custo da inação?',
        'Como saberemos que o problema foi resolvido? Que métricas devem mudar?',
      ],
    },
    {
      id: 'stakeholders',
      title: 'Stakeholders',
      questions: [
        'Quem é afetado por esse problema ou pela solução?',
        'Quem decide? Quem usa no dia a dia? Quem mantém?',
        'Qual a principal preocupação de cada envolvido?',
      ],
    },
    {
      id: 'functional-requirements',
      title: 'Requisitos Funcionais',
      questions: [
        'O que o sistema precisa fazer, do ponto de vista de quem usa?',
        'Para cada papel: o que essa pessoa precisa realizar e por quê?',
        'Como saberemos que cada funcionalidade está pronta (critérios de aceite)?',
      ],
    },
    {
      id: 'non-functional-requirements',
      title: 'Requisitos Não-Funcionais',
      questions: [
        'Há exigências de desempenho (tempo de resposta, volume, simultaneidade)?',
        'Há exigências de segurança ou privacidade de dados?',
        'Há exigências de acessibilidade, usabilidade ou conformidade legal?',
      ],
    },
    {
      id: 'constraints',
      title: 'Restrições',
      questions: [
        'Existe restrição técnica (stack, integrações, sistemas legados)?',
        'Existe restrição de orçamento ou prazo?',
        'Existe restrição regulatória ou contratual?',
      ],
    },
    {
      id: 'assumptions',
      title: 'Premissas',
      questions: [
        'O que estamos assumindo como verdade sem ter validado?',
        'Qual o risco se cada premissa estiver errada?',
      ],
    },
    {
      id: 'out-of-scope',
      title: 'Fora de Escopo',
      questions: [
        'O que explicitamente NÃO faz parte desta entrega?',
        'O que fica para uma fase futura?',
      ],
    },
    {
      id: 'priorities',
      title: 'Prioridades (MoSCoW)',
      questions: [
        'Sem o quê não faz sentido lançar (Must)?',
        'O que é importante mas não bloqueia o lançamento (Should/Could)?',
      ],
    },
    {
      id: 'risks',
      title: 'Riscos',
      questions: [
        'O que pode dar errado neste projeto?',
        'Para cada risco: qual a chance, o impacto e como mitigar?',
      ],
    },
    {
      id: 'dependencies',
      title: 'Dependências',
      questions: [
        'De quais sistemas, equipes ou fornecedores essa solução depende?',
        'O que quebra se uma dependência não estiver disponível?',
      ],
    },
  ],
} as const;
