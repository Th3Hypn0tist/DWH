import {
  INSTANCE_ROOT_PATH,
  createHttpDwhAdapter,
  loadSiteTree,
  composeWebPage,
} from '../lib/webengine/webengine.js';

const host = document.querySelector('#app');

function fail(error) {
  console.error(error);
  const pre = document.createElement('pre');
  pre.className = 'error-box';
  pre.textContent = error?.stack ?? String(error);
  host.replaceChildren(pre);
}

async function main() {
  const dwh = createHttpDwhAdapter({
    endpoint: '../app/dwh/api/project.php',
  });

  const siteTree = await loadSiteTree({
    dwh,
    context: {
      surface: 'mmdemo',
    },
  });

  const result = await composeWebPage({
    document,
    dwh,
    siteTree,
    currentPath: location.pathname,
    instanceRoot: INSTANCE_ROOT_PATH,
    dwhContext: {
      surface: 'mmdemo',
    },
    rendererContext: {
      dwh,
    },
  });

  host.replaceChildren(result.composition.root);
}

main().catch(fail);
