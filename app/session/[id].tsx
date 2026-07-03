import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useServices } from '../../src/expo/services-context';
import { SessionPanel } from '../../src/components/SessionPanel';
import { resolveMeetingType } from '../../src/domain/templates';
import { fullText } from '../../src/domain/transcript';
import { suggestQuestions, type Coverage, type QuestionSuggestion } from '../../src/domain/coverage';
import type { MeetingType } from '../../src/domain/meeting-type';

const ASSIST_INTERVAL_MS = 30_000;

/** Tela da sessão: hook fino ligando RecordingService + LiveTranscription + LiveAssist ao painel. */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const services = useServices();
  const [type, setType] = useState<MeetingType | null>(null);
  const [status, setStatus] = useState<'recording' | 'paused'>('recording');
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);
  const [coverage, setCoverage] = useState<Coverage>({ covered: [], pending: [] });
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);
  const dismissed = useRef(new Set<string>());
  const started = useRef(false);

  // inicia gravação + rascunho ao vivo uma única vez
  useEffect(() => {
    if (started.current || !id) return;
    started.current = true;
    const meetingType = (async () => {
      const meeting = await services.meetings.findById(id);
      const resolved = resolveMeetingType(meeting?.typeId ?? 'generic-meeting');
      setType(resolved);
      setCoverage({ covered: [], pending: resolved.sections.map((s) => s.id) });
      setSuggestions(suggestQuestions(resolved, []));

      try {
        await services.recording.start(id);
      } catch (error) {
        Alert.alert('Gravação indisponível', error instanceof Error ? error.message : String(error));
        router.back();
        return;
      }
      const live = await services.liveTranscription.start(id, 'pt-BR');
      if (!live.ok) setDegradedReason('reconhecimento de fala indisponível');
    })();
    void meetingType;
  }, [id, services]);

  // loop de assistência (REQ-04/05): extrai pontos do delta a cada intervalo
  useEffect(() => {
    if (!type || !id) return;
    const timer = setInterval(async () => {
      setAssistLoading(true);
      try {
        const assist = await services.createLiveAssist();
        const result = await assist.processDelta(id, type);
        if (result.ok) {
          setCoverage(result.coverage);
          setSuggestions(result.suggestions.filter((s) => !dismissed.current.has(s.question)));
          setDegradedReason(null);
        } else {
          setDegradedReason(result.error);
        }
        const segments = await services.transcripts.listByMeeting(id);
        setDraftText(fullText(segments, 'draft'));
      } finally {
        setAssistLoading(false);
      }
    }, ASSIST_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [id, type, services]);

  const onPause = useCallback(async () => {
    await services.recording.pause(id!);
    setStatus('paused');
  }, [id, services]);

  const onResume = useCallback(async () => {
    await services.recording.resume(id!);
    setStatus('recording');
  }, [id, services]);

  const onEnd = useCallback(async () => {
    await services.liveTranscription.stop(id!);
    await services.recording.stop(id!);
    router.replace({ pathname: '/results/[id]', params: { id: id! } });
  }, [id, services]);

  const onDismissQuestion = useCallback((question: string) => {
    dismissed.current.add(question);
    setSuggestions((current) => current.filter((s) => s.question !== question));
  }, []);

  const panel = useMemo(() => {
    if (!type) return null;
    return (
      <SessionPanel
        type={type}
        status={status}
        degradedReason={degradedReason}
        draftText={draftText}
        assistLoading={assistLoading}
        coverage={coverage}
        suggestions={suggestions}
        onPause={onPause}
        onResume={onResume}
        onEnd={onEnd}
        onDismissQuestion={onDismissQuestion}
      />
    );
  }, [type, status, degradedReason, draftText, assistLoading, coverage, suggestions, onPause, onResume, onEnd, onDismissQuestion]);

  return <View style={{ flex: 1 }}>{panel}</View>;
}
