import fs from 'fs';

async function run() {
  const repo = process.env.GITHUB_REPOSITORY || process.argv[3] || 'furqan-debug/TrackOwl';
  const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  const tag = (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) ? process.env.GITHUB_REF_NAME : (process.argv[4] || `v${config.version}`);
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  console.log(`Generating and publishing latest.json for ${repo} at tag ${tag}`);

  // 1. Fetch release (try by tag first, then list releases to find drafts)
  let release;
  const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (tagRes.ok) {
    release = await tagRes.json();
  } else {
    console.log(`Tag endpoint returned ${tagRes.status}, searching all releases for draft tagged ${tag}...`);
    const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!listRes.ok) throw new Error(`Failed to list releases: ${listRes.statusText}`);
    const releases = await listRes.json();
    release = releases.find(r => r.tag_name === tag);
    if (!release) throw new Error(`Could not find release for tag ${tag} (even among drafts)`);
  }

  console.log(`Found release ID ${release.id} (draft: ${release.draft}, tag: ${release.tag_name}) with ${release.assets.length} assets.`);

  const platforms = {};

  // Helper to fetch signature content
  const getSig = async (assetUrl) => {
    const res = await fetch(assetUrl, {
      headers: { 'Accept': 'application/octet-stream', 'Authorization': `Bearer ${token}` }
    });
    return await res.text();
  };

  for (const asset of release.assets) {
    if (asset.name.endsWith('.tar.gz') || asset.name.endsWith('.zip') || asset.name.endsWith('.exe') || asset.name.endsWith('.msi')) {
      const sigAsset = release.assets.find(a => a.name === `${asset.name}.sig`);
      if (sigAsset) {
        const sig = await getSig(sigAsset.url);
        const sigClean = sig.trim();

        // Normalize URL to always use the final release tag instead of temporary untagged draft hashes
        const finalUrl = asset.browser_download_url.replace(/\/download\/[^\/]+\//, `/download/${tag}/`);

        if (asset.name.includes('aarch64')) {
          platforms['darwin-aarch64'] = { signature: sigClean, url: finalUrl };
          platforms['darwin-aarch64-app'] = { signature: sigClean, url: finalUrl };
        } else if (asset.name.includes('x64.app.tar.gz') || asset.name === 'TrackOwl.app.tar.gz') {
          platforms['darwin-x86_64'] = { signature: sigClean, url: finalUrl };
          platforms['darwin-x86_64-app'] = { signature: sigClean, url: finalUrl };
        } else if (asset.name.endsWith('x64-setup.exe')) {
          // Both windows-x86_64 and windows-x86_64-nsis point to the setup exe for NSIS auto-updating
          platforms['windows-x86_64'] = { signature: sigClean, url: finalUrl };
          platforms['windows-x86_64-nsis'] = { signature: sigClean, url: finalUrl };
        } else if (asset.name.endsWith('x64_en-US.msi')) {
          platforms['windows-x86_64-msi'] = { signature: sigClean, url: finalUrl };
        }
      }
    }
  }

  const latestJson = {
    version: tag.replace('v', ''),
    notes: `Release ${tag}`,
    pub_date: new Date().toISOString(),
    platforms
  };

  const bodyStr = JSON.stringify(latestJson, null, 2);
  fs.writeFileSync('latest.json', bodyStr);
  console.log('Successfully generated latest.json:\n', bodyStr);

  // 2. Upload latest.json directly to the release
  const existingAsset = release.assets.find(a => a.name === 'latest.json');
  if (existingAsset) {
    console.log(`Deleting existing latest.json asset ${existingAsset.id}...`);
    await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existingAsset.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  console.log(`Uploading latest.json to release ${release.id}...`);
  const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=latest.json`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(bodyStr))
    },
    body: Buffer.from(bodyStr)
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload latest.json: ${uploadRes.status} ${errText}`);
  }
  console.log('latest.json successfully uploaded to release!');

  // 3. Publish release if it is a draft
  if (release.draft) {
    console.log(`Publishing release ${release.id} (draft -> false, make_latest: true)...`);
    const pubRes = await fetch(`https://api.github.com/repos/${repo}/releases/${release.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({ draft: false, make_latest: 'true' })
    });
    if (!pubRes.ok) {
      const errText = await pubRes.text();
      throw new Error(`Failed to publish release: ${pubRes.status} ${errText}`);
    }
    console.log(`Release ${release.id} is now published and marked as latest!`);
  }
}

run().catch(err => {
  console.error('Fatal error in generate_latest_json:', err);
  process.exit(1);
});
