import fs from 'fs';

async function run() {
  const repo = process.env.GITHUB_REPOSITORY;
  const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  const tag = (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) ? process.env.GITHUB_REF_NAME : `v${config.version}`;
  const token = process.env.GITHUB_TOKEN;

  console.log(`Generating latest.json for ${repo} at tag ${tag}`);

  const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!releaseRes.ok) throw new Error(`Failed to fetch release: ${releaseRes.statusText}`);
  const release = await releaseRes.json();
  
  const platforms = {};
  
  // Helper to fetch signature content
  const getSig = async (assetUrl) => {
    const res = await fetch(assetUrl, {
      headers: { 'Accept': 'application/octet-stream', 'Authorization': `Bearer ${token}` }
    });
    return await res.text();
  };

  for (const asset of release.assets) {
    if (asset.name.endsWith('.tar.gz') || asset.name.endsWith('.zip') || asset.name.endsWith('.exe')) {
      // It's an updater bundle. Find its signature.
      const sigAsset = release.assets.find(a => a.name === `${asset.name}.sig`);
      if (sigAsset) {
        const sig = await getSig(sigAsset.url);
        
        let platformKey = '';
        if (asset.name.includes('aarch64')) platformKey = 'darwin-aarch64';
        else if (asset.name.includes('x64.app.tar.gz')) platformKey = 'darwin-x86_64';
        else if (asset.name.endsWith('x64-setup.exe')) platformKey = 'windows-x86_64';
        else if (asset.name.includes('universal.tar.gz')) platformKey = 'darwin-universal';
        
        if (platformKey) {
          platforms[platformKey] = {
            signature: sig.trim(),
            url: asset.browser_download_url
          };
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

  fs.writeFileSync('latest.json', JSON.stringify(latestJson, null, 2));
  console.log('Successfully generated latest.json:', latestJson);
}

run().catch(console.error);
