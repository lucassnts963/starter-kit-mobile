import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionPanel } from './SessionPanel';
import { parseMeetingType } from '../domain/meeting-type';

const type = parseMeetingType({
  id: 'mini',
  name: 'Mini levantamento',
  output: 'minutes+requirements',
  sections: [
    { id: 'problem', title: 'Problema', questions: ['Qual é o problema?'] },
    { id: 'risks', title: 'Riscos', questions: ['O que pode dar errado?'] },
  ],
});

const baseProps = {
  type,
  status: 'recording' as const,
  degradedReason: null,
  draftText: '',
  assistLoading: false,
  coverage: { covered: [], pending: ['problem', 'risks'] },
  suggestions: [
    { sectionId: 'problem', sectionTitle: 'Problema', question: 'Qual é o problema?' },
    { sectionId: 'risks', sectionTitle: 'Riscos', question: 'O que pode dar errado?' },
  ],
  onPause: jest.fn(),
  onResume: jest.fn(),
  onEnd: jest.fn(),
  onDismissQuestion: jest.fn(),
};

describe('session panel states (TEST-14, REQ-04/10, NFR-05)', () => {
  it('should always show the recording indicator while recording and while paused (REQ-10)', async () => {
    await render(<SessionPanel {...baseProps} />);
    expect(screen.getByTestId('recording-indicator')).toHaveTextContent(/Gravando/);

    await render(<SessionPanel {...baseProps} status="paused" />);
    expect(screen.getByTestId('recording-indicator')).toHaveTextContent(/Pausado/);
  });

  it('should render the empty state with the full roadmap when nothing was covered yet', async () => {
    await render(<SessionPanel {...baseProps} />);
    expect(screen.getByText(/nenhum ponto extraído/i)).toBeTruthy();
    expect(screen.getAllByText('Problema').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Riscos').length).toBeGreaterThan(0);
  });

  it('should show covered sections and pending suggestions (success state)', async () => {
    await render(
      <SessionPanel
        {...baseProps}
        coverage={{ covered: ['problem'], pending: ['risks'] }}
        suggestions={[{ sectionId: 'risks', sectionTitle: 'Riscos', question: 'O que pode dar errado?' }]}
      />,
    );
    expect(screen.getByText(/coberta/i)).toBeTruthy();
    expect(screen.getByText('O que pode dar errado?')).toBeTruthy();
    expect(screen.queryByText('Qual é o problema?')).toBeNull();
  });

  it('should dismiss a suggestion without blocking the screen', async () => {
    const onDismissQuestion = jest.fn();
    await render(<SessionPanel {...baseProps} onDismissQuestion={onDismissQuestion} />);
    await fireEvent.press(screen.getAllByText(/descartar/i)[0]!);
    expect(onDismissQuestion).toHaveBeenCalledWith('Qual é o problema?');
  });

  it('should show a non-blocking banner in recording-only mode (error state, NFR-06)', async () => {
    await render(<SessionPanel {...baseProps} degradedReason="reconhecimento indisponível" />);
    expect(screen.getByText(/somente gravação/i)).toBeTruthy();
    // gravação continua visível e controlável
    expect(screen.getByTestId('recording-indicator')).toHaveTextContent(/Gravando/);
    expect(screen.getByText(/encerrar/i)).toBeTruthy();
  });

  it('should show the assist loading state and fire session controls (loading state)', async () => {
    const onPause = jest.fn();
    const onEnd = jest.fn();
    await render(<SessionPanel {...baseProps} assistLoading onPause={onPause} onEnd={onEnd} />);
    expect(screen.getByTestId('assist-loading')).toBeTruthy();
    await fireEvent.press(screen.getByText(/pausar/i));
    await fireEvent.press(screen.getByText(/encerrar/i));
    expect(onPause).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
  });

  it('should offer resume instead of pause when paused', async () => {
    const onResume = jest.fn();
    await render(<SessionPanel {...baseProps} status="paused" onResume={onResume} />);
    expect(screen.queryByText(/pausar/i)).toBeNull();
    await fireEvent.press(screen.getByText(/retomar/i));
    expect(onResume).toHaveBeenCalled();
  });
});
