// Hook PostToolUse de Bash: cuando el agente lanza un comando en segundo plano
// (servers, builds, ffmpeg), le recuerda armar el chequeo cada 3 minutos de
// scripts/chequeo-procesos.sh. El hook no puede armarlo solo: el aviso tiene
// que llegar al chat, y eso lo hace la herramienta Monitor del agente.
let entrada = '';
process.stdin.on('data', (parte) => (entrada += parte));
process.stdin.on('end', () => {
  let llamada;
  try {
    llamada = JSON.parse(entrada);
  } catch {
    return; // sin JSON no hay nada que revisar
  }
  if (llamada.tool_input?.run_in_background !== true) return;

  const aviso =
    'Lanzaste un proceso en segundo plano. Si no hay un chequeo de procesos activo en esta sesión, ' +
    'armalo ahora con la herramienta Monitor (timeout_ms 1800000, re-armalo al expirar mientras el proceso siga): ' +
    '`bash scripts/chequeo-procesos.sh [log-del-proceso]`, y reportale al usuario cada aviso en una línea, ' +
    'destacando las ALERTA. Cuando ya no quede nada en segundo plano, detené el chequeo con TaskStop.';
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: aviso } }),
  );
});
