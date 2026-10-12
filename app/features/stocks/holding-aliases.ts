import type { AnalysisResult } from "./analysis.types";

export function restoreStoredHoldingAliases(
  text: string,
  holdings: AnalysisResult["holdings"],
) {
  const namesByLetter = new Map(
    holdings.map((holding, index) => [
      String.fromCharCode(65 + index),
      holding.name,
    ]),
  );
  const expandRange = (startLetter: string, endLetter: string) => {
    const start = startLetter.charCodeAt(0) - 65;
    const end = endLetter.charCodeAt(0) - 65;
    if (start < 0 || end < start || end >= holdings.length)
      return `${startLetter}~${endLetter}`;
    return holdings
      .slice(start, end + 1)
      .map((holding) => holding.name)
      .join("·");
  };
  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let restored = text;
  holdings.forEach((holding, start) => {
    restored = restored.replace(
      new RegExp(
        `${escapeRegExp(holding.name)}\\s*[~～-]\\s*(?:종목\\s*)?([A-J])`,
        "g",
      ),
      (matched, endLetter: string) => {
        const end = endLetter.charCodeAt(0) - 65;
        return end >= start && end < holdings.length
          ? holdings
              .slice(start, end + 1)
              .map((item) => item.name)
              .join("·")
          : matched;
      },
    );
  });

  const namesRestored = restored
    .replace(
      /종목\s*([A-J])\s*[~～-]\s*(?:종목\s*)?([A-J])/g,
      (_, start: string, end: string) => expandRange(start, end),
    )
    .replace(
      /종목\s*([A-J])|\b([A-J])\s*종목/g,
      (matched, afterPrefix, beforeSuffix) =>
        namesByLetter.get(afterPrefix ?? beforeSuffix) ?? matched,
    )
    .replace(
      /([·,/]+\s*)([A-J])\b/g,
      (matched, separator: string, letter: string) =>
        `${separator}${namesByLetter.get(letter) ?? matched}`,
    );

  return holdings.reduce((sentence, holding) => {
    const lastHangul = [...holding.name]
      .reverse()
      .find((character) => /[가-힣]/.test(character));
    if (!lastHangul) return sentence;
    const finalConsonant = (lastHangul.charCodeAt(0) - 0xac00) % 28;
    const hasFinalConsonant = finalConsonant > 0;
    const escapedName = escapeRegExp(holding.name);
    const particles = [
      ["은|는", hasFinalConsonant ? "은" : "는"],
      ["이|가", hasFinalConsonant ? "이" : "가"],
      ["을|를", hasFinalConsonant ? "을" : "를"],
      ["과|와", hasFinalConsonant ? "과" : "와"],
      ["으로|로", hasFinalConsonant && finalConsonant !== 8 ? "으로" : "로"],
    ] as const;
    return particles.reduce(
      (result, [pattern, particle]) =>
        result.replace(
          new RegExp(`${escapedName}(?:${pattern})`, "g"),
          `${holding.name}${particle}`,
        ),
      sentence,
    );
  }, namesRestored);
}
