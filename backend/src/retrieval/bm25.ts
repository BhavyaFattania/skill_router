import { tokenize } from "./tokenize.js";

export class Bm25Index {
  private readonly documents: string[][];
  private readonly frequencies: Map<string, number>[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  constructor(texts: string[]) {
    this.documents = texts.map(tokenize);
    this.frequencies = this.documents.map((tokens) => {
      const counts = new Map<string, number>();
      for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
      for (const token of new Set(tokens)) {
        this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
      }
      return counts;
    });
    this.averageLength = this.documents.reduce((sum, tokens) => sum + tokens.length, 0) / Math.max(this.documents.length, 1);
  }

  scores(query: string): number[] {
    const terms = tokenize(query);
    const rawScores = this.documents.map((tokens, index) => {
      let score = 0;
      for (const term of terms) {
        const frequency = this.frequencies[index].get(term) ?? 0;
        if (frequency === 0) continue;
        const idf = Math.log(1 + (this.documents.length - (this.documentFrequency.get(term) ?? 0) + 0.5) / ((this.documentFrequency.get(term) ?? 0) + 0.5));
        const denominator = frequency + this.k1 * (1 - this.b + this.b * (tokens.length / this.averageLength));
        score += idf * ((frequency * (this.k1 + 1)) / denominator);
      }
      return score;
    });
    const maxPossible = terms.reduce((sum, term) => {
      const df = this.documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (this.documents.length - df + 0.5) / (df + 0.5));
      return sum + idf * (this.k1 + 1);
    }, 0);
    return maxPossible === 0 ? rawScores : rawScores.map((score) => score / maxPossible);
  }
}
