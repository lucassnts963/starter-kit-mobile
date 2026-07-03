/**
 * Template "Reunião Genérica" — pauta e ata simples (REQ-08).
 * É DADO puro: qualquer outro tipo (planning, retro, 1:1) segue este formato.
 */
export const genericMeetingTemplate = {
  id: 'generic-meeting',
  name: 'Reunião Genérica',
  output: 'minutes',
  sections: [
    {
      id: 'topics',
      title: 'Tópicos Discutidos',
      questions: ['Quais assuntos foram tratados?'],
    },
    {
      id: 'decisions',
      title: 'Decisões',
      questions: ['O que ficou decidido? Quem decidiu?'],
    },
    {
      id: 'open-items',
      title: 'Pendências',
      questions: ['O que ficou em aberto e precisa de resposta depois?'],
    },
    {
      id: 'action-items',
      title: 'Ações',
      questions: ['Quem faz o quê, e até quando?'],
    },
  ],
} as const;
