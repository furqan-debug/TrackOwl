import fs from 'fs';
import path from 'path';

async function run() {
  const repo = process.env.GITHUB_REPOSITORY || 'furqan-debug/TrackOwl';
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');

  const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  const tag =
    process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME
      ? process.env.GITHUB_REF_NAME
      : `v${config.version}`;

  const files = process.argv.slice(2).filter(f => f && fs.existsSync(f));
  if (files.length === 0) {
    console.log('No matching files to upload.');
    return;
  }

  console.log(`Looking up release for ${repo} tag ${tag}...`);
  let release;
  const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (tagRes.ok) {
    release = await tagRes.json();
  } else {
    const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error(`Failed to list releases: ${listRes.statusText}`);
    const releases = await listRes.json();
    release = releases.find(r => r.tag_name === tag);
    if (!release) throw new Error(`Could not find release for tag ${tag}`);
  }

  console.log(`Uploading ${files.length} asset(s) to release ${release.id} (draft: ${release.draft})...`);

  for (const filePath of files) {
    const name = path.basename(filePath);
    const existing = release.assets.find(a => a.name === name);
    if (existing) {
      console.log(`Deleting existing asset ${name} (${existing.id})...`);
      const delRes = await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!delRes.ok && delRes.status !== 404) {
        throw new Error(`Failed to delete existing asset ${name}: ${delRes.status} ${await delRes.text()}`);
      }
    }

    const data = fs.readFileSync(filePath);
    console.log(`Uploading ${name} (${data.length} bytes)...`);
    const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(data.length),
      },
      body: data,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload ${name}: ${uploadRes.status} ${await uploadRes.text()}`);
    }
    console.log(`Uploaded ${name} successfully.`);
  }
}

run().catch(err => {
  console.error('Fatal error in upload_release_assets:', err);
  process.exit(1);
});
