export function parseLLMScore(apiPayload) {
  const rawArray = JSON.parse(apiPayload.response);
  return rawArray.map(({ standard, response: raw }) => {
    const match = raw.match(/^\s*(\d+)\s*[-:]\s*/);
    let score = NaN;
    let feedback = raw;
    if (match) {
      score = parseInt(match[1], 10);
      feedback = raw.slice(match[0].length).trim();
      return { standard, score, response: feedback };
    }
  })
}