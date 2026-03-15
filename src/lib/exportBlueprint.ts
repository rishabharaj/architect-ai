import type { ArchitectureEntry, GuideData } from "@/hooks/useArchitect";

const categoryIcons: Record<string, string> = {
  Platform: "🖥️", Frontend: "🎨", Backend: "⚙️", Database: "🗄️",
  Authentication: "🔐", Payments: "💳", Notifications: "🔔",
  Search: "🔍", Analytics: "📊", Deployment: "🚀",
  Infrastructure: "☁️", "Database Hosting": "💾", "CI/CD": "🔄",
};

export function generateMarkdown(idea: string, architecture: ArchitectureEntry[], guide: GuideData | null): string {
  let md = `# Architecture Blueprint\n\n> **Project:** ${idea}\n\n`;
  md += `## Technology Stack\n\n`;
  md += `| Category | Selection | Details |\n|----------|-----------|----------|\n`;

  for (const entry of architecture) {
    const icon = categoryIcons[entry.category] || "📦";
    const details: string[] = [];
    if (entry.details?.credentials?.length) details.push(`Credentials: ${entry.details.credentials.join(", ")}`);
    if (entry.details?.apis?.length) details.push(`APIs: ${entry.details.apis.join(", ")}`);
    if (entry.details?.libraries?.length) details.push(`Libraries: ${entry.details.libraries.join(", ")}`);
    md += `| ${icon} ${entry.category} | ${entry.selection} | ${details.join("; ") || "—"} |\n`;
  }

  if (guide) {
    md += `\n## Project Structure\n\n\`\`\`\n${guide.projectStructure.join("\n")}\n\`\`\`\n`;
    md += `\n## Implementation Steps\n\n`;
    for (const s of guide.implementationSteps) {
      md += `${s.step}. **${s.title}** — ${s.description}\n`;
    }
    if (guide.envVars.length > 0) {
      md += `\n## Environment Variables\n\n\`\`\`env\n${guide.envVars.join("\n")}\n\`\`\`\n`;
    }
    if (guide.deploymentSteps.length > 0) {
      md += `\n## Deployment\n\n`;
      guide.deploymentSteps.forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
    }
  }

  return md;
}

export function downloadMarkdown(idea: string, architecture: ArchitectureEntry[], guide: GuideData | null) {
  const md = generateMarkdown(idea, architecture, guide);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "architecture-blueprint.md";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPDF(idea: string, architecture: ArchitectureEntry[], guide: GuideData | null) {
  const html2pdf = (await import("html2pdf.js")).default;

  const html = buildHTMLForPDF(idea, architecture, guide);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  await html2pdf().set({
    margin: [10, 10],
    filename: "architecture-blueprint.pdf",
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(container).save();

  document.body.removeChild(container);
}

function buildHTMLForPDF(idea: string, architecture: ArchitectureEntry[], guide: GuideData | null): string {
  let html = `<div style="font-family:system-ui,sans-serif;color:#1a1a2e;padding:20px;max-width:700px">`;
  html += `<h1 style="font-size:22px;margin-bottom:4px">Architecture Blueprint</h1>`;
  html += `<p style="color:#666;font-size:13px;margin-bottom:20px">${idea}</p>`;
  html += `<h2 style="font-size:16px;margin-bottom:10px">Technology Stack</h2>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">`;
  html += `<tr style="background:#f0f0f5"><th style="text-align:left;padding:6px;border:1px solid #ddd">Category</th><th style="text-align:left;padding:6px;border:1px solid #ddd">Selection</th><th style="text-align:left;padding:6px;border:1px solid #ddd">Details</th></tr>`;

  for (const entry of architecture) {
    const icon = categoryIcons[entry.category] || "📦";
    const details: string[] = [];
    if (entry.details?.credentials?.length) details.push(`Credentials: ${entry.details.credentials.join(", ")}`);
    if (entry.details?.apis?.length) details.push(`APIs: ${entry.details.apis.join(", ")}`);
    if (entry.details?.libraries?.length) details.push(`Libraries: ${entry.details.libraries.join(", ")}`);
    html += `<tr><td style="padding:6px;border:1px solid #ddd">${icon} ${entry.category}</td><td style="padding:6px;border:1px solid #ddd;font-weight:600">${entry.selection}</td><td style="padding:6px;border:1px solid #ddd;font-size:11px">${details.join("; ") || "—"}</td></tr>`;
  }
  html += `</table>`;

  if (guide) {
    html += `<h2 style="font-size:16px;margin-bottom:8px">Project Structure</h2>`;
    html += `<pre style="background:#f5f5fa;padding:12px;border-radius:6px;font-size:11px;overflow:auto">${guide.projectStructure.join("\n")}</pre>`;
    html += `<h2 style="font-size:16px;margin:16px 0 8px">Implementation Steps</h2>`;
    for (const s of guide.implementationSteps) {
      html += `<p style="font-size:12px;margin:4px 0"><strong>${s.step}. ${s.title}</strong> — ${s.description}</p>`;
    }
    if (guide.envVars.length > 0) {
      html += `<h2 style="font-size:16px;margin:16px 0 8px">Environment Variables</h2>`;
      html += `<pre style="background:#f5f5fa;padding:12px;border-radius:6px;font-size:11px">${guide.envVars.join("\n")}</pre>`;
    }
  }

  html += `</div>`;
  return html;
}
