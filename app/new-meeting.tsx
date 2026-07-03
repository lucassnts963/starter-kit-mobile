import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useServices } from '../src/expo/services-context';
import { getProviderDescriptor } from '../src/adapters/provider-catalog';
import { requirementsElicitationTemplate } from '../src/domain/templates/requirements-elicitation';
import { genericMeetingTemplate } from '../src/domain/templates/generic-meeting';

const TYPES = [requirementsElicitationTemplate, genericMeetingTemplate];

/** Criação de reunião: tipo + consentimento (C-04) + aviso de diarização (US-10.3). */
export default function NewMeetingScreen() {
  const { session, settings } = useServices();
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState<string>(TYPES[0]!.id);
  const [consent, setConsent] = useState(false);
  const [diarizationWarning, setDiarizationWarning] = useState(false);

  useEffect(() => {
    settings.getSelectedProvider('stt-batch').then((id) => {
      setDiarizationWarning(getProviderDescriptor(id).supportsDiarization === false);
    });
  }, [settings]);

  const create = async () => {
    const meeting = await session.createMeeting(title.trim() || 'Reunião sem título', typeId, consent);
    router.replace({ pathname: '/session/[id]', params: { id: meeting.id } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Título</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex.: Levantamento CRM" />

      <Text style={styles.label}>Tipo de reunião</Text>
      {TYPES.map((t) => (
        <Pressable key={t.id} style={[styles.type, typeId === t.id && styles.typeSelected]} onPress={() => setTypeId(t.id)}>
          <Text style={typeId === t.id ? styles.typeTextSelected : styles.typeText}>{t.name}</Text>
        </Pressable>
      ))}

      {diarizationWarning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            O provedor de transcrição selecionado não identifica falantes (diarização). A ata sairá sem
            nomes. Troque para o ElevenLabs Scribe nas Configurações se precisar disso.
          </Text>
        </View>
      ) : null}

      <View style={styles.consentRow}>
        <Switch value={consent} onValueChange={setConsent} />
        <Text style={styles.consentText}>
          Confirmei com todos os participantes que a reunião será gravada e transcrita (LGPD).
        </Text>
      </View>

      <Pressable style={[styles.primary, !consent && styles.disabled]} disabled={!consent} onPress={create}>
        <Text style={styles.primaryText}>Criar e abrir sessão</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  type: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginTop: 4 },
  typeSelected: { borderColor: '#2c3e50', backgroundColor: '#eef3f8' },
  typeText: { color: '#333' },
  typeTextSelected: { color: '#2c3e50', fontWeight: 'bold' },
  warning: { backgroundColor: '#fdf3d0', borderRadius: 8, padding: 10, marginTop: 8 },
  warningText: { color: '#7a5d00' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  consentText: { flex: 1, color: '#333' },
  primary: { backgroundColor: '#2c3e50', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  primaryText: { color: 'white', fontWeight: 'bold' },
  disabled: { opacity: 0.4 },
});
