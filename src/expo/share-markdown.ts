import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Export via share sheet do sistema (REQ-09): nada sai do aparelho sem ação
 * explícita do usuário. Grava o Markdown em cache e abre o share sheet.
 */
export async function shareMarkdown(filename: string, content: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/markdown', dialogTitle: filename });
}
