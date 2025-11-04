import { appendFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const LOG_FILE_PATH =
  process.env.FULFILLMENT_SIM_LOG ??
  path.join(os.tmpdir(), "fulfillment-sim.log");

export async function logInfo(message: string) {
  await writeLog("INFO", message);
}

export async function logError(message: string) {
  await writeLog("ERROR", message);
}

async function writeLog(level: "INFO" | "ERROR", message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  // Always emit to console for demo visibility.
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }

  try {
    await appendFile(LOG_FILE_PATH, `${line}\n`);
  } catch (error) {
    console.error(`Failed to append to log file ${LOG_FILE_PATH}:`, error);
  }
}

export function getLogFilePath() {
  return LOG_FILE_PATH;
}
