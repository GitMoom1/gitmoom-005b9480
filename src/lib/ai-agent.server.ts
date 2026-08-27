/**
 * GitMoomAgent — server-only engine.
 * Executa Code Review, Auto-fix, Refactor e Docgen sobre commits do Git Core
 * usando o gateway de IA. Sem chave configurada, degrada com erro explícito.
 */

export type AIAction = 'CODE_REVIEW' | 'AUTO_FIX' | 'REFACTOR' | 'DOCGEN';

export const AI_MODEL = 'google/gemini-3.7-flash';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

/** Limite mensal de tokens por tier de plano. */
export const TOKEN_LIMITS: Record<string, number> = {
  STARTER: 2_500,
  FREE: 2_500,
  PRO: 7_500,
  BASIC: 7_500,
  BUSINESS: 15_000,
  ENTERPRISE: 30_000,
};

export function tokenLimitFor(tier: string | null | undefined): number {
  return TOKEN_LIMITS[(tier ?? 'STARTER').toUpperCase()] ?? TOKEN_LIMITS['STARTER']!;
}

const PROMPTS: Record<AIAction, string> = {
  CODE_REVIEW:
    'Você é o GitMoomAgent, revisor sênior de código. Analise o commit e produza um review objetivo em português: riscos, bugs prováveis, segurança, performance e qualidade. Finalize com um veredito APROVADO ou AJUSTES NECESSÁRIOS.',
  AUTO_FIX:
    'Você é o GitMoomAgent no modo Auto-fix. A partir do commit, identifique defeitos e proponha correções concretas em blocos de código prontos para aplicar. Seja direto, sem preâmbulo.',
  REFACTOR:
    'Você é o GitMoomAgent no modo Refactor. Sugira refatorações de arquitetura e legibilidade para o commit, respeitando Clean Code, DRY e separação de responsabilidades. Mostre antes/depois quando útil.',
  DOCGEN:
    'Você é o GitMoomAgent no modo Docgen. Gere documentação técnica em Markdown para as mudanças do commit: resumo, o que mudou, impacto e como usar.',
};

const ACTION_LABEL: Record<AIAction, string> = {
  CODE_REVIEW: 'Code Review',
  AUTO_FIX: 'Auto-fix',
  REFACTOR: 'Refactor',
  DOCGEN: 'Docgen',
};

export function actionLabel(action: AIAction): string {
  return ACTION_LABEL[action];
}

export interface CommitContext {
  repositoryName: string;
  language?: string | null;
  branch: string;
  sha: string;
  message: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  diff?: string | null;
}

export interface AgentResult {
  content: string;
  summary: string;
  tokensUsed: number;
  model: string;
}

function buildUserPrompt(commit: CommitContext): string {
  return [
    `Repositório: ${commit.repositoryName}`,
    commit.language ? `Linguagem principal: ${commit.language}` : null,
    `Branch: ${commit.branch}`,
    `Commit: ${commit.sha}`,
    `Mensagem: ${commit.message}`,
    `Arquivos alterados: ${commit.filesChanged ?? 0} (+${commit.additions ?? 0} / -${commit.deletions ?? 0})`,
    commit.diff ? `\nDiff / contexto:\n${commit.diff.slice(0, 12_000)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Chama o gateway de IA e devolve conteúdo + tokens consumidos. */
export async function runAgent(action: AIAction, commit: CommitContext): Promise<AgentResult> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error('O motor de IA não está configurado neste ambiente.');

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: PROMPTS[action] },
        { role: 'user', content: buildUserPrompt(commit) },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error('Limite de requisições de IA atingido. Tente novamente em instantes.');
  }
  if (response.status === 402) {
    throw new Error('Créditos de IA esgotados no workspace.');
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`GitMoomAgent gateway error [${response.status}]: ${detail}`);
    throw new Error('Falha ao executar o GitMoomAgent.');
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) throw new Error('O GitMoomAgent não retornou conteúdo.');

  const firstLine = content
    .split('\n')
    .map((line) => line.replace(/^[#>*\-\s]+/, '').trim())
    .find((line) => line.length > 0);

  return {
    content,
    summary: (firstLine ?? ACTION_LABEL[action]).slice(0, 240),
    tokensUsed: payload.usage?.total_tokens ?? Math.ceil(content.length / 4),
    model: AI_MODEL,
  };
}
