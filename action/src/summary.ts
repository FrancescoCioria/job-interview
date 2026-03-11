import * as core from "@actions/core";
import { Deployment } from "./types";

const STATUS_EMOJI: Record<string, string> = {
  successful: "✅",
  failed: "❌",
  timed_out: "⏱️",
  cancelled: "🚫",
  running: "🔄",
  pending: "⏳",
  cancelling: "🚫",
};

interface SummaryOptions {
  toolName: string;
  commitSha: string;
  deployment: Deployment;
  deploymentUrl: string;
  dashboardUrl: string;
}

export async function writeSummary(opts: SummaryOptions): Promise<void> {
  const emoji = STATUS_EMOJI[opts.deployment.status] ?? "❓";
  const status = opts.deployment.status.toUpperCase().replace(/_/g, " ");

  const summary = core.summary
    .addHeading(`${emoji} Toolforge Deployment: ${status}`)
    .addTable([
      [
        { data: "Tool", header: true },
        { data: opts.toolName },
      ],
      [
        { data: "Commit", header: true },
        { data: `\`${opts.commitSha.slice(0, 7)}\`` },
      ],
      [
        { data: "Deployment ID", header: true },
        { data: `\`${opts.deployment.deploy_id}\`` },
      ],
      [
        { data: "Status", header: true },
        { data: `${emoji} ${status}` },
      ],
      [
        { data: "Created", header: true },
        { data: opts.deployment.creation_time },
      ],
    ]);

  if (opts.deployment.long_status) {
    summary.addQuote(opts.deployment.long_status);
  }

  // Component details
  const buildEntries = Object.entries(opts.deployment.builds);
  const runEntries = Object.entries(opts.deployment.runs);

  if (buildEntries.length > 0 || runEntries.length > 0) {
    summary.addHeading("Components", 3);

    const rows: { data: string }[][] = [
      [
        { data: "Component" },
        { data: "Build Status" },
        { data: "Run Status" },
      ].map((cell) => ({ ...cell, header: true } as { data: string })),
    ];

    const componentNames = [
      ...new Set([
        ...buildEntries.map(([name]) => name),
        ...runEntries.map(([name]) => name),
      ]),
    ].sort();

    for (const name of componentNames) {
      const build = opts.deployment.builds[name];
      const run = opts.deployment.runs[name];
      rows.push([
        { data: name },
        { data: build ? `${STATUS_EMOJI[build.build_status] ?? "❓"} ${build.build_status}` : "—" },
        { data: run ? `${STATUS_EMOJI[run.run_status] ?? "❓"} ${run.run_status}` : "—" },
      ]);
    }

    summary.addTable(rows);
  }

  // Links
  summary.addRaw("\n\n**Links:**\n");
  summary.addList([
    `[API Status](${opts.deploymentUrl})`,
    opts.dashboardUrl
      ? `[Dashboard](${opts.dashboardUrl})`
      : "Dashboard URL not configured",
  ]);

  await summary.write();
}
