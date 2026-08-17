---
description: Crea un git worktree en .worktrees/<nombre>
---

Crea un git worktree con el nombre: $ARGUMENTS

Instrucciones estrictas:
- El nombre puede contener espacios; trátalo como un solo argumento (pásalo entre comillas en la ruta).
- Ejecuta exactamente: git worktree add ".worktrees/<nombre-del-worktree>" (usa el directorio actual, no cambies de directorio).
- No hagas nada más: no commits, no cd, no editar archivos, sin pasos adicionales.
- Si no se proporcionó nombre, informa al usuario que debe usar: /worktree <nombre> y no ejecutes nada.
