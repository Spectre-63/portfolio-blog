import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

const DIST_DIR = path.join(process.cwd(), 'dist');
const CLIENT_DIR = path.join(DIST_DIR, 'client');

describe('Build Health', () => {
  beforeAll(() => {
    // Ensure build exists
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error('Build directory not found. Run `npm run build` first.');
    }
  });

  it('should have dist/client directory', () => {
    expect(fs.existsSync(CLIENT_DIR)).toBe(true);
  });

  it('should prerender 14+ blog posts', async () => {
    const blogDir = path.join(CLIENT_DIR, 'blog');
    expect(fs.existsSync(blogDir)).toBe(true);

    const posts = await fsPromises.readdir(blogDir);
    // Filter to directories (each post is a dir with index.html)
    const postDirs = posts.filter((f) => {
      const stat = fs.statSync(path.join(blogDir, f));
      return stat.isDirectory();
    });

    expect(postDirs.length).toBeGreaterThanOrEqual(14);
  });

  it('should prerender index pages for each blog post', async () => {
    const blogDir = path.join(CLIENT_DIR, 'blog');
    const posts = await fsPromises.readdir(blogDir);

    for (const post of posts) {
      const indexPath = path.join(blogDir, post, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);
    }
  });

  it('should have blog directory with content', () => {
    const blogDir = path.join(CLIENT_DIR, 'blog');
    expect(fs.existsSync(blogDir)).toBe(true);

    // Blog directory should have prerendered post subdirectories
    const contents = fs.readdirSync(blogDir);
    expect(contents.length).toBeGreaterThan(0);
  });

  it('should prerender HTML files for blog posts', async () => {
    const blogDir = path.join(CLIENT_DIR, 'blog');
    const postDirs = fs.readdirSync(blogDir).filter((f) => {
      const stat = fs.statSync(path.join(blogDir, f));
      return stat.isDirectory();
    });

    // Each post directory should have index.html
    for (const postDir of postDirs) {
      const indexPath = path.join(blogDir, postDir, 'index.html');
      const content = await fsPromises.readFile(indexPath, 'utf-8');

      // Should have HTML content
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('<!DOCTYPE html');
    }
  });

  it('should have static assets', () => {
    // Favicon should exist
    const faviconPath = path.join(CLIENT_DIR, 'favicon.svg');
    expect(fs.existsSync(faviconPath)).toBe(true);

    // Fonts directory should exist
    const fontsPath = path.join(CLIENT_DIR, 'fonts');
    expect(fs.existsSync(fontsPath)).toBe(true);
  });

  it('should not have deprecated glob in dependencies', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    // Check for glob@10.5.0 specifically (deprecated)
    const hasBadGlob =
      packageJson.dependencies?.['glob'] === '^10.5.0' ||
      packageJson.devDependencies?.['glob'] === '^10.5.0';

    expect(hasBadGlob).toBe(false);
  });
});
