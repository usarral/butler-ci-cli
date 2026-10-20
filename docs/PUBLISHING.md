# Publicación en npm

Este proyecto está configurado para publicarse automáticamente en npm mediante GitHub Actions.

## 🤖 Publicación Automática (Recomendado)

El proyecto ahora cuenta con un sistema de publicación automática que se activa con cada commit a la rama `master`. 

**Ver guía completa**: [Automated Releases](AUTOMATED_RELEASES.md)

### Cómo funciona

1. Haces un commit a `master` usando [Conventional Commits](https://www.conventionalcommits.org/)
2. GitHub Actions automáticamente:
   - Analiza el commit para determinar el tipo de versión (major, minor, patch)
   - Actualiza la versión en `package.json`
   - Ejecuta los tests y build
   - Crea un release en GitHub
   - Publica el paquete en npm

### Ejemplo de flujo automático

```bash
# Crea un PR con tu feature
git checkout -b feature/new-command
git commit -m "feat: add export command"
git push origin feature/new-command

# Mergea el PR a master (squash merge recomendado)
# El commit resultante en master será: "feat: add export command"
# Esto automáticamente:
# - Incrementa la versión minor (3.0.0 → 3.1.0)
# - Crea release v3.1.0
# - Publica en npm
```

## 📋 Configuración inicial

La publicación usa [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC): GitHub Actions se identifica ante npm sin tokens, así que no hay ningún secreto que caduque o se filtre.

### Configurar el Trusted Publisher en npm (una sola vez)

1. En [npmjs.com](https://www.npmjs.com/) abre el paquete `butler-ci-cli` → **Settings** → **Trusted Publisher**
2. Elige **GitHub Actions** y rellena:
   - Organization or user: `usarral`
   - Repository: `butler-ci-cli`
   - Workflow filename: `release.yml`
   - Environment name: vacío
3. En **Allowed actions** marca **Allow npm publish**. Sin esa casilla el workflow solo puede hacer `npm stage publish`, y cada versión quedaría pendiente de aprobación manual con 2FA
4. Pulsa **Set up connection**

npm solo admite un workflow por paquete: tiene que ser `release.yml`, que es el que publica.

## 🔧 Formas de publicar

### Opción 1: Sistema Automático (⭐ Recomendado)

Simplemente haz merge a `master` con formato de conventional commits. El sistema se encarga del resto.

Ver: [Automated Releases](AUTOMATED_RELEASES.md)

### Opción 2: Relanzar el workflow

Si una publicación falló, ve a Actions → "Automated Release on Master" → **Run workflow**. Ojo: calcula y sube una versión nueva a partir del último commit.

## Verificación

Después de la publicación, verifica que el paquete esté disponible:

```bash
npm view butler-ci-cli
```

## Instalación del paquete

Los usuarios podrán instalar el paquete con:

```bash
npm install -g butler-ci-cli
```

O con pnpm:

```bash
pnpm add -g butler-ci-cli
```

## Notas importantes

- El workflow ejecuta los tests antes de publicar
- Solo se publican los archivos especificados en el campo `files` del `package.json`
- El archivo `.npmignore` excluye archivos innecesarios adicionales
- Se requiere que todos los tests pasen para poder publicar
