#!/usr/bin/env bash
# Chequeo cada 3 minutos de que nada se colgó ni se está comiendo la PC.
# Lo arma el agente con la herramienta Monitor cuando lanza algo en segundo
# plano (ver .claude/hooks/recordar-chequeo.js). Cada línea es un aviso.
#
# Uso: bash scripts/chequeo-procesos.sh [log-a-vigilar]
#   Con un log, avisa también si pasa 10 minutos sin escribirse.
#
# Motivo: el 2026-11-23 un ffmpeg colgado llenó la RAM y hubo que reiniciar.

LOG="${1:-}"
INTERVALO=180
MEMORIA_MINIMA_GB=1.5
LOG_QUIETO_MAX_MIN=10

while true; do
  libre=$(powershell -NoProfile -Command \
    "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" 2>/dev/null \
    | tr -d '\r' | tr ',' '.')

  # Los 3 procesos que más memoria usan, en GB.
  pesados=$(tasklist //FO CSV //NH 2>/dev/null | awk -F'","' '{
      gsub(/"/, "", $1); m = $5; gsub(/[^0-9]/, "", m)
      printf "%s %.1f\n", $1, m / 1048576
    }' | sort -k2 -rn | head -3 | awk '{printf "%s%s %sGB", (NR>1?", ":""), $1, $2}')

  alertas=""
  if [ -n "$libre" ] && awk "BEGIN { exit !($libre < $MEMORIA_MINIMA_GB) }"; then
    alertas="$alertas ALERTA:memoria-baja"
  fi
  if tasklist //FO CSV //NH 2>/dev/null | grep -qi '"ffmpeg.exe"'; then
    alertas="$alertas ALERTA:ffmpeg-corriendo"
  fi
  estado_log=""
  if [ -n "$LOG" ] && [ -f "$LOG" ]; then
    quieto=$(( ($(date +%s) - $(date -r "$LOG" +%s)) / 60 ))
    estado_log=" | log quieto ${quieto}min"
    [ "$quieto" -ge "$LOG_QUIETO_MAX_MIN" ] && alertas="$alertas ALERTA:log-quieto"
  fi

  echo "$(date +%H:%M) | libre ${libre:-?}GB | ${pesados}${estado_log}${alertas}"
  sleep "$INTERVALO"
done
