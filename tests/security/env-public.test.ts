import { expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'

function scanDir(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'tests') continue
    const stat = fs.statSync(path.join(dir, file))
    if (stat.isDirectory()) scanDir(path.join(dir, file), fileList)
    else fileList.push(path.join(dir, file))
  }
  return fileList
}

test('No NEXT_PUBLIC secrets in source files', () => {
  const allFiles = scanDir(path.join(__dirname, '../../'))
  const badRegex = new RegExp('NEXT_PUBLIC_' + '.*(SECRET|PASSWORD|DATABASE|SERVICE_ROLE)', 'i')
  
  for (const file of allFiles) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    const content = fs.readFileSync(file, 'utf-8')
    expect(badRegex.test(content)).toBe(false)
  }
})
