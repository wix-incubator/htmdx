// htmdx skill — print the authoring guidance that ships with this runtime.
// An agent reads it from the installed package instead of carrying a copy that
// drifts from the components, grammar, and diagnostics the artifact renders
// against.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../version';

export type SkillTopic = {
  name: string;
  file: string;
  description: string;
};

export const SKILL_TOPICS: readonly SkillTopic[] = [
  {
    name: 'authoring',
    file: 'authoring.md',
    description: 'Artifact contract, component choice, CLI, and verification',
  },
  {
    name: 'components',
    file: 'components.md',
    description: 'Body grammar and examples for every component family',
  },
  {
    name: 'integration',
    file: 'integration.md',
    description: 'React host, browser registration, and testing HTMDX in a repo',
  },
  {
    name: 'starter',
    file: 'artifact.html',
    description: 'A starter artifact to copy',
  },
];

export const DEFAULT_SKILL_TOPIC = SKILL_TOPICS[0].name;

export type SkillTopicContent = SkillTopic & { content: string };

export class UnknownSkillTopicError extends Error {
  constructor(readonly requested: string) {
    super(
      `unknown skill topic "${requested}"; expected one of ${SKILL_TOPICS.map((topic) => topic.name).join(', ')}`,
    );
  }
}

// dist/cli.js sits one level below the published skill/ directory; the same
// relative layout holds in the repo, where the bundle is built into dist/.
function resolveSkillFile(file: string): string {
  return fileURLToPath(new URL(`../skill/${file}`, import.meta.url));
}

// The version pins in these files are release-managed, and the mdx examples are
// fenced off from the repo formatter, which reflows JSX-ish fences and would
// break the row grammars. Both markers are build bookkeeping — strip them so
// `skill starter` writes a clean artifact and a reader is not told to preserve
// them. The prettier-ignore inside the artifact shell is indented, so the
// column-0 anchor leaves it alone.
const RELEASE_MARKER = /^[ \t]*<!-- x-release-please-(?:start|end)-version -->\n(?:\n)?/gm;
const FORMATTER_MARKER = /^<!-- prettier-ignore -->\n(?=```)/gm;

export async function readSkillTopic(name: string): Promise<SkillTopicContent> {
  const topic = SKILL_TOPICS.find((candidate) => candidate.name === name);
  if (!topic) {
    throw new UnknownSkillTopicError(name);
  }
  const content = await readFile(resolveSkillFile(topic.file), 'utf8');
  return {
    ...topic,
    content: content.replace(RELEASE_MARKER, '').replace(FORMATTER_MARKER, ''),
  };
}

export async function readAllSkillTopics(): Promise<SkillTopicContent[]> {
  return Promise.all(SKILL_TOPICS.map((topic) => readSkillTopic(topic.name)));
}

export function formatTopicList(): string {
  return [
    `HTMDX guidance shipped with @wix/htmdx@${VERSION}:`,
    '',
    ...SKILL_TOPICS.map((topic) => `  ${topic.name.padEnd(14)}${topic.description}`),
    '',
    'Read one with "htmdx skill <topic>", or all of them with "htmdx skill --full".',
    '',
  ].join('\n');
}

// --full concatenates topics for a single agent read, so each one keeps a
// visible boundary and its own file name.
export function formatTopics(topics: SkillTopicContent[]): string {
  if (topics.length === 1) {
    return `${topics[0].content.trimEnd()}\n`;
  }
  return `${topics
    .map(
      (topic) =>
        `<!-- BEGIN ${topic.file} -->\n${topic.content.trimEnd()}\n<!-- END ${topic.file} -->`,
    )
    .join('\n\n')}\n`;
}

export function toJson(topics: SkillTopicContent[]): string {
  return `${JSON.stringify(
    {
      runtime: `@wix/htmdx@${VERSION}`,
      topics: topics.map(({ name, description, content }) => ({ name, description, content })),
    },
    null,
    2,
  )}\n`;
}
