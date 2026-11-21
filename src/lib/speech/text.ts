/**
 * Makes assistant text pleasant to hear: drops markdown, emoji and links,
 * and reads time ranges naturally in Turkish.
 */
export function toSpeakable(text: string): string {
  return (
    text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_`#>]+/g, "")
      .replace(/^\s*[-•]\s+/gm, "")
      .replace(/^\s*(\d+)[.)]\s+/gm, "$1. ")
      // "10:00–11:00" / "10:00-11:00" -> "10:00 ile 11:00 arası"
      // (an "arası" already in the text is absorbed, not doubled)
      // (\b is ASCII-only and misses the end of "arası", so use a lookahead)
      .replace(/\b(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\b(?:\s+arası(?=[\s.,!?;:]|$))?/g, "$1 ile $2 arası")
      .replace(/\p{Extended_Pictographic}️?/gu, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n+\s*/g, ". ")
      .replace(/\.\s*\./g, ".")
      .trim()
  );
}

const STOP_PHRASES = new Set([
  "tamam",
  "tamamdır",
  "teşekkürler",
  "teşekkür ederim",
  "sağ ol",
  "sağol",
  "eyvallah",
  "bitir",
  "bitti",
  "dur",
  "kapat",
  "yeter",
  "görüşürüz",
  "hoşça kal",
  "sesli sohbeti kapat",
  "sesli sohbeti bitir",
]);

/**
 * Whether a spoken utterance only ends the hands-free conversation
 * ("tamam teşekkürler", "bitir"). It must consist of stop words alone:
 * "tamam, yarın 10'a toplantı ekle" is a command, not a goodbye.
 */
export function isStopPhrase(utterance: string): boolean {
  const words = utterance
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?;:…'"]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;

  // Consume the utterance greedily with known phrases (longest first).
  let i = 0;
  while (i < words.length) {
    let matched = 0;
    for (let len = Math.min(3, words.length - i); len > 0; len--) {
      if (STOP_PHRASES.has(words.slice(i, i + len).join(" "))) {
        matched = len;
        break;
      }
    }
    if (!matched) return false;
    i += matched;
  }
  return true;
}

/**
 * Splits streamed text into complete sentences and the unfinished rest.
 * A sentence ends at . ! ? … or a newline followed by whitespace; "10:30" or
 * "3.5" do not end a sentence because no whitespace follows the mark.
 */
export function takeSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  const re = /[^.!?…\n]*(?:[.!?…]+(?=\s)|\n)/g;
  let last = 0;
  for (let m = re.exec(buffer); m; m = re.exec(buffer)) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    const s = m[0].trim();
    if (s) sentences.push(s);
    last = re.lastIndex;
  }
  // A list marker like "1." is not a sentence: keep it with what follows.
  if (sentences.length > 0 && /^\d+[.)]$/.test(sentences[sentences.length - 1])) {
    const marker = sentences.pop()!;
    const markerStart = buffer.lastIndexOf(marker, last);
    return { sentences: mergeMarkers(sentences), rest: buffer.slice(markerStart) };
  }
  return { sentences: mergeMarkers(sentences), rest: buffer.slice(last) };
}

/** Joins "2." with the sentence after it inside an already-split list. */
function mergeMarkers(sentences: string[]): string[] {
  const out: string[] = [];
  for (const s of sentences) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /^\d+[.)]$/.test(prev)) out[out.length - 1] = `${prev} ${s}`;
    else out.push(s);
  }
  return out;
}
