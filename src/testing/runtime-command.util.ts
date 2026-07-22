import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface CommandExistsOptions {
  cwd?: string;
  maxBuffer?: number;
}

export const commandExists = async (command: string, options?: CommandExistsOptions): Promise<boolean> => {
  try {
    await execFileAsync(command, ['--version'], options);
    return true;
  } catch {
    return false;
  }
};

export const resolveExecutable = async (
  candidates: (string | undefined)[],
  options?: CommandExistsOptions,
): Promise<string | null> => {
  for (const candidate of candidates) {
    if (candidate && await commandExists(candidate, options)) return candidate;
  }

  return null;
};

export const getRscriptCandidates = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const rHome = env['R_HOME'];

  return [
    env['RSCRIPT'],
    env['R_SCRIPT'],
    rHome ? `${rHome}/bin/Rscript` : undefined,
    'Rscript',
  ].filter((candidate): candidate is string => Boolean(candidate));
};
