import {
  CORRECTION_WEIGHT,
  LEARN_CAP,
  LEARN_FULL_AT,
  LEARN_MAX_FOLDERS,
  LEARN_WEIGHT,
} from "./constants";
import { bundleKeyOf } from "./bundles";
import type { SortingHome } from "./home";
import type { SortingBundle } from "./model";
import { meaningfulWords } from "./words";

/** One sorted (or ticked) bundle the engine learns from. */
export type LearnedExample = { words: Map<string, string>; folder: string; weight: number };

type WordFolders = Map<string, { weight: number; count: number }>;

/** Word → folders it was sorted into, built once per computation. */
export type LearnIndex = {
  examples: Map<string, LearnedExample>;
  words: Map<string, WordFolders>;
};

export type BuildLearnIndexOptions = {
  home: SortingHome;
  /** Bundle key → folder and whether the user corrected it. */
  ticked: Map<string, { folder: string; isCorrection: boolean; bundle: SortingBundle }>;
};

/**
 * Examples to learn from: bundles already sorted in HA (their most common folder) and bundles ticked
 * in this session. There is no stored model; every computation learns afresh.
 */
export function buildLearnIndex({ home, ticked }: BuildLearnIndexOptions): LearnIndex {
  const examples = new Map<string, LearnedExample>();
  const sorted = new Map<string, { name: string; folders: Map<string, number> }>();

  for (const entity of home.context.entities) {
    if (!entity.categoryPath) continue;

    const key = bundleKeyOf(entity);
    const device = entity.deviceId ? home.devices.get(entity.deviceId) : undefined;
    const entry = sorted.get(key) ?? { name: device?.name ?? entity.name, folders: new Map() };
    entry.folders.set(entity.categoryPath, (entry.folders.get(entity.categoryPath) ?? 0) + 1);
    sorted.set(key, entry);
  }

  sorted.forEach(({ name, folders }, key) => {
    const [folder] = [...folders.entries()].sort((first, second) => second[1] - first[1])[0] ?? [];
    if (folder) examples.set(key, { words: meaningfulWords(name), folder, weight: 1 });
  });
  ticked.forEach(({ folder, isCorrection, bundle }, key) => {
    examples.set(key, {
      words: bundle.words,
      folder,
      weight: isCorrection ? CORRECTION_WEIGHT : 1,
    });
  });

  const words = new Map<string, WordFolders>();

  examples.forEach((example) =>
    example.words.forEach((_, word) => {
      const folders = words.get(word) ?? new Map();
      const current = folders.get(example.folder) ?? { weight: 0, count: 0 };
      folders.set(example.folder, {
        weight: current.weight + example.weight,
        count: current.count + 1,
      });
      words.set(word, folders);
    }),
  );

  return { examples, words };
}

export type LearnedVote = { folder: string; weight: number; count: number; word: string };

export type LearnedVotesOptions = {
  bundle: SortingBundle;
  index: LearnIndex;
};

/**
 * Votes from words the bundle shares with sorted ones ("ähnlich wie 3 einsortierte mit ‚Küche‘").
 * A word grows to full strength with LEARN_FULL_AT examples; a word spread over many folders says
 * nothing. The bundle never learns from itself.
 */
export function learnedVotes({ bundle, index }: LearnedVotesOptions): LearnedVote[] {
  const own = index.examples.get(bundle.key);
  const votes: LearnedVote[] = [];

  bundle.words.forEach((spelling, word) => {
    const folders = new Map<string, { weight: number; count: number }>();

    index.words.get(word)?.forEach((value, folder) => {
      const isOwn = own && own.folder === folder && own.words.has(word);
      const weight = value.weight - (isOwn ? own.weight : 0);
      const count = value.count - (isOwn ? 1 : 0);

      if (weight > 0) folders.set(folder, { weight, count });
    });
    if (!folders.size || folders.size > LEARN_MAX_FOLDERS) return;

    const total = [...folders.values()].reduce((sum, value) => sum + value.weight, 0);
    const strength = LEARN_WEIGHT * Math.min(1, total / LEARN_FULL_AT);

    folders.forEach((value, folder) =>
      votes.push({
        folder,
        weight: strength * (value.weight / total),
        count: value.count,
        word: spelling,
      }),
    );
  });

  const sum = votes.reduce((total, vote) => total + vote.weight, 0);
  const scale = sum > LEARN_CAP ? LEARN_CAP / sum : 1;

  return votes.map((vote) => ({ ...vote, weight: vote.weight * scale }));
}
