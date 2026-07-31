#!/usr/bin/env node
// Builds the Astro presentation and copies it into Nuxt's production output
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const astroDist = join(root, 'apps', 'astro', 'dist', 'presentation')
const target = join(root, '.output', 'public', 'presentation')

console.log('[presentation] building Astro...')
execSync('npm run build:astro', { cwd: root, stdio: 'inherit' })

if (!existsSync(astroDist)) {
  console.error('[presentation] Astro presentation output not found:', astroDist)
  process.exit(1)
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

console.log(`[presentation] copying ${astroDist} -> ${target}`)
copyDir(astroDist, target)
console.log('[presentation] done')
